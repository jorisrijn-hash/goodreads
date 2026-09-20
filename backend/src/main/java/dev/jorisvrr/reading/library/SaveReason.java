package dev.jorisvrr.reading.library;

/**
 * Why a reader saved a book.
 *
 * <p>Answers the complaint that a to-read list becomes a pile of titles with no memory
 * of where any of them came from. Always optional — capture, don't interrogate.
 */
public enum SaveReason {
    RECOMMENDED,
    SAW_ONLINE,
    SCHOOL_OR_WORK,
    AUTHOR_INTEREST,
    OTHER
}
