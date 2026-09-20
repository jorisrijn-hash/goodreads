package dev.jorisvrr.reading.library.web.dto;

import dev.jorisvrr.reading.catalog.web.dto.BookSummaryResponse;
import dev.jorisvrr.reading.library.LibraryService;
import dev.jorisvrr.reading.library.ReadingStatus;
import dev.jorisvrr.reading.library.SaveReason;

import java.time.Instant;

/** A book in the reader's library, with the reader's own state attached. */
public record LibraryEntryResponse(
        BookSummaryResponse book,
        ReadingStatus status,
        SaveReason saveReason,
        String saveNote,
        Instant startedAt,
        Instant finishedAt,
        Instant savedAt,
        Instant updatedAt) {

    public static LibraryEntryResponse from(LibraryService.Entry entry) {
        var item = entry.item();
        return new LibraryEntryResponse(
                BookSummaryResponse.from(entry.book()),
                item.getStatus(), item.getSaveReason(), item.getSaveNote(),
                item.getStartedAt(), item.getFinishedAt(),
                item.getCreatedAt(), item.getUpdatedAt());
    }
}
