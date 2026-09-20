package dev.jorisvrr.reading.ingest.model;

import java.util.List;

/**
 * Result of mapping noisy Open Library subjects onto the controlled taxonomy.
 *
 * @param genres   accepted genre slugs, already capped
 * @param dropped  genres removed by the cap, kept for the review queue
 * @param anomalies why this book may need human review
 * @param confidence 0.0-1.0; low values mean only weak patterns matched
 */
public record GenreMapping(
        List<String> genres,
        List<String> dropped,
        List<Anomaly> anomalies,
        double confidence) {

    public enum Anomaly {
        NO_GENRE,
        TOO_MANY_GENRES,
        CONFLICTING_GENRES,
        LOW_CONFIDENCE,
        DEMO_BOOK
    }

    public boolean needsReview() {
        return !anomalies.isEmpty();
    }
}
