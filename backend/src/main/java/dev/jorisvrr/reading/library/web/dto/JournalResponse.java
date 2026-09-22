package dev.jorisvrr.reading.library.web.dto;

import dev.jorisvrr.reading.catalog.web.dto.BookSummaryResponse;
import dev.jorisvrr.reading.library.ReadingEventType;
import dev.jorisvrr.reading.library.ReadingJournal;
import dev.jorisvrr.reading.library.ReadingStatus;

import java.time.Instant;
import java.util.List;

/**
 * A page of the reader's journal, newest first.
 *
 * <p>Each entry carries what happened and what it happened to; the wording is the
 * client's, because the same FINISHED reads as "Finished Dune" after reading it and
 * "Added Dune as Read" when a reader logs a book they finished years ago. That is why
 * {@code fromStatus} travels with the event.
 *
 * <p>{@code nextCursor} is null on the last page.
 */
public record JournalResponse(List<Entry> items, String nextCursor) {

    public record Entry(
            String id,
            ReadingJournal.Kind kind,
            Instant at,
            BookSummaryResponse book,
            ReadingEventType event,
            ReadingStatus fromStatus,
            ReadingStatus toStatus,
            Integer page,
            Integer pageCount,
            Integer percent,
            String note) {
    }

    public static JournalResponse from(ReadingJournal.Page page) {
        return new JournalResponse(
                page.entries().stream()
                        .map(e -> new Entry(e.id(), e.kind(), e.at(), BookSummaryResponse.from(e.book()),
                                e.event(), e.fromStatus(), e.toStatus(),
                                e.page(), e.book().pageCount(), e.percent(), e.note()))
                        .toList(),
                page.nextCursor());
    }
}
