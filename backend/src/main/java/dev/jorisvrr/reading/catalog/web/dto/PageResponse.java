package dev.jorisvrr.reading.catalog.web.dto;

import java.util.List;

/**
 * A page of results.
 *
 * @param correctedFrom set when the original query returned nothing and a fallback
 *                      recovered it, so the UI can say "showing results for…" rather
 *                      than silently changing what the reader asked for
 */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long total,
        boolean hasMore,
        String correctedFrom) {

    public static <T> PageResponse<T> of(List<T> items, int page, int size, long total,
                                         String correctedFrom) {
        return new PageResponse<>(items, page, size, total,
                (long) (page + 1) * size < total, correctedFrom);
    }
}
