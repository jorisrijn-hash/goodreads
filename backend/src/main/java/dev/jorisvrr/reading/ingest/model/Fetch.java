package dev.jorisvrr.reading.ingest.model;

/**
 * Outcome of a single HTTP fetch.
 *
 * <p>Distinguishing these matters for the data-quality report: {@code NOT_FOUND} is a
 * permanent statement about the data ("this work has no record"), while {@code FAILED}
 * is a statement about the network ("we could not find out"). Collapsing both into null
 * would silently mis-attribute infrastructure problems as missing metadata.
 *
 * @param retries how many retries this fetch consumed; > 0 with status OK means a
 *                transient failure was recovered
 */
public record Fetch<T>(T value, Status status, int retries) {

    public enum Status {
        /** 200, body present. */
        OK,
        /** 404 — authoritative absence. Not retried. */
        NOT_FOUND,
        /** Network error or 5xx that survived all retry attempts. */
        FAILED
    }

    public boolean ok() {
        return status == Status.OK;
    }

    public boolean recoveredAfterRetry() {
        return status == Status.OK && retries > 0;
    }

    public static <T> Fetch<T> ok(T value, int retries) {
        return new Fetch<>(value, Status.OK, retries);
    }

    public static <T> Fetch<T> notFound(int retries) {
        return new Fetch<>(null, Status.NOT_FOUND, retries);
    }

    public static <T> Fetch<T> failed(int retries) {
        return new Fetch<>(null, Status.FAILED, retries);
    }
}
