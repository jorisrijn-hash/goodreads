package dev.jorisvrr.reading.catalog;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Catalogue size, held briefly in memory.
 *
 * The numbers only change when the offline ingest rebuilds the catalogue, never because
 * of a request, so recomputing them for every landing-page view would be work with no
 * possible result. Ten minutes bounds how stale they can be after an ingest.
 */
@Service
public class CatalogueStatsService {

    static final Duration TTL = Duration.ofMinutes(10);

    private final CatalogueRepository catalogue;
    private final Clock clock;

    private record Snapshot(CatalogueRepository.CatalogueStats stats, Instant takenAt) {
    }

    // Replaced whole, never mutated, so a reader always sees one consistent snapshot.
    private volatile Snapshot snapshot;

    // Marked because there are two constructors; the other exists for tests.
    @Autowired
    public CatalogueStatsService(CatalogueRepository catalogue) {
        this(catalogue, Clock.systemUTC());
    }

    CatalogueStatsService(CatalogueRepository catalogue, Clock clock) {
        this.catalogue = catalogue;
        this.clock = clock;
    }

    public CatalogueRepository.CatalogueStats current() {
        Snapshot held = snapshot;
        Instant now = clock.instant();
        if (held == null || held.takenAt().plus(TTL).isBefore(now)) {
            // Two concurrent refreshes would both compute the same answer; that is
            // cheaper than a lock on every read.
            held = new Snapshot(catalogue.stats(), now);
            snapshot = held;
        }
        return held.stats();
    }
}
