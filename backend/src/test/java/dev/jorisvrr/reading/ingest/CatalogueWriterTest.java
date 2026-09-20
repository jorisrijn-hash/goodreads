package dev.jorisvrr.reading.ingest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs against the real goodreads_test database so generated columns, constraints and
 * ON CONFLICT behaviour are genuinely exercised. See docs/decisions/0005 for why this
 * is not Testcontainers.
 */
@SpringBootTest
@Transactional
class CatalogueWriterTest {

    @Autowired CatalogueWriter writer;
    @Autowired JdbcClient db;

    @BeforeEach
    void seedTaxonomy() {
        writer.seedGenres(Map.of("fantasy", "Fantasy", "mystery", "Mystery",
                "science-fiction", "Science Fiction"));
    }

    private CatalogueWriter.BookRow book(String key, String title, List<String> genres,
                                         CatalogueWriter.AuthorRow... authors) {
        return new CatalogueWriter.BookRow(key, title, "A description.", 1992, 559,
                "eng", "9781400031702", 8091016L, "covers/a1/8091016",
                "[\"fiction\"]", List.of(authors), genres);
    }

    @Test
    void insertsANewBook() {
        boolean isNew = writer.upsert(book("/works/OL1W", "The Secret History",
                List.of("mystery"), new CatalogueWriter.AuthorRow("/authors/OL1A", "Donna Tartt")));

        assertThat(isNew).isTrue();
        assertThat(count("book")).isEqualTo(1);
        assertThat(count("author")).isEqualTo(1);
        assertThat(count("book_author")).isEqualTo(1);
        assertThat(count("book_genre")).isEqualTo(1);
    }

    @Test
    @DisplayName("re-running the ingest updates rows instead of duplicating them")
    void upsertIsIdempotent() {
        var row = book("/works/OL1W", "The Secret History", List.of("mystery"),
                new CatalogueWriter.AuthorRow("/authors/OL1A", "Donna Tartt"));

        assertThat(writer.upsert(row)).isTrue();
        assertThat(writer.upsert(row)).isFalse();
        assertThat(writer.upsert(row)).isFalse();

        assertThat(count("book")).isEqualTo(1);
        assertThat(count("author")).isEqualTo(1);
        assertThat(count("book_author")).isEqualTo(1);
        assertThat(count("book_genre")).isEqualTo(1);
    }

    @Test
    void reIngestAppliesUpdatedMetadata() {
        writer.upsert(book("/works/OL1W", "Old Title", List.of("mystery"),
                new CatalogueWriter.AuthorRow("/authors/OL1A", "Donna Tartt")));
        writer.upsert(book("/works/OL1W", "The Secret History", List.of("fantasy"),
                new CatalogueWriter.AuthorRow("/authors/OL1A", "Donna Tartt")));

        assertThat(one("SELECT title FROM book WHERE source_key = '/works/OL1W'"))
                .isEqualTo("The Secret History");
        // Genres are reconciled, not accumulated.
        assertThat(count("book_genre")).isEqualTo(1);
        assertThat(one("""
                SELECT g.slug FROM book_genre bg
                JOIN genre g ON g.id = bg.genre_id
                JOIN book b ON b.id = bg.book_id
                WHERE b.source_key = '/works/OL1W'
                """)).isEqualTo("fantasy");
    }

    @Test
    @DisplayName("an author shared by two books is stored once")
    void deduplicatesAuthorsAcrossBooks() {
        var tartt = new CatalogueWriter.AuthorRow("/authors/OL1A", "Donna Tartt");
        writer.upsert(book("/works/OL1W", "The Secret History", List.of("mystery"), tartt));
        writer.upsert(book("/works/OL2W", "The Goldfinch", List.of("mystery"), tartt));

        assertThat(count("book")).isEqualTo(2);
        assertThat(count("author")).isEqualTo(1);
        assertThat(count("book_author")).isEqualTo(2);
    }

