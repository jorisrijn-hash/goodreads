package dev.jorisvrr.reading.library;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static dev.jorisvrr.reading.library.ReadingStatus.*;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * What a status change and a recorded position do to the row itself: the dates and the
 * position describe the current reading, while the history lives in the two append-only
 * tables.
 */
class LibraryItemTest {

    private static final int PAGES = 607;

    private LibraryItem saved() {
        LibraryItem item = LibraryItem.save(1L, 2L, null, null);
        item.applyStatus(WANT_TO_READ, PAGES);
        return item;
    }

    @Test
    @DisplayName("percentages are whole numbers, and only the last page is 100%")
    void percentages() {
        assertThat(LibraryItem.percentFor(183, 607)).isEqualTo(30);
        assertThat(LibraryItem.percentFor(606, 607)).isEqualTo(99);
        assertThat(LibraryItem.percentFor(607, 607)).isEqualTo(100);
        assertThat(LibraryItem.percentFor(0, 607)).isZero();
        // Nothing divides by a length the catalogue does not really know.
        assertThat(LibraryItem.hasPageCount(null)).isFalse();
        assertThat(LibraryItem.hasPageCount(0)).isFalse();
        assertThat(LibraryItem.hasPageCount(-3)).isFalse();
        assertThat(LibraryItem.hasPageCount(1)).isTrue();
    }

    @Test
    @DisplayName("starting sets the start date; finishing completes the position")
    void startAndFinish() {
        LibraryItem item = saved();
        assertThat(item.getStartedAt()).isNull();

        item.applyStatus(CURRENTLY_READING, PAGES);
        assertThat(item.getStartedAt()).isNotNull();
        assertThat(item.getFinishedAt()).isNull();

        item.recordProgress(183, null, PAGES);
        assertThat(item.getCurrentPage()).isEqualTo(183);
        assertThat(item.getProgressPercent()).isEqualTo(30);
        assertThat(item.getProgressUpdatedAt()).isNotNull();

        item.applyStatus(READ, PAGES);
        assertThat(item.getFinishedAt()).isNotNull();
        assertThat(item.getCurrentPage()).isEqualTo(PAGES);
        assertThat(item.getProgressPercent()).isEqualTo(100);
    }

    @Test
    @DisplayName("a book read long ago gets no invented start date")
    void loggedAsAlreadyRead() {
        LibraryItem item = LibraryItem.save(1L, 2L, null, null);
        item.applyStatus(READ, PAGES);
        assertThat(item.getStartedAt()).isNull();
        assertThat(item.getFinishedAt()).isNotNull();
        assertThat(item.getProgressPercent()).isEqualTo(100);
    }

    @Test
    @DisplayName("setting aside keeps the place; picking it up again carries on")
    void setAsideAndResume() {
        LibraryItem item = saved();
        item.applyStatus(CURRENTLY_READING, PAGES);
        item.recordProgress(183, null, PAGES);

        item.applyStatus(DNF, PAGES);
        assertThat(item.getCurrentPage()).isEqualTo(183);
        assertThat(item.getFinishedAt()).isNotNull();

        item.applyStatus(CURRENTLY_READING, PAGES);
        assertThat(item.getCurrentPage()).isEqualTo(183);
        assertThat(item.getFinishedAt()).isNull();
        assertThat(item.getStartedAt()).isNotNull();
    }

    @Test
    @DisplayName("reading it again starts a new reading, and forgets the old place")
    void reread() {
        LibraryItem item = saved();
        item.applyStatus(CURRENTLY_READING, PAGES);
        var firstStart = item.getStartedAt();
        item.applyStatus(READ, PAGES);

        item.applyStatus(CURRENTLY_READING, PAGES);
        assertThat(item.getCurrentPage()).isNull();
        assertThat(item.getProgressPercent()).isNull();
        assertThat(item.getProgressUpdatedAt()).isNull();
        assertThat(item.getFinishedAt()).isNull();
        assertThat(item.getStartedAt()).isAfterOrEqualTo(firstStart);
    }

    @Test
    @DisplayName("a finished book marked Did Not Finish cannot stay at 100%")
    void correctionFromRead() {
        LibraryItem item = saved();
        item.applyStatus(READ, PAGES);
        var finished = item.getFinishedAt();

        item.applyStatus(DNF, PAGES);
        assertThat(item.getCurrentPage()).isNull();
        assertThat(item.getProgressPercent()).isNull();
        assertThat(item.getFinishedAt()).isEqualTo(finished);
    }

    @Test
    @DisplayName("back on the list clears the dates and the place")
    void backToTheList() {
        LibraryItem item = saved();
        item.applyStatus(CURRENTLY_READING, PAGES);
        item.recordProgress(183, null, PAGES);

        item.applyStatus(WANT_TO_READ, PAGES);
        assertThat(item.getStartedAt()).isNull();
        assertThat(item.getFinishedAt()).isNull();
        assertThat(item.getCurrentPage()).isNull();
        assertThat(item.getProgressPercent()).isNull();
    }

    @Test
    @DisplayName("the same status is a true no-op: no event, and nothing is touched")
    void sameStatus() {
        LibraryItem item = saved();
        item.applyStatus(CURRENTLY_READING, PAGES);
        item.recordProgress(183, null, PAGES);
        var updated = item.getUpdatedAt();

        assertThat(item.applyStatus(CURRENTLY_READING, PAGES)).isNull();
        assertThat(item.getUpdatedAt()).isEqualTo(updated);
        assertThat(item.getCurrentPage()).isEqualTo(183);
    }

    @Test
    @DisplayName("a book with no page count keeps only the percentage")
    void percentOnly() {
        LibraryItem item = LibraryItem.save(1L, 2L, null, null);
        item.applyStatus(CURRENTLY_READING, null);
        item.recordProgress(null, 30, null);
        assertThat(item.getCurrentPage()).isNull();
        assertThat(item.getProgressPercent()).isEqualTo(30);

        item.applyStatus(READ, null);
        assertThat(item.getCurrentPage()).isNull();
        assertThat(item.getProgressPercent()).isEqualTo(100);
    }
}
