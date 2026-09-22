package dev.jorisvrr.reading.library;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * One thing that happened to a book in a reader's library: saved, started, finished,
 * set aside, picked up again, started again, or moved.
 *
 * <p>Append-only. Nothing updates or deletes an event while the library item lives; the
 * row is the history, while {@code library_item} only describes the present. Events
 * cascade away with their item, because removing a book means forgetting it.
 */
@Entity
@Table(name = "reading_event")
public class ReadingEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "library_item_id", nullable = false, updatable = false)
    private Long libraryItemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, updatable = false)
    private ReadingEventType eventType;

    /** Null only for a first save: there was no previous status. */
    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", updatable = false)
    private ReadingStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, updatable = false)
    private ReadingStatus toStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ReadingEvent() {
        // for JPA
    }

    static ReadingEvent of(Long libraryItemId, ReadingEventType type, ReadingStatus from, ReadingStatus to) {
        ReadingEvent event = new ReadingEvent();
        event.libraryItemId = libraryItemId;
        event.eventType = type;
        event.fromStatus = from;
        event.toStatus = to;
        return event;
    }

    public Long getId() { return id; }
    public Long getLibraryItemId() { return libraryItemId; }
    public ReadingEventType getEventType() { return eventType; }
    public ReadingStatus getFromStatus() { return fromStatus; }
    public ReadingStatus getToStatus() { return toStatus; }
    public Instant getCreatedAt() { return createdAt; }
}
