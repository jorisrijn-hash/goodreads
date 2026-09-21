package dev.jorisvrr.reading.catalog;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

/**
 * Catalogue reads.
 *
 * <p>Plain SQL rather than JPA. The search here is a hybrid full-text and trigram query
 * with a ranking expression, which an ORM would only obscure; and the list endpoints need
 * authors and genres aggregated per book, which is one {@code array_agg} instead of an
 * N+1 storm.
 *
 * <p>Search behaviour is the one proven in Checkpoint B against the real catalogue:
 * full-text first, trigram as the typo fallback, and a prefix path for very short
 * queries where trigram similarity is unreliable.
 */
@Repository
public class CatalogueRepository {

    /** Authors and genres, aggregated so one row is one complete book. */
    private static final String SELECT_BOOK = """
            SELECT b.id, b.slug, b.title, b.description, b.published_year, b.page_count,
                   b.language, b.isbn13, b.cover_key,
                   COALESCE(
                     (SELECT array_agg(a.name ORDER BY ba.position)
                      FROM book_author ba JOIN author a ON a.id = ba.author_id
                      WHERE ba.book_id = b.id), '{}') AS authors,
                   COALESCE(
                     (SELECT array_agg(g.slug ORDER BY g.slug)
                      FROM book_genre bg JOIN genre g ON g.id = bg.genre_id
                      WHERE bg.book_id = b.id), '{}') AS genre_slugs,
                   COALESCE(
                     (SELECT array_agg(g.name ORDER BY g.slug)
                      FROM book_genre bg JOIN genre g ON g.id = bg.genre_id
                      WHERE bg.book_id = b.id), '{}') AS genre_names
            """;

    private final JdbcClient db;

    public CatalogueRepository(JdbcClient db) {
        this.db = db;
    }

    public Optional<BookRow> findBySlug(String slug) {
        return db.sql(SELECT_BOOK + " FROM book b WHERE b.slug = :slug")
                .param("slug", slug)
                .query(CatalogueRepository::mapBook)
                .optional();
    }

    public List<BookRow> findByIds(Collection<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return db.sql(SELECT_BOOK + " FROM book b WHERE b.id = ANY (:ids)")
                .param("ids", ids.toArray(new Long[0]))
                .query(CatalogueRepository::mapBook)
                .list();
    }

    public record SearchResult(List<BookRow> books, long total, String correctedFrom) {
    }

    public SearchResult search(BookSearchQuery query) {
        if (!query.hasQuery()) {
            return browse(query);
        }
        // Full text first: exact, partial, author and punctuation/accent queries all
        // resolve here, and it is an order of magnitude faster than the fallback.
        SearchResult fullText = runSearch(query, Mode.FULL_TEXT);
        if (fullText.total() > 0) {
            return fullText;
        }
        // Nothing matched, so the reader either mistyped or typed something too short
        // for full text to stem. Short queries try a prefix match first -- "Dune" should
        // find Dune, not a fuzzy neighbour -- and only then fall back to fuzzy matching.
        for (Mode fallback : query.isShortQuery()
                ? List.of(Mode.PREFIX, Mode.FUZZY_SHORT)
                : List.of(Mode.TRIGRAM)) {
            SearchResult recovered = runSearch(query, fallback);
            if (recovered.total() > 0) {
                return new SearchResult(recovered.books(), recovered.total(), query.q());
            }
        }
        return new SearchResult(List.of(), 0, null);
    }

    private enum Mode { FULL_TEXT, TRIGRAM, PREFIX, FUZZY_SHORT }

    /**
     * pg_trgm's default similarity threshold is 0.3, and a four-character typo like
     * "Duen" against "Dune" scores 0.25 — so a short misspelling finds nothing. Lowering
     * set_limit() globally was measured to inflate long-query matches roughly fivefold,
     * so instead this one fallback compares similarity explicitly at a lower bar. It is
     * reached only when both full text and prefix have already returned nothing.
     */
    private static final double SHORT_QUERY_SIMILARITY = 0.2;

