package dev.jorisvrr.reading.library;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static dev.jorisvrr.reading.library.ReadingEventType.*;
import static dev.jorisvrr.reading.library.ReadingStatus.*;
import static dev.jorisvrr.reading.library.StatusTransition.Dates;
import static dev.jorisvrr.reading.library.StatusTransition.Progress;
import static org.assertj.core.api.Assertions.assertThat;

/** The status transition table: one action, one event, and what it does to the dates. */
class StatusTransitionTest {

    @Test
    @DisplayName("a first save says only what the reader actually did")
    void firstSave() {
        assertThat(StatusTransition.of(null, WANT_TO_READ))
                .isEqualTo(new StatusTransition(SAVED, Dates.KEEP, Progress.KEEP));
        assertThat(StatusTransition.of(null, CURRENTLY_READING))
                .isEqualTo(new StatusTransition(STARTED, Dates.BEGIN, Progress.CLEAR));
        // Logging a book read long ago must not invent a start date.
        assertThat(StatusTransition.of(null, READ))
                .isEqualTo(new StatusTransition(FINISHED, Dates.CLOSE, Progress.COMPLETE));
        assertThat(StatusTransition.of(null, DNF))
                .isEqualTo(new StatusTransition(ABANDONED, Dates.CLOSE, Progress.CLEAR));
    }

    @Test
    @DisplayName("starting, finishing and setting aside")
    void readingLife() {
        assertThat(StatusTransition.of(WANT_TO_READ, CURRENTLY_READING))
                .isEqualTo(new StatusTransition(STARTED, Dates.BEGIN, Progress.CLEAR));
        assertThat(StatusTransition.of(CURRENTLY_READING, READ))
                .isEqualTo(new StatusTransition(FINISHED, Dates.CLOSE, Progress.COMPLETE));
        // Where they stopped is worth keeping.
        assertThat(StatusTransition.of(CURRENTLY_READING, DNF))
                .isEqualTo(new StatusTransition(ABANDONED, Dates.CLOSE, Progress.KEEP));
    }

    @Test
    @DisplayName("picking a book up again keeps the place; starting it again does not")
    void resumeAndRestart() {
        assertThat(StatusTransition.of(DNF, CURRENTLY_READING))
                .isEqualTo(new StatusTransition(RESUMED, Dates.REOPEN, Progress.KEEP));
        assertThat(StatusTransition.of(READ, CURRENTLY_READING))
                .isEqualTo(new StatusTransition(RESTARTED, Dates.BEGIN, Progress.CLEAR));
        assertThat(StatusTransition.of(DNF, READ))
                .isEqualTo(new StatusTransition(FINISHED, Dates.CLOSE, Progress.COMPLETE));
    }

    @Test
    @DisplayName("back on the list: no reading is under way, so nothing describes one")
    void backToTheList() {
        for (ReadingStatus from : new ReadingStatus[] { CURRENTLY_READING, READ, DNF }) {
            assertThat(StatusTransition.of(from, WANT_TO_READ))
                    .isEqualTo(new StatusTransition(STATUS_CHANGED, Dates.CLEAR, Progress.CLEAR));
        }
    }

    @Test
    @DisplayName("Read to Did Not Finish is a correction, and cannot stay at 100%")
    void correctionFromRead() {
        assertThat(StatusTransition.of(READ, DNF))
                .isEqualTo(new StatusTransition(STATUS_CHANGED, Dates.KEEP, Progress.CLEAR));
    }

    @ParameterizedTest
    @EnumSource(ReadingStatus.class)
    @DisplayName("asking for the status a book already has changes nothing")
    void sameStatusIsNothing(ReadingStatus status) {
        assertThat(StatusTransition.of(status, status)).isNull();
    }

    @ParameterizedTest
    @EnumSource(ReadingStatus.class)
    @DisplayName("every move produces exactly one event")
    void everyMoveIsCovered(ReadingStatus to) {
        for (ReadingStatus from : ReadingStatus.values()) {
            StatusTransition transition = StatusTransition.of(from, to);
            if (from != to) {
                assertThat(transition).as("%s -> %s", from, to).isNotNull();
                assertThat(transition.event()).isNotNull();
            }
        }
        assertThat(StatusTransition.of(null, to)).isNotNull();
    }
}
