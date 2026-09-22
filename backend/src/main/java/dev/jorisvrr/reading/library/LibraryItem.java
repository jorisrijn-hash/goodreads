package dev.jorisvrr.reading.library;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * One reader's relationship with one book.
 *
 * <p>JPA here, unlike the catalogue's plain SQL: this is an aggregate the application
 * owns and mutates one instance at a time, with invariants to enforce. The catalogue is
 * bulk, read-only and search-ranked, which is a different job.
 *
 * <p>{@code UNIQUE (user_id, book_id)} in the schema is the real authority — a reader
 * cannot have two relationships with the same book.
 */
@Entity
@Table(name = "library_item")
public class LibraryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReadingStatus status;

    @Column(name = "current_page")
    private Integer currentPage;

    @Column(name = "progress_percent")
    private Short progressPercent;

    @Column(name = "progress_updated_at")
    private Instant progressUpdatedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "save_reason")
    private SaveReason saveReason;

    @Column(name = "save_note")
    private String saveNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected LibraryItem() {
        // for JPA
    }

    static LibraryItem save(Long userId, Long bookId, SaveReason reason, String note) {
        LibraryItem item = new LibraryItem();
        item.userId = userId;
        item.bookId = bookId;
        item.saveReason = reason;
        item.saveNote = note;
        return item;
    }

    /**
     * Moves the reader to a new status, following {@link StatusTransition}.
     *
     * <p>These dates and the position describe the <em>current</em> reading, not the
     * first one ever: the permanent record is {@code reading_event} and
     * {@code progress_update}. So starting a finished book again moves the start date,
     * and putting a book back on the list clears both dates, while nothing is lost.
     *
     * <p>Returns the event to record, or null when the status is already what was asked
     * for. That case is a true no-op: nothing is written, not even updated_at, so
     * tapping a status twice does not fill the journal or reorder the library.
     */
    ReadingEventType applyStatus(ReadingStatus next, Integer pageCount) {
        StatusTransition transition = StatusTransition.of(status, next);
        if (transition == null) {
            return null;
        }
        Instant now = Instant.now();

        switch (transition.dates()) {
            case BEGIN -> { startedAt = now; finishedAt = null; }
            case CLOSE -> finishedAt = now;
            case REOPEN -> finishedAt = null;
            case CLEAR -> { startedAt = null; finishedAt = null; }
            case KEEP -> { }
        }
        switch (transition.progress()) {
            case COMPLETE -> {
                currentPage = hasPageCount(pageCount) ? pageCount : null;
                progressPercent = (short) 100;
                progressUpdatedAt = now;
            }
            case CLEAR -> { currentPage = null; progressPercent = null; progressUpdatedAt = null; }
            case KEEP -> { }
        }
        this.status = next;
        this.updatedAt = now;
        return transition.event();
    }

    /**
     * Records where the reader has got to. The page is the truth wherever the book has a
     * usable length, and the percent is derived from it; a book whose length the
     * catalogue does not know keeps only the percent the reader gave.
     */
    void recordProgress(Integer page, Integer percent, Integer pageCount) {
        Instant now = Instant.now();
        if (hasPageCount(pageCount)) {
            currentPage = page;
            progressPercent = (short) percentFor(page, pageCount);
        } else {
            currentPage = null;
            progressPercent = percent.shortValue();
        }
        progressUpdatedAt = now;
        this.updatedAt = now;
    }

    /** A length only counts as known when it is a real number of pages. */
    static boolean hasPageCount(Integer pageCount) {
        return pageCount != null && pageCount > 0;
    }

    /**
     * Whole numbers, rounded down, so a percentage never claims a page that has not been
     * read. Only the last page reads as 100%: 606 of 607 is 99%, not 100%.
     */
    static int percentFor(int page, int pageCount) {
        if (page >= pageCount) {
            return 100;
        }
        return Math.max(0, (int) ((long) page * 100 / pageCount));
    }

    void describeSave(SaveReason reason, String note) {
        this.saveReason = reason;
        this.saveNote = (note == null || note.isBlank()) ? null : note.trim();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getBookId() { return bookId; }
    public ReadingStatus getStatus() { return status; }
    public Integer getCurrentPage() { return currentPage; }
    public Integer getProgressPercent() { return progressPercent == null ? null : progressPercent.intValue(); }
    public Instant getProgressUpdatedAt() { return progressUpdatedAt; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getFinishedAt() { return finishedAt; }
    public SaveReason getSaveReason() { return saveReason; }
    public String getSaveNote() { return saveNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
