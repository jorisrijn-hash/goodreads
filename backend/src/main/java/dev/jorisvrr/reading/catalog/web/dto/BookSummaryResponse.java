package dev.jorisvrr.reading.catalog.web.dto;

import dev.jorisvrr.reading.catalog.BookRow;

import java.util.List;

/**
 * A book in a list. Deliberately lighter than the detail projection: descriptions are
 * long, and a grid of 24 books does not need them.
 */
public record BookSummaryResponse(
        String slug,
        String title,
        List<String> authors,
        Integer publishedYear,
        Integer pageCount,
        List<String> genres,
        String coverKey) {

    public static BookSummaryResponse from(BookRow row) {
        return new BookSummaryResponse(row.slug(), row.title(), row.authors(),
                row.publishedYear(), row.pageCount(), row.genreNames(), row.coverKey());
    }
}
