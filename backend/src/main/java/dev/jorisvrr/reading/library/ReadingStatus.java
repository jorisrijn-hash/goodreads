package dev.jorisvrr.reading.library;

/**
 * Where a reader stands with a book.
 *
 * <p>A <em>state</em>, not a shelf. One row per reader and book holds exactly one of
 * these, which is what lets a rating, a note and a reading history survive a status
 * change — the thing Goodreads gets right and is worth keeping.
 */
public enum ReadingStatus {
    WANT_TO_READ,
    CURRENTLY_READING,
    READ,
    DNF;

    /** Finishing or abandoning a book is what closes it out. */
    public boolean isClosed() {
        return this == READ || this == DNF;
    }
}