    private SearchResult runSearch(BookSearchQuery query, Mode mode) {
        String predicate = switch (mode) {
            case FULL_TEXT -> "b.search_vector @@ websearch_to_tsquery('simple', norm_text(:q))";
            case TRIGRAM -> "b.search_text % norm_text(:q)";
            // Prefix on the title only: a three-letter query against author names
            // matches far too much to be useful.
            case PREFIX -> "norm_text(b.title) LIKE norm_text(:q) || '%'";
            // Title only: a loose threshold across author names as well would match
            // most of the catalogue.
            case FUZZY_SHORT -> "similarity(norm_text(b.title), norm_text(:q)) >= "
                    + SHORT_QUERY_SIMILARITY;
        };
        String relevance = switch (mode) {
            case FULL_TEXT -> """
                    (norm_text(b.title) = norm_text(:q)) DESC,
                    ts_rank(b.search_vector, websearch_to_tsquery('simple', norm_text(:q))) DESC,
                    length(b.title) ASC""";
            case TRIGRAM -> "similarity(b.search_text, norm_text(:q)) DESC, length(b.title) ASC";
            case PREFIX -> "length(b.title) ASC, b.title ASC";
            case FUZZY_SHORT ->
                    "similarity(norm_text(b.title), norm_text(:q)) DESC, length(b.title) ASC";
        };

        String filters = filterClause(query);
        String orderBy = query.sort() == BookSearchQuery.Sort.RELEVANCE
                ? relevance
                : orderClause(query.sort());

        var count = db.sql("SELECT count(*) FROM book b WHERE " + predicate + filters);
        var rows = db.sql(SELECT_BOOK + " FROM book b WHERE " + predicate + filters
                + " ORDER BY " + orderBy + " LIMIT :limit OFFSET :offset");

        count = count.param("q", query.q());
        rows = rows.param("q", query.q()).param("limit", query.size()).param("offset", query.offset());
        for (var entry : filterParams(query).entrySet()) {
            count = count.param(entry.getKey(), entry.getValue());
            rows = rows.param(entry.getKey(), entry.getValue());
        }

        long total = Objects.requireNonNullElse(count.query(Long.class).single(), 0L);
        return new SearchResult(rows.query(CatalogueRepository::mapBook).list(), total, null);
    }

    private SearchResult browse(BookSearchQuery query) {
        String filters = filterClause(query);
        var count = db.sql("SELECT count(*) FROM book b WHERE true" + filters);
        var rows = db.sql(SELECT_BOOK + " FROM book b WHERE true" + filters
                + " ORDER BY " + orderClause(query.sort())
                + " LIMIT :limit OFFSET :offset")
                .param("limit", query.size()).param("offset", query.offset());

        for (var entry : filterParams(query).entrySet()) {
            count = count.param(entry.getKey(), entry.getValue());
            rows = rows.param(entry.getKey(), entry.getValue());
        }
        long total = Objects.requireNonNullElse(count.query(Long.class).single(), 0L);
        return new SearchResult(rows.query(CatalogueRepository::mapBook).list(), total, null);
    }

    private String filterClause(BookSearchQuery query) {
        StringBuilder sql = new StringBuilder();
        if (query.genre() != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM book_genre bg JOIN genre g ON g.id = bg.genre_id"
                    + " WHERE bg.book_id = b.id AND g.slug = :genre)");
        }
        if (query.minPages() != null) {
            sql.append(" AND b.page_count >= :minPages");
        }
        if (query.maxPages() != null) {
            sql.append(" AND b.page_count <= :maxPages");
        }
        return sql.toString();
    }

    private Map<String, Object> filterParams(BookSearchQuery query) {
        Map<String, Object> params = new LinkedHashMap<>();
        if (query.genre() != null) params.put("genre", query.genre());
        if (query.minPages() != null) params.put("minPages", query.minPages());
        if (query.maxPages() != null) params.put("maxPages", query.maxPages());
        return params;
    }

    /** A fixed mapping from the sort enum to SQL. No client string reaches ORDER BY. */
    private String orderClause(BookSearchQuery.Sort sort) {
        return switch (sort) {
            case NEWEST -> "b.published_year DESC NULLS LAST, b.title ASC";
            case OLDEST -> "b.published_year ASC NULLS LAST, b.title ASC";
            case SHORTEST -> "b.page_count ASC NULLS LAST, b.title ASC";
            case LONGEST -> "b.page_count DESC NULLS LAST, b.title ASC";
            case TITLE -> "norm_text(b.title) ASC";
            // Stable tiebreaker on id so pagination never repeats or drops a row.
            case DEFAULT, RELEVANCE -> "b.id ASC";
        };
    }

    public List<GenreCount> genres() {
        return db.sql("""
                SELECT g.slug, g.name, count(bg.book_id) AS book_count
                FROM genre g LEFT JOIN book_genre bg ON bg.genre_id = g.id
                GROUP BY g.slug, g.name
                HAVING count(bg.book_id) > 0
                ORDER BY book_count DESC
                """).query(GenreCount.class).list();
    }

    public record GenreCount(String slug, String name, long bookCount) {
    }

    private static BookRow mapBook(ResultSet rs, int rowNum) throws SQLException {
        return new BookRow(
                rs.getLong("id"),
                rs.getString("slug"),
                rs.getString("title"),
                rs.getString("description"),
                (Integer) rs.getObject("published_year"),
                (Integer) rs.getObject("page_count"),
                rs.getString("language"),
                rs.getString("isbn13"),
                rs.getString("cover_key"),
                toList(rs.getArray("authors")),
                toList(rs.getArray("genre_slugs")),
                toList(rs.getArray("genre_names")));
    }

    private static List<String> toList(Array array) throws SQLException {
        if (array == null) {
            return List.of();
        }
        String[] values = (String[]) array.getArray();
        return values == null ? List.of() : List.of(values);
    }
}
