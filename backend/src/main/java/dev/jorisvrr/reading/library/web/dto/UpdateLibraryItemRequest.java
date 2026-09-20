package dev.jorisvrr.reading.library.web.dto;

import dev.jorisvrr.reading.library.ReadingStatus;
import dev.jorisvrr.reading.library.SaveReason;
import jakarta.validation.constraints.Size;

/**
 * A partial update. Any field left null is left alone, so the reason and note can be
 * added later without restating the status.
 */
public record UpdateLibraryItemRequest(
        ReadingStatus status,
        SaveReason saveReason,
        @Size(max = 2000, message = "Keep the note under 2000 characters.")
        String saveNote,
        /** Set true to clear the reason and note rather than leave them unchanged. */
        Boolean clearSaveDetails) {
}
