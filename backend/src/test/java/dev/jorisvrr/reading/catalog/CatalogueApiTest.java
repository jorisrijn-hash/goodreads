package dev.jorisvrr.reading.catalog;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * The catalogue API against a real, populated database.
 *
 * <p>These assert the search behaviour measured during the spike — in particular that
 * queries Open Library's own search returns nothing for still resolve here. That is the
 * whole point of holding the corpus locally, so it is worth a regression test.
 *
 * <p>The suite skips itself when the catalogue has not been ingested, so a fresh clone
 * does not fail on data it has not built yet.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CatalogueApiTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcClient db;

    private long bookCount;

    @BeforeAll
    void requireCatalogue() {
        bookCount = db.sql("SELECT count(*) FROM book").query(Long.class).single();
    }

    private void needsCatalogue() {
        assumeTrue(bookCount > 1000,
                "catalogue not ingested — run the ingest task (see docs/INGEST.md)");
    }

    @Test
    void browsingReturnsAPageOfBooks() throws Exception {
        needsCatalogue();
        mvc.perform(get("/api/v1/books").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(5))
                .andExpect(jsonPath("$.total").value(org.hamcrest.Matchers.greaterThan(1000)))
                .andExpect(jsonPath("$.hasMore").value(true))
                .andExpect(jsonPath("$.items[0].title").isNotEmpty())
                .andExpect(jsonPath("$.items[0].coverKey").isNotEmpty())
                .andExpect(jsonPath("$.items[0].authors").isArray());
    }

    @Test
    @DisplayName("pagination advances and does not repeat rows")
    void paginationIsStable() throws Exception {
        needsCatalogue();
        String first = mvc.perform(get("/api/v1/books").param("size", "5").param("page", "0"))
                .andReturn().getResponse().getContentAsString();
        String second = mvc.perform(get("/api/v1/books").param("size", "5").param("page", "1"))
                .andExpect(jsonPath("$.page").value(1))
                .andReturn().getResponse().getContentAsString();

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void sizeIsCappedSoAClientCannotRequestTheWholeCatalogue() throws Exception {
        needsCatalogue();
        mvc.perform(get("/api/v1/books").param("size", "10000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(BookSearchQuery.MAX_SIZE));
    }

    @ParameterizedTest
    @CsvSource({
            "the secret history,    The Secret History",
            "secret history,        The Secret History",
            "dune,                  Dune",
            "les miserables,        Les Misérables",
            "galapagos,             Galápagos",
    })
    @DisplayName("exact, partial and accented queries resolve through full text")
    void fullTextSearch(String query, String expectedTitle) throws Exception {
        needsCatalogue();
        mvc.perform(get("/api/v1/books").param("q", query.trim()).param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].title").value(expectedTitle.trim()))
                // Full text matched, so nothing was corrected.
                .andExpect(jsonPath("$.correctedFrom").doesNotExist());
    }

    @ParameterizedTest
    @CsvSource({
            "The Secre Histroy,              The Secret History",
            "pride and prejudise,            Pride and Prejudice",
            "the great gatsbi,               The Great Gatsby",
            "to kill a mockingbrid,          To Kill a Mockingbird",
            "harry poter philosphers stone,  Harry Potter and the Philosopher's Stone",
    })
    @DisplayName("typos Open Library itself returns nothing for still resolve here")
    void typoTolerance(String query, String expectedTitle) throws Exception {
        needsCatalogue();
        mvc.perform(get("/api/v1/books").param("q", query.trim()).param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].title").value(expectedTitle.trim()))
                // The UI needs to know it is showing results for something else.
                .andExpect(jsonPath("$.correctedFrom").value(query.trim()));
    }

    @Test
    @DisplayName("a short query uses the prefix path, not fuzzy matching")
    void shortQueryPrefix() throws Exception {
        needsCatalogue();
        mvc.perform(get("/api/v1/books").param("q", "Dune").param("size", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].title").value("Dune"));
    }

    @Test
    @DisplayName("a short typo falls through prefix to the low-threshold fuzzy path")
    void shortQueryTypo() throws Exception {
        needsCatalogue();
        // "Duen" scores 0.25 against "Dune" — below pg_trgm's 0.3 default.
        mvc.perform(get("/api/v1/books").param("q", "Duen").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].title").value("Dune"))
                .andExpect(jsonPath("$.correctedFrom").value("Duen"));
    }

    @Test
    void authorSearchReturnsThatAuthorsWork() throws Exception {
        needsCatalogue();
        mvc.perform(get("/api/v1/books").param("q", "donna tartt").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].authors[0]").value("Donna Tartt"));
    }

    @Test
    @DisplayName("an ISBN finds its book, however it is typed")
    void isbnLookup() throws Exception {
        needsCatalogue();
        // A real row, not a hardcoded ISBN, so this holds for whatever the catalogue is.
        var book = db.sql("""
                SELECT slug, isbn13 FROM book WHERE isbn13 LIKE '978%' ORDER BY id LIMIT 1""")
                .query((rs, n) -> new String[] {rs.getString("slug"), rs.getString("isbn13")})
                .single();
        String isbn13 = book[1];
        String hyphenated = isbn13.substring(0, 3) + "-" + isbn13.substring(3, 4) + "-"
                + isbn13.substring(4, 12) + "-" + isbn13.substring(12);
        // The same book's ISBN-10: drop the 978 prefix and recompute the check character.
        String stem = isbn13.substring(3, 12);
        int sum = 0;
        for (int i = 0; i < 9; i++) {
            sum += (stem.charAt(i) - '0') * (10 - i);
        }
        int check = (11 - sum % 11) % 11;
        String isbn10 = stem + (check == 10 ? "X" : String.valueOf(check));

        for (String typed : new String[] {isbn13, hyphenated, isbn10}) {
            mvc.perform(get("/api/v1/books").param("q", typed))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(1))
                    .andExpect(jsonPath("$.items[0].slug").value(book[0]))
                    // An exact identifier match is not a correction.
                    .andExpect(jsonPath("$.correctedFrom").doesNotExist());
        }
    }

    @Test
    void nonsenseReturnsAnEmptyPageRatherThanAnError() throws Exception {
        needsCatalogue();
        mvc.perform(get("/api/v1/books").param("q", "zzzqqqxxnotabook"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.correctedFrom").doesNotExist());
    }

    @Test
    void genreAndLengthFiltersNarrowResults() throws Exception {
        needsCatalogue();
        String body = mvc.perform(get("/api/v1/books")
                        .param("genre", "fantasy").param("maxPages", "250").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].pageCount")
                        .value(org.hamcrest.Matchers.lessThanOrEqualTo(250)))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).contains("Fantasy");
    }

    @Test
    @DisplayName("an unknown sort value is rejected rather than silently ignored")
    void invalidSortIsRejected() throws Exception {
        needsCatalogue();
        mvc.perform(get("/api/v1/books").param("sort", "DROP_TABLE"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void bookDetailReturnsFullMetadata() throws Exception {
        needsCatalogue();
        String slug = db.sql("SELECT slug FROM book WHERE norm_text(title) = 'the secret history' LIMIT 1")
                .query(String.class).single();

        mvc.perform(get("/api/v1/books/{slug}", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("The Secret History"))
                .andExpect(jsonPath("$.authors[0]").value("Donna Tartt"))
                .andExpect(jsonPath("$.publishedYear").value(1992))
                .andExpect(jsonPath("$.pageCount").isNumber())
                .andExpect(jsonPath("$.genres").isArray())
                .andExpect(jsonPath("$.coverKey").isNotEmpty());
    }

    @Test
    @DisplayName("the detail projection carries no rating, because we hold none")
    void bookDetailInventsNoRating() throws Exception {
        needsCatalogue();
        String slug = db.sql("SELECT slug FROM book LIMIT 1").query(String.class).single();
        String body = mvc.perform(get("/api/v1/books/{slug}", slug))
                .andReturn().getResponse().getContentAsString();

        assertThat(body)
                .doesNotContain("rating")
                .doesNotContain("reviewCount")
                .doesNotContain("popularity");
    }

    @Test
    void unknownBookIsNotFound() throws Exception {
        mvc.perform(get("/api/v1/books/definitely-not-a-book"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void genresAreListedWithCounts() throws Exception {
        needsCatalogue();
        mvc.perform(get("/api/v1/genres"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").isNotEmpty())
                .andExpect(jsonPath("$[0].bookCount").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    @Test
    @DisplayName("the catalogue is public — no session required")
    void catalogueNeedsNoAuthentication() throws Exception {
        mvc.perform(get("/api/v1/books")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/genres")).andExpect(status().isOk());
    }
}
