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

    static LibraryItem save(Long userId, Long bookId, ReadingStatus status,
                            SaveReason reason, String note) {
        LibraryItem item = new LibraryItem();
        item.userId = userId;
        item.bookId = bookId;
        item.saveReason = reason;
        item.saveNote = note;
        item.applyStatus(status);
        return item;
    }

    /**
     * Moves the reader to a new status and keeps the dates honest.
     *
     * <p>Dates are set when they first become true and never cleared by a later change:
     * going back to reading a finished book must not erase the fact that it was once
     * finished. Reading history is not supposed to be destroyed by a status change.
     */
    void applyStatus(ReadingStatus next) {
        Instant now = Instant.now();

        if (next == ReadingStatus.CURRENTLY_READING && startedAt == null) {
            startedAt = now;
        }
        if (next.isClosed()) {
            // A book can be finished without ever having been marked as started —
            // the common case for someone logging a book they read last year.
            if (startedAt == null) {
                startedAt = now;
            }
            if (finishedAt == null) {
                finishedAt = now;
            }
        }
        this.status = next;
        this.updatedAt = now;
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
    public Instant getStartedAt() { return startedAt; }
    public Instant getFinishedAt() { return finishedAt; }
    public SaveReason getSaveReason() { return saveReason; }
    public String getSaveNote() { return saveNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
