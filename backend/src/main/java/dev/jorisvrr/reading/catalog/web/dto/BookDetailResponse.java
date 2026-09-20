package dev.jorisvrr.reading.catalog.web.dto;

import dev.jorisvrr.reading.catalog.BookRow;

import java.util.List;

/**
 * Full book detail.
 *
 * <p>No rating and no review count, and not by omission: we hold neither. Goodreads'
 * ratings are unavailable to us, Open Library's are far too sparse to mean anything, and
 * this application has no ratings of its own yet. An invented number here would be the
 * one dishonest thing on the page.
 */
public record BookDetailResponse(
        String slug,
        String title,
        List<String> authors,
        String description,
        Integer publishedYear,
        Integer pageCount,
        String language,
        String isbn13,
        List<GenreRef> genres,
        String coverKey) {

    public record GenreRef(String slug, String name) {
    }

    public static BookDetailResponse from(BookRow row) {
        List<GenreRef> genres = new java.util.ArrayList<>();
        for (int i = 0; i < row.genreSlugs().size(); i++) {
            String name = i < row.genreNames().size() ? row.genreNames().get(i) : row.genreSlugs().get(i);
            genres.add(new GenreRef(row.genreSlugs().get(i), name));
        }
        return new BookDetailResponse(row.slug(), row.title(), row.authors(), row.description(),
                row.publishedYear(), row.pageCount(), row.language(), row.isbn13(),
                List.copyOf(genres), row.coverKey());
    }
}
