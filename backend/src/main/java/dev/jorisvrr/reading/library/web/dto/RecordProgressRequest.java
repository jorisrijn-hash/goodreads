package dev.jorisvrr.reading.library.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Where the reader has got to.
 *
 * <p>The page is the input for any book whose length the catalogue knows, and the server
 * derives the percentage from it; only a book without a usable page count takes a
 * percentage. Which one applies is decided by the book, not by the client, so sending
 * the other one is refused rather than guessed at.
 *
 * <p>The note is the reader's own and private. It is optional, and sending the same page
 * again with a note is how a thought gets recorded without having read further.
 */
public record RecordProgressRequest(
        @Min(value = 0, message = "A page cannot be negative.")
        Integer page,

        @Min(value = 0, message = "Progress must be between 0 and 100 percent.")
        @Max(value = 100, message = "Progress must be between 0 and 100 percent.")
        Integer percent,

        @Size(max = 1000, message = "Keep the note under 1000 characters.")
        String note) {
}
