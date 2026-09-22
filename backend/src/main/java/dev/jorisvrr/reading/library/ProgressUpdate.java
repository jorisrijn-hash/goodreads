package dev.jorisvrr.reading.library;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Where a reader had got to, when they said so.
 *
 * <p>Append-only, like {@link ReadingEvent}: a correction (183 back to 150) is a new row,
 * never an edit, so the journal shows what really happened rather than a tidied story.
 *
 * <p>With a usable page count the page is the truth and the percent is derived from it;
 * without one only the percent is kept. The note is the reader's own, private, and in
 * Checkpoint E it cannot be edited or deleted on its own.
 */
@Entity
@Table(name = "progress_update")
public class ProgressUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "library_item_id", nullable = false, updatable = false)
    private Long libraryItemId;

    @Column(updatable = false)
    private Integer page;

    @Column(updatable = false)
    private Short percent;

    @Column(updatable = false)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ProgressUpdate() {
        // for JPA
    }

    static ProgressUpdate of(Long libraryItemId, Integer page, Integer percent, String note) {
        ProgressUpdate update = new ProgressUpdate();
        update.libraryItemId = libraryItemId;
        update.page = page;
        update.percent = percent == null ? null : percent.shortValue();
        update.note = note;
        return update;
    }

    public Long getId() { return id; }
    public Long getLibraryItemId() { return libraryItemId; }
    public Integer getPage() { return page; }
    public Integer getPercent() { return percent == null ? null : percent.intValue(); }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
