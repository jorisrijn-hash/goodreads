package dev.jorisvrr.reading.library;

import dev.jorisvrr.reading.catalog.BookRow;
import dev.jorisvrr.reading.catalog.CatalogueRepository;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * The reader's private reading journal: what happened, in the order it happened.
 *
 * <p>Nothing is stored for it. The journal is the two append-only tables read together —
 * status events and progress entries — so it can only ever say what the reader actually
 * did. There are no streaks, totals or summaries, and it is never shared.
 *
 * <p>One SQL query rather than two lists merged in Java: the two tables have to be
 * ordered as one timeline to be paged at all. Plain SQL here, like the catalogue, because
 * this is a read model, not an aggregate with invariants.
 */
@Service
public class ReadingJournal {

    /** A page of journal rows, and where the next page starts. */
    public record Page(List<Entry> entries, String nextCursor) {
    }

    /**
     * One line of the journal. Exactly one of {@code event} or the progress fields is
     * set: a status change, or a recorded position.
     */
    public record Entry(
            String id,
            Kind kind,
            Instant at,
            BookRow book,
            ReadingEventType event,
            ReadingStatus fromStatus,
            ReadingStatus toStatus,
            Integer page,
            Integer percent,
            String note) {
    }

    public enum Kind { EVENT, PROGRESS }

    public static final int MAX_LIMIT = 50;
    public static final int DEFAULT_LIMIT = 30;

    private final JdbcClient db;
    private final CatalogueRepository catalogue;

    public ReadingJournal(JdbcClient db, CatalogueRepository catalogue) {
        this.db = db;
        this.catalogue = catalogue;
    }

    /**
     * The reader's journal, newest first.
     *
     * <p>Always filtered by the authenticated reader through {@code library_item}: no
     * identifier from the request selects whose history is read. {@code bookSlug}
     * narrows it to one book, for the history shown on Book Detail.
     *
     * <p>Paged by cursor rather than offset, because the timeline grows at the newest
     * end: an offset page would shift under a reader who records progress while reading
     * back. The cursor is the (time, kind, id) of the last row returned.
     */
    @Transactional(readOnly = true)
    public Page read(long userId, String cursor, Integer limit, String bookSlug) {
        int size = limit == null ? DEFAULT_LIMIT : Math.clamp(limit, 1, MAX_LIMIT);
        Cursor after = Cursor.parse(cursor);
        Long bookId = null;
        if (bookSlug != null && !bookSlug.isBlank()) {
            bookId = catalogue.findBySlug(bookSlug)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "No such book"))
                    .id();
        }

        // One extra row answers "is there more" without a second count query.
        var query = db.sql("""
                SELECT kind, id, book_id, created_at, event_type, from_status, to_status, page, percent, note
                FROM (
                    SELECT 'EVENT' AS kind, e.id, i.book_id, e.created_at,
                           e.event_type, e.from_status, e.to_status,
                           NULL::int AS page, NULL::smallint AS percent, NULL::text AS note
                      FROM reading_event e
                      JOIN library_item i ON i.id = e.library_item_id
                     WHERE i.user_id = :userId AND (:bookId::bigint IS NULL OR i.book_id = :bookId)
                    UNION ALL
                    SELECT 'PROGRESS' AS kind, p.id, i.book_id, p.created_at,
                           NULL AS event_type, NULL AS from_status, NULL AS to_status,
                           p.page, p.percent, p.note
                      FROM progress_update p
                      JOIN library_item i ON i.id = p.library_item_id
                     WHERE i.user_id = :userId AND (:bookId::bigint IS NULL OR i.book_id = :bookId)
                ) timeline
                WHERE (:hasCursor = FALSE OR (created_at, kind, id) < (:at, :kind, :id))
                ORDER BY created_at DESC, kind DESC, id DESC
                LIMIT :size
                """)
                .param("userId", userId)
                .param("bookId", bookId)
                .param("hasCursor", after != null)
                // The driver needs a zoned value, not a bare Instant.
                .param("at", OffsetDateTime.ofInstant(after == null ? Instant.EPOCH : after.at(), ZoneOffset.UTC))
                .param("kind", after == null ? "" : after.kind())
                .param("id", after == null ? 0L : after.id())
                .param("size", size + 1);

        List<Row> rows = query.query((rs, n) -> new Row(
                rs.getString("kind"),
                rs.getLong("id"),
                rs.getLong("book_id"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getString("event_type"),
                rs.getString("from_status"),
                rs.getString("to_status"),
                (Integer) rs.getObject("page"),
                (Integer) rs.getObject("percent"),
                rs.getString("note"))).list();

        boolean more = rows.size() > size;
        if (more) {
            rows = rows.subList(0, size);
        }
        if (rows.isEmpty()) {
            return new Page(List.of(), null);
        }

        // One lookup for every book on the page, not one per row.
        Map<Long, BookRow> books = new HashMap<>();
        catalogue.findByIds(rows.stream().map(Row::bookId).distinct().toList())
                .forEach(book -> books.put(book.id(), book));

        List<Entry> entries = new ArrayList<>(rows.size());
        for (Row row : rows) {
            BookRow book = books.get(row.bookId());
            if (book == null) {
                continue; // the book left the catalogue; skip rather than fail the page
            }
            entries.add(new Entry(
                    row.kind().toLowerCase(Locale.ROOT) + "-" + row.id(),
                    Kind.valueOf(row.kind()),
                    row.at(),
                    book,
                    row.eventType() == null ? null : ReadingEventType.valueOf(row.eventType()),
                    row.fromStatus() == null ? null : ReadingStatus.valueOf(row.fromStatus()),
                    row.toStatus() == null ? null : ReadingStatus.valueOf(row.toStatus()),
                    row.page(), row.percent(), row.note()));
        }

        Row last = rows.get(rows.size() - 1);
        return new Page(entries, more ? new Cursor(last.at(), last.kind(), last.id()).encode() : null);
    }

    private record Row(String kind, long id, long bookId, Instant at, String eventType,
                       String fromStatus, String toStatus, Integer page, Integer percent, String note) {
    }

    /**
     * Where the next page starts. Opaque to the client, and carries no identity: it is
     * only a position in one reader's own timeline, and the query is filtered by the
     * session regardless of what the cursor says.
     */
    record Cursor(Instant at, String kind, long id) {

        String encode() {
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString((at.toEpochMilli() + ":" + kind + ":" + id).getBytes());
        }

        static Cursor parse(String raw) {
            if (raw == null || raw.isBlank()) {
                return null;
            }
            try {
                String[] parts = new String(Base64.getUrlDecoder().decode(raw)).split(":");
                String kind = parts[1];
                if (!kind.equals("EVENT") && !kind.equals("PROGRESS")) {
                    throw new IllegalArgumentException("kind");
                }
                return new Cursor(Instant.ofEpochMilli(Long.parseLong(parts[0])), kind, Long.parseLong(parts[2]));
            } catch (RuntimeException e) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                        "That is not a valid position in your journal.");
            }
        }
    }
}