    @Test
    void storesMultipleAuthorsInOrder() {
        writer.upsert(book("/works/OL1W", "Good Omens", List.of("fantasy"),
                new CatalogueWriter.AuthorRow("/authors/OL1A", "Terry Pratchett"),
                new CatalogueWriter.AuthorRow("/authors/OL2A", "Neil Gaiman")));

        List<String> ordered = db.sql("""
                SELECT a.name FROM book_author ba
                JOIN author a ON a.id = ba.author_id
                JOIN book b ON b.id = ba.book_id
                WHERE b.source_key = '/works/OL1W'
                ORDER BY ba.position
                """).query(String.class).list();
        assertThat(ordered).containsExactly("Terry Pratchett", "Neil Gaiman");
    }

    @Test
    @DisplayName("removing an author on re-ingest drops the stale join row")
    void reconcilesAuthorLinks() {
        writer.upsert(book("/works/OL1W", "Good Omens", List.of("fantasy"),
                new CatalogueWriter.AuthorRow("/authors/OL1A", "Terry Pratchett"),
                new CatalogueWriter.AuthorRow("/authors/OL2A", "Neil Gaiman")));
        writer.upsert(book("/works/OL1W", "Good Omens", List.of("fantasy"),
                new CatalogueWriter.AuthorRow("/authors/OL1A", "Terry Pratchett")));

        assertThat(count("book_author")).isEqualTo(1);
    }

    @Test
    @DisplayName("search columns are generated by the database, not the application")
    void populatesSearchColumns() {
        writer.upsert(book("/works/OL1W", "L’Étranger", List.of("fantasy"),
                new CatalogueWriter.AuthorRow("/authors/OL1A", "Albert Camus")));

        String searchText = one("SELECT search_text FROM book WHERE source_key='/works/OL1W'");
        assertThat(searchText).isEqualTo("l'etranger albert camus");

        Integer hits = db.sql("""
                SELECT count(*)::int FROM book
                WHERE source_key = '/works/OL1W'
                  AND search_vector @@ websearch_to_tsquery('simple', norm_text('etranger'))
                """).query(Integer.class).single();
        assertThat(hits).isEqualTo(1);
    }

    @Test
    @DisplayName("a typo still finds the book via trigram similarity")
    void trigramRecoversTypos() {
        writer.upsert(book("/works/OL1W", "The Secret History", List.of("mystery"),
                new CatalogueWriter.AuthorRow("/authors/OL1A", "Donna Tartt")));

        Integer hits = db.sql("""
                SELECT count(*)::int FROM book
                WHERE source_key = '/works/OL1W'
                  AND search_text % norm_text('The Secre Histroy')
                """).query(Integer.class).single();
        assertThat(hits).isEqualTo(1);
    }

    @Test
    void booksAndAuthorsGetDistinctSlugs() {
        writer.upsert(book("/works/OL1W", "Selected Poems", List.of("fantasy"),
                new CatalogueWriter.AuthorRow("/authors/OL1A", "Author One")));
        writer.upsert(book("/works/OL2W", "Selected Poems", List.of("fantasy"),
                new CatalogueWriter.AuthorRow("/authors/OL2A", "Author Two")));

        List<String> slugs = db.sql(
                "SELECT slug FROM book WHERE source_key LIKE '/works/OL_W' ORDER BY slug")
                .query(String.class).list();
        assertThat(slugs).hasSize(2).doesNotHaveDuplicates();
    }

    /**
     * Counts only the rows this test created.
     *
     * <p>The test database holds the real ingested catalogue so the catalogue API tests
     * have something to query, so absolute counts are meaningless here. Every fixture
     * uses an /works/OL…W key of its own, and these queries scope to those.
     */
    private int count(String table) {
        String scoped = switch (table) {
            case "book" -> "SELECT count(*)::int FROM book WHERE source_key LIKE '/works/OL_W'";
            case "author" -> "SELECT count(*)::int FROM author WHERE source_key LIKE '/authors/OL_A'";
            case "book_author" -> """
                    SELECT count(*)::int FROM book_author ba
                    JOIN book b ON b.id = ba.book_id
                    WHERE b.source_key LIKE '/works/OL_W'""";
            case "book_genre" -> """
                    SELECT count(*)::int FROM book_genre bg
                    JOIN book b ON b.id = bg.book_id
                    WHERE b.source_key LIKE '/works/OL_W'""";
            default -> "SELECT count(*)::int FROM " + table;
        };
        return db.sql(scoped).query(Integer.class).single();
    }

    private String one(String sql) {
        return db.sql(sql).query(String.class).single();
    }
}
