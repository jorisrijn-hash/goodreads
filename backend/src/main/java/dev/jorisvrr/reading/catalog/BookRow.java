package dev.jorisvrr.reading.catalog;

import java.util.List;

/** A book as read from the database, before it becomes a response DTO. */
public record BookRow(
        long id,
        String slug,
        String title,
        String description,
        Integer publishedYear,
        Integer pageCount,
        String language,
        String isbn13,
        String coverKey,
        List<String> authors,
        List<String> genreSlugs,
        List<String> genreNames) {
}
