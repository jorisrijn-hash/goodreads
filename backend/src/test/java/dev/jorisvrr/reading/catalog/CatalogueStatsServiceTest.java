package dev.jorisvrr.reading.catalog;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class CatalogueStatsServiceTest {

    /** A clock the test can move. */
    private static final class MovableClock extends Clock {
        private Instant now = Instant.parse("2026-09-21T12:00:00Z");

        void advance(Duration by) { now = now.plus(by); }
        @Override public Instant instant() { return now; }
        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
    }

    @Test
    void holdsTheCountsForTheTtlThenRefreshes() {
        AtomicInteger queries = new AtomicInteger();
        // A stub, not a mock: each query returns a different count, so a cached answer
        // and a fresh one are distinguishable.
        CatalogueRepository repository = new CatalogueRepository(null) {
            @Override
            public CatalogueStats stats() {
                return new CatalogueStats(9000 + queries.incrementAndGet(), 7984, 25);
            }
        };
        MovableClock clock = new MovableClock();
        CatalogueStatsService service = new CatalogueStatsService(repository, clock);

        assertThat(service.current().books()).isEqualTo(9001);
        clock.advance(CatalogueStatsService.TTL.minusSeconds(1));
        assertThat(service.current().books()).as("still within the TTL").isEqualTo(9001);
        assertThat(queries).hasValue(1);

        clock.advance(Duration.ofSeconds(2));
        assertThat(service.current().books()).as("refreshed after the TTL").isEqualTo(9002);
        assertThat(queries).hasValue(2);
    }
}
