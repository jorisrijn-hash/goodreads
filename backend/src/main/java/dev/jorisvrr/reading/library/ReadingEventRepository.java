package dev.jorisvrr.reading.library;

import org.springframework.data.jpa.repository.JpaRepository;

/** Append-only; the journal reads events through {@link ReadingJournal}, not from here. */
public interface ReadingEventRepository extends JpaRepository<ReadingEvent, Long> {
}
