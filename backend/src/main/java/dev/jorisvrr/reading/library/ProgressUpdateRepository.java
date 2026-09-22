package dev.jorisvrr.reading.library;

import org.springframework.data.jpa.repository.JpaRepository;

/** Append-only; the journal reads progress through {@link ReadingJournal}, not from here. */
public interface ProgressUpdateRepository extends JpaRepository<ProgressUpdate, Long> {
}
