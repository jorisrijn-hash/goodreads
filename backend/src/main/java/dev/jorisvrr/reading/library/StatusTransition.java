package dev.jorisvrr.reading.library;

import static dev.jorisvrr.reading.library.ReadingEventType.*;
import static dev.jorisvrr.reading.library.ReadingStatus.*;

/**
 * What a status change means: which event the journal records, and what happens to the
 * dates and the current position.
 *
 * <p>The whole table lives here, in one place, because these rules are the product's
 * behaviour and are easy to get subtly wrong when they are spread through a service.
 *
 * <p>Two ideas hold it together:
 * <ul>
 *   <li>{@code reading_event} and {@code progress_update} are the permanent history.
 *   <li>{@code library_item}'s dates and position describe the <em>current</em> reading
 *       only. Starting a finished book again moves the start date, because the reader is
 *       reading it now; the earlier reading is still in the history. Per-reading session
 *       records are deliberately not modelled yet.
 * </ul>
 */
record StatusTransition(ReadingEventType event, Dates dates, Progress progress) {

    /** What happens to started_at and finished_at. */
    enum Dates {
        /** Leave both as they are. */
        KEEP,
        /** A reading begins now: started_at = now, finished_at cleared. */
        BEGIN,
        /** A reading ends now: finished_at = now, started_at left alone. */
        CLOSE,
        /** Reading resumes: started_at kept, finished_at cleared. */
        REOPEN,
        /** No reading is in progress or recorded: both cleared. */
        CLEAR
    }

    /** What happens to current_page, progress_percent and progress_updated_at. */
    enum Progress {
        KEEP,
        /** The book is finished: the last page, 100%, recorded now. */
        COMPLETE,
        /** No current position: all three cleared. The history keeps every entry. */
        CLEAR
    }

    /**
     * The transition from {@code from} (null when the book is not in the library yet) to
     * {@code to}. Returns null when nothing changes, which is not an event and must not
     * touch the row at all.
     */
    static StatusTransition of(ReadingStatus from, ReadingStatus to) {
        if (from == to) {
            return null;
        }
        if (from == null) {
            // A first save. Logging a book as already read or set aside says nothing
            // about when it was started, so no start date is invented.
            return switch (to) {
                case WANT_TO_READ -> new StatusTransition(SAVED, Dates.KEEP, Progress.KEEP);
                case CURRENTLY_READING -> new StatusTransition(STARTED, Dates.BEGIN, Progress.CLEAR);
                case READ -> new StatusTransition(FINISHED, Dates.CLOSE, Progress.COMPLETE);
                case DNF -> new StatusTransition(ABANDONED, Dates.CLOSE, Progress.CLEAR);
            };
        }
        return switch (from) {
            case WANT_TO_READ -> switch (to) {
                case CURRENTLY_READING -> new StatusTransition(STARTED, Dates.BEGIN, Progress.CLEAR);
                case READ -> new StatusTransition(FINISHED, Dates.CLOSE, Progress.COMPLETE);
                case DNF -> new StatusTransition(ABANDONED, Dates.CLOSE, Progress.CLEAR);
                case WANT_TO_READ -> null;
            };
            case CURRENTLY_READING -> switch (to) {
                case READ -> new StatusTransition(FINISHED, Dates.CLOSE, Progress.COMPLETE);
                // Set aside: where the reader stopped is worth keeping.
                case DNF -> new StatusTransition(ABANDONED, Dates.CLOSE, Progress.KEEP);
                // Back on the list: no reading is under way, so nothing describes one.
                case WANT_TO_READ -> new StatusTransition(STATUS_CHANGED, Dates.CLEAR, Progress.CLEAR);
                case CURRENTLY_READING -> null;
            };
            case READ -> switch (to) {
                // Reading it again: a new reading, so the position starts over.
                case CURRENTLY_READING -> new StatusTransition(RESTARTED, Dates.BEGIN, Progress.CLEAR);
                // A correction. "Did Not Finish" with 607 of 607 pages would contradict
                // itself, and the earlier position cannot be recovered without knowing
                // which reading it belonged to.
                case DNF -> new StatusTransition(STATUS_CHANGED, Dates.KEEP, Progress.CLEAR);
                case WANT_TO_READ -> new StatusTransition(STATUS_CHANGED, Dates.CLEAR, Progress.CLEAR);
                case READ -> null;
            };
            case DNF -> switch (to) {
                // Picked up again: carry on from where they stopped.
                case CURRENTLY_READING -> new StatusTransition(RESUMED, Dates.REOPEN, Progress.KEEP);
                // They did finish it after all.
                case READ -> new StatusTransition(FINISHED, Dates.CLOSE, Progress.COMPLETE);
                case WANT_TO_READ -> new StatusTransition(STATUS_CHANGED, Dates.CLEAR, Progress.CLEAR);
                case DNF -> null;
            };
        };
    }
}
