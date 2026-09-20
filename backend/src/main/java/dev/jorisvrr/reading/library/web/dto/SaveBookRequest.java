package dev.jorisvrr.reading.library.web.dto;

import dev.jorisvrr.reading.library.ReadingStatus;
import dev.jorisvrr.reading.library.SaveReason;
import jakarta.validation.constraints.Size;

/**
 * Saving a book.
 *
 * <p>Every field is optional. Status defaults to "want to read" because that is what the
 * primary action means, and the reason and note exist so they can be offered
 * <em>after</em> the save — never as a form standing between a reader and their library.
 */
public record SaveBookRequest(
        ReadingStatus status,
        SaveReason saveReason,
        @Size(max = 2000, message = "Keep the note under 2000 characters.")
        String saveNote) {

    public ReadingStatus statusOrDefault() {
        return status == null ? ReadingStatus.WANT_TO_READ : status;
    }
}
