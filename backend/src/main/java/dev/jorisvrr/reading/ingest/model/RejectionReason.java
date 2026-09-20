package dev.jorisvrr.reading.ingest.model;

/** Why a harvested candidate did not enter the curated catalogue. */
public enum RejectionReason {
    NO_TITLE,
    NO_AUTHOR,
    NON_ENGLISH,
    MISSING_COVER,
    INVALID_PAGE_COUNT,
    IMPLAUSIBLE_YEAR,
    NO_GENRE_MAPPING,
    COVER_DOWNLOAD_FAILED,
    DUPLICATE_IN_BATCH
}
