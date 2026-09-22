package dev.jorisvrr.reading.library.web.dto;

import dev.jorisvrr.reading.library.LibraryService;
import dev.jorisvrr.reading.library.ProgressUpdate;

import java.time.Instant;

/**
 * The result of recording progress: the book's state now, and the history entry that was
 * written. {@code progressUpdate} is null when nothing changed — the same page with no
 * note — so a client can tell "saved" from "there was nothing to save".
 */
public record ProgressResponse(LibraryEntryResponse libraryItem, Entry progressUpdate) {

    /** One entry in the reader's progress history. */
    public record Entry(long id, Integer page, Integer percent, String note, Instant at) {
        static Entry from(ProgressUpdate update) {
            return new Entry(update.getId(), update.getPage(), update.getPercent(),
                    update.getNote(), update.getCreatedAt());
        }
    }

    public static ProgressResponse from(LibraryService.Progress progress) {
        return new ProgressResponse(
                LibraryEntryResponse.from(progress.entry()),
                progress.update() == null ? null : Entry.from(progress.update()));
    }
}
