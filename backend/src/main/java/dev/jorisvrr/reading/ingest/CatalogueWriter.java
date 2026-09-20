package dev.jorisvrr.reading.ingest;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Stage 8 — idempotent write into PostgreSQL.
 *
 * <p>Deliberately JDBC rather than JPA. This is a bulk upsert keyed on an external
 * identifier; {@code ON CONFLICT ... DO UPDATE} expresses it directly, whereas JPA would
 * need a read-modify-write per row. Knowing when to leave the ORM is the point.
 *
 * <p>The Open Library work key is the idempotency key, so re-running the pipeline updates
 * rows instead of duplicating them. Join rows are reconciled, not blindly inserted.
 */
@Component
public class CatalogueWriter {

    /** One book as it will be written. */
    public record BookRow(
            String sourceKey, String title, String description, Integer publishedYear,
            Integer pageCount, String language, String isbn13, Long coverSourceId,
            String coverKey, String rawSubjectsJson, List<AuthorRow> authors,
            List<String> genreSlugs) {
    }

    public record AuthorRow(String sourceKey, String name) {
    }

    private final JdbcClient db;

    public CatalogueWriter(JdbcClient db) {
        this.db = db;
    }

    @Transactional
    public void seedGenres(Map<String, String> taxonomy) {
        taxonomy.forEach((slug, name) -> db.sql("""
                INSERT INTO genre (slug, name) VALUES (:slug, :name)
                ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                """).param("slug", slug).param("name", name).update());
    }

    /** @return true when the book was newly inserted, false when an existing row was updated. */
    @Transactional
    public boolean upsert(BookRow book) {
        boolean existed = db.sql("SELECT 1 FROM book WHERE source_key = :k")
                .param("k", book.sourceKey()).query().listOfRows().size() == 1;

        long bookId = db.sql("""
                INSERT INTO book (source_key, slug, title, description, published_year,
                                  page_count, language, isbn13, cover_source_id, cover_key,
                                  raw_subjects, author_names, updated_at)
                VALUES (:sourceKey, :slug, :title, :description, :publishedYear,
                        :pageCount, :language, :isbn13, :coverSourceId, :coverKey,
                        CAST(:rawSubjects AS jsonb), :authorNames, now())
                ON CONFLICT (source_key) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    published_year = EXCLUDED.published_year,
                    page_count = EXCLUDED.page_count,
                    language = EXCLUDED.language,
                    isbn13 = EXCLUDED.isbn13,
                    cover_source_id = EXCLUDED.cover_source_id,
                    cover_key = EXCLUDED.cover_key,
                    raw_subjects = EXCLUDED.raw_subjects,
                    author_names = EXCLUDED.author_names,
                    updated_at = now()
                RETURNING id
                """)
                .param("sourceKey", book.sourceKey())
                .param("slug", uniqueBookSlug(book))
                .param("title", book.title())
                .param("description", book.description())
                .param("publishedYear", book.publishedYear())
                .param("pageCount", book.pageCount())
                .param("language", book.language())
                .param("isbn13", book.isbn13())
                .param("coverSourceId", book.coverSourceId())
                .param("coverKey", book.coverKey())
                .param("rawSubjects", book.rawSubjectsJson())
                .param("authorNames", String.join(", ",
                        book.authors().stream().map(AuthorRow::name).toList()))
                .query(Long.class).single();

        reconcileAuthors(bookId, book.authors());
        reconcileGenres(bookId, book.genreSlugs());
        return !existed;
    }

    private void reconcileAuthors(long bookId, List<AuthorRow> authors) {
        List<Long> authorIds = new ArrayList<>();
        for (AuthorRow a : authors) {
            authorIds.add(upsertAuthor(a));
        }
        // Remove links that are no longer correct, then add the current set.
        db.sql("DELETE FROM book_author WHERE book_id = :b AND author_id <> ALL (:ids)")
                .param("b", bookId)
                .param("ids", authorIds.isEmpty() ? new Long[]{-1L} : authorIds.toArray(new Long[0]))
                .update();
        for (int i = 0; i < authorIds.size(); i++) {
            db.sql("""
                    INSERT INTO book_author (book_id, author_id, position)
                    VALUES (:b, :a, :p)
                    ON CONFLICT (book_id, author_id) DO UPDATE SET position = EXCLUDED.position
                    """)
                    .param("b", bookId).param("a", authorIds.get(i)).param("p", i).update();
        }
    }

    private long upsertAuthor(AuthorRow a) {
        return db.sql("""
                INSERT INTO author (source_key, name, slug)
                VALUES (:sourceKey, :name, :slug)
                ON CONFLICT (source_key) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
                """)
                .param("sourceKey", a.sourceKey())
                .param("name", a.name())
                .param("slug", uniqueAuthorSlug(a))
                .query(Long.class).single();
    }

    private void reconcileGenres(long bookId, List<String> slugs) {
        db.sql("DELETE FROM book_genre WHERE book_id = :b").param("b", bookId).update();
        for (String slug : slugs) {
            db.sql("""
                    INSERT INTO book_genre (book_id, genre_id)
                    SELECT :b, id FROM genre WHERE slug = :slug
                    ON CONFLICT DO NOTHING
                    """).param("b", bookId).param("slug", slug).update();
        }
    }

    /** Title slug plus the Open Library id, which is already unique and stable. */
    private String uniqueBookSlug(BookRow book) {
        String base = TextNormaliser.slug(book.title());
        String suffix = book.sourceKey().substring(book.sourceKey().lastIndexOf('/') + 1)
                .toLowerCase(Locale.ROOT);
        return (base == null ? "book" : base) + "-" + suffix;
    }

    private String uniqueAuthorSlug(AuthorRow a) {
        String base = TextNormaliser.slug(a.name());
        String suffix = a.sourceKey().substring(a.sourceKey().lastIndexOf('/') + 1)
                .toLowerCase(Locale.ROOT);
        return (base == null ? "author" : base) + "-" + suffix;
    }
}
