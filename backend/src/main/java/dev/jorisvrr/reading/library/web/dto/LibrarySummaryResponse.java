package dev.jorisvrr.reading.library.web.dto;

import dev.jorisvrr.reading.library.ReadingStatus;

import java.util.Map;

/**
 * Counts per status. Every figure here is derived from the reader's own rows — there is
 * nothing on this response we cannot compute from what they actually saved.
 */
public record LibrarySummaryResponse(
        long total,
        long wantToRead,
        long currentlyReading,
        long read,
        long didNotFinish) {

    public static LibrarySummaryResponse from(Map<ReadingStatus, Long> counts) {
        long want = counts.getOrDefault(ReadingStatus.WANT_TO_READ, 0L);
        long reading = counts.getOrDefault(ReadingStatus.CURRENTLY_READING, 0L);
        long read = counts.getOrDefault(ReadingStatus.READ, 0L);
        long dnf = counts.getOrDefault(ReadingStatus.DNF, 0L);
        return new LibrarySummaryResponse(want + reading + read + dnf, want, reading, read, dnf);
    }
}
