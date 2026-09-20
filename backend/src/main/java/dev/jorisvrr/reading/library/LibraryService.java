package dev.jorisvrr.reading.library;

import dev.jorisvrr.reading.catalog.BookRow;
import dev.jorisvrr.reading.catalog.CatalogueRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * The reader's own library.
 *
 * <p>Every method takes the authenticated reader's id from the caller and filters by it.
 * No identifier from a request body ever selects whose library is touched.
 */
@Service
public class LibraryService {

    private static final Logger log = LoggerFactory.getLogger(LibraryService.class);

    private final LibraryItemRepository items;
    private final CatalogueRepository catalogue;

    public LibraryService(LibraryItemRepository items, CatalogueRepository catalogue) {
        this.items = items;
        this.catalogue = catalogue;
    }

    /** A library row together with the book it refers to. */
    public record Entry(LibraryItem item, BookRow book) {
    }

    /**
     * Saves a book, or updates it if the reader already has it.
     *
     * <p>Idempotent on purpose: tapping "Want to Read" twice, or on two devices, must not
     * produce a second row or an error. The unique constraint is the backstop for the
     * race between the lookup and the insert.
     */
    @Transactional
    public Entry save(long userId, String bookSlug, ReadingStatus status,
                      SaveReason reason, String note) {
        BookRow book = catalogue.findBySlug(bookSlug)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "No such book"));

        LibraryItem item = items.findByUserIdAndBookId(userId, book.id())
                .map(existing -> {
                    existing.applyStatus(status);
                    if (reason != null || note != null) {
                        existing.describeSave(reason, note);
                    }
                    return existing;
                })
                .orElseGet(() -> LibraryItem.save(userId, book.id(), status, reason, note));

        try {
            items.save(item);
        } catch (DataIntegrityViolationException e) {
            // Two concurrent saves of the same book: the constraint held, so re-read the
            // winner rather than failing the reader's request.
            log.debug("concurrent save for userId={} bookId={}", userId, book.id());
            item = items.findByUserIdAndBookId(userId, book.id()).orElseThrow();
        }
        return new Entry(item, book);
    }

    @Transactional
    public Entry updateStatus(long userId, String bookSlug, ReadingStatus status) {
        Entry entry = require(userId, bookSlug);
        entry.item().applyStatus(status);
        return entry;
    }

    @Transactional
    public Entry describe(long userId, String bookSlug, SaveReason reason, String note) {
        Entry entry = require(userId, bookSlug);
        entry.item().describeSave(reason, note);
        return entry;
    }

    @Transactional
    public void remove(long userId, String bookSlug) {
        Entry entry = require(userId, bookSlug);
        items.delete(entry.item());
    }

    @Transactional(readOnly = true)
    public Optional<Entry> find(long userId, String bookSlug) {
        return catalogue.findBySlug(bookSlug)
                .flatMap(book -> items.findByUserIdAndBookId(userId, book.id())
                        .map(item -> new Entry(item, book)));
    }

    /**
     * The reader's library, newest activity first.
     *
     * <p>Two queries regardless of size: the library rows, then every book they point at
     * in one lookup. Fetching a book per row would be an N+1 on the most-visited screen
     * in the product.
     */
    @Transactional(readOnly = true)
    public List<Entry> list(long userId, ReadingStatus status, String query) {
        // Filtered and ordered by the database. Loading every row in the table and
        // filtering in memory would read other readers' libraries to answer one reader's
        // request, and would get slower for everyone as the table grows.
        List<LibraryItem> rows = status == null
                ? items.findByUserIdOrderByUpdatedAtDesc(userId)
                : items.findByUserIdAndStatusOrderByUpdatedAtDesc(userId, status);
        if (rows.isEmpty()) {
            return List.of();
        }

        Map<Long, BookRow> books = new HashMap<>();
        catalogue.findByIds(rows.stream().map(LibraryItem::getBookId).toList())
                .forEach(book -> books.put(book.id(), book));

        String needle = (query == null || query.isBlank())
                ? null
                : query.trim().toLowerCase(Locale.ROOT);

        List<Entry> entries = new ArrayList<>();
        for (LibraryItem item : rows) {
            BookRow book = books.get(item.getBookId());
            if (book == null) {
                continue; // the book left the catalogue; skip rather than fail the page
            }
            if (needle != null && !matches(book, needle)) {
                continue;
            }
            entries.add(new Entry(item, book));
        }
        return entries;
    }

    /** Searching within a library is a small, in-memory filter, not a second index. */
    private boolean matches(BookRow book, String needle) {
        if (book.title().toLowerCase(Locale.ROOT).contains(needle)) {
            return true;
        }
        return book.authors().stream()
                .anyMatch(author -> author.toLowerCase(Locale.ROOT).contains(needle));
    }

    @Transactional(readOnly = true)
    public Map<ReadingStatus, Long> counts(long userId) {
        Map<ReadingStatus, Long> counts = new EnumMap<>(ReadingStatus.class);
        for (ReadingStatus status : ReadingStatus.values()) {
            counts.put(status, 0L);
        }
        for (Object[] row : items.countByStatus(userId)) {
            counts.put((ReadingStatus) row[0], (Long) row[1]);
        }
        return counts;
    }

    private Entry require(long userId, String bookSlug) {
        return find(userId, bookSlug)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Not in your library"));
    }
}
