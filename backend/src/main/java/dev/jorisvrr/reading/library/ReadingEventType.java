package dev.jorisvrr.reading.library;

/**
 * What happened to a book in the reader's library, as the journal records it.
 *
 * <p>One meaningful action writes exactly one event. The type alone is not the sentence
 * the journal prints: the same FINISHED means "Finished Dune" after reading it and
 * "Added Dune as Read" when a reader logs a book they read years ago, so the journal
 * reads the type together with the statuses the event moved between.
 *
 * <p>Progress is not an event. It lives in {@code progress_update}, and the journal
 * merges the two, which keeps one action from appearing twice.
 */
public enum ReadingEventType {
    /** The book entered the library, on the Want to Read list. */
    SAVED,
    /** Reading began. */
    STARTED,
    /** The book reached Read, whether just finished or logged as already read. */
    FINISHED,
    /** The book reached Did Not Finish. */
    ABANDONED,
    /** Reading resumed after being set aside; the position is kept. */
    RESUMED,
    /** A finished book is being read again; the position starts over. */
    RESTARTED,
    /** Any other move, such as putting a book back on the Want to Read list. */
    STATUS_CHANGED
}
