package dev.jorisvrr.reading.library;

import dev.jorisvrr.reading.catalog.BookRow;
import dev.jorisvrr.reading.catalog.CatalogueRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.springframework.http.HttpStatus.CONFLICT;
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

    /** The product's limit, the same number the field, the request and the schema use. */
    public static final int MAX_NOTE = 1000;

    private final LibraryItemRepository items;
    private final CatalogueRepository catalogue;
    private final ReadingEventRepository events;
    private final ProgressUpdateRepository progress;

    public LibraryService(LibraryItemRepository items, CatalogueRepository catalogue,
                          ReadingEventRepository events, ProgressUpdateRepository progress) {
        this.items = items;
        this.catalogue = catalogue;
        this.events = events;
        this.progress = progress;
    }

    /** A library row together with the book it refers to. */
    public record Entry(LibraryItem item, BookRow book) {
    }

    /** A recorded position, and the state it left the book in. */
    public record Progress(Entry entry, ProgressUpdate update) {
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

        Optional<LibraryItem> existing = items.findByUserIdAndBookId(userId, book.id());
        LibraryItem item = existing.orElseGet(() -> LibraryItem.save(userId, book.id(), reason, note));
        ReadingStatus before = existing.map(LibraryItem::getStatus).orElse(null);
        ReadingEventType event = item.applyStatus(status, book.pageCount());
        if (existing.isPresent() && (reason != null || note != null)) {
            item.describeSave(reason, note);
        }

        try {
            items.save(item);
        } catch (DataIntegrityViolationException e) {
            // Two concurrent saves of the same book: the constraint held, so re-read the
            // winner rather than failing the reader's request.
            log.debug("concurrent save for userId={} bookId={}", userId, book.id());
            return new Entry(items.findByUserIdAndBookId(userId, book.id()).orElseThrow(), book);
        }
        record(item, event, before, status);
        return new Entry(item, book);
    }

    @Transactional
    public Entry updateStatus(long userId, String bookSlug, ReadingStatus status) {
        Entry entry = require(userId, bookSlug);
        ReadingStatus before = entry.item().getStatus();
        ReadingEventType event = entry.item().applyStatus(status, entry.book().pageCount());
        record(entry.item(), event, before, status);
        return entry;
    }

    /**
     * Records where the reader has got to.
     *
     * <p>Only while a book is being read: a page number must never quietly start a book,
     * and a finished or set-aside book has no current position to move. The row is locked
     * for the whole transaction, so the position and the history it produces are written
     * together or not at all.
     *
     * <p>A page that does not move and carries no note changes nothing: no row, no
     * timestamp, no journal entry. The same page <em>with</em> a note is a real entry,
     * which is how a reader records a thought without having read further. Going
     * backwards is allowed and recorded; the history is never rewritten.
     */
    @Transactional
    public Progress recordProgress(long userId, String bookSlug, Integer page, Integer percent,
                                   String note, boolean notesAllowed) {
        BookRow book = catalogue.findBySlug(bookSlug)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "No such book"));
        LibraryItem item = items.findForUpdate(userId, book.id())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Not in your library"));

        if (item.getStatus() != ReadingStatus.CURRENTLY_READING) {
            throw new ResponseStatusException(CONFLICT,
                    "Start reading this book before recording progress.");
        }
        String cleaned = (note == null || note.isBlank()) ? null : note.trim();
        if (cleaned != null && !notesAllowed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Notes are turned off on the shared demo account.");
        }
        if (cleaned != null && cleaned.length() > MAX_NOTE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Keep the note under " + MAX_NOTE + " characters.");
        }

        boolean byPage = LibraryItem.hasPageCount(book.pageCount());
        if (byPage) {
            if (page == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Give the page you have reached.");
            }
            if (page < 0 || page > book.pageCount()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Page must be between 0 and " + book.pageCount() + ".");
            }
        } else {
            if (percent == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "This book has no page count, so give your progress as a percentage.");
            }
            if (percent < 0 || percent > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Progress must be between 0 and 100 percent.");
            }
        }

        boolean unchanged = byPage
                ? Objects.equals(item.getCurrentPage(), page)
                : Objects.equals(item.getProgressPercent(), percent);
        if (unchanged && cleaned == null) {
            // Nothing happened. Saying so is better than a journal full of "page 183".
            return new Progress(new Entry(item, book), null);
        }

        item.recordProgress(byPage ? page : null, byPage ? null : percent, book.pageCount());
        items.save(item);
        ProgressUpdate update = progress.save(ProgressUpdate.of(
                item.getId(), item.getCurrentPage(), item.getProgressPercent(), cleaned));
        return new Progress(new Entry(item, book), update);
    }

    /** One meaningful action, one event. A status that did not change writes nothing. */
    private void record(LibraryItem item, ReadingEventType event, ReadingStatus from, ReadingStatus to) {
        if (event != null) {
            events.save(ReadingEvent.of(item.getId(), event, from, to));
        }
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
