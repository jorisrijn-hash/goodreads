package dev.jorisvrr.reading.ingest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class TextNormaliserTest {

    @Test
    @DisplayName("L'Étranger is searchable by the plain ASCII form a user would type")
    void foldsAccentsAndTypographicApostrophes() {
        // The Open Library record uses a typographic apostrophe and an accented E.
        assertThat(TextNormaliser.searchable("L’Étranger")).isEqualTo("l'etranger");
        assertThat(TextNormaliser.searchable("L'Etranger")).isEqualTo("l'etranger");
        assertThat(TextNormaliser.searchable("L‘étranger")).isEqualTo("l'etranger");
    }

    @Test
    @DisplayName("matches the SQL norm_text() function used by the search indexes")
    void agreesWithDatabaseNormalisation() {
        assertThat(TextNormaliser.searchable("L’Étranger — Albert Camus"))
                .isEqualTo("l'etranger — albert camus".replace("—", "—"));
    }

    @ParameterizedTest
    @CsvSource({
            "The Secret History,the secret history",
            "DUNE,dune",
            "  Kafka   on the  Shore  ,kafka on the shore",
            "Harry Potter and the Philosopher’s Stone,harry potter and the philosopher's stone"
    })
    void normalisesTitles(String input, String expected) {
        assertThat(TextNormaliser.searchable(input)).isEqualTo(expected);
    }

    @Test
    void tidyDisplayPreservesAccentsAndCase() {
        assertThat(TextNormaliser.tidyDisplay("  L’Étranger  ")).isEqualTo("L’Étranger");
        assertThat(TextNormaliser.tidyDisplay("   ")).isNull();
        assertThat(TextNormaliser.tidyDisplay(null)).isNull();
    }

    @Test
    void slugsAreUrlSafe() {
        assertThat(TextNormaliser.slug("L’Étranger")).isEqualTo("l-etranger");
        assertThat(TextNormaliser.slug("The Secret History")).isEqualTo("the-secret-history");
        assertThat(TextNormaliser.slug("1984")).isEqualTo("1984");
        assertThat(TextNormaliser.slug("!!!")).isNull();
    }

    @Test
    void slugIsTruncatedWithoutTrailingDash() {
        String slug = TextNormaliser.slug("a".repeat(100) + " book");
        assertThat(slug).hasSizeLessThanOrEqualTo(80).doesNotEndWith("-");
    }

    @ParameterizedTest
    @CsvSource({
            "978-0-441-01359-3,9780441013593",
            "0441013597,0441013597",
            "0-8044-2957-X,080442957X"
    })
    void normalisesIsbns(String input, String expected) {
        assertThat(TextNormaliser.normaliseIsbn(input)).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {"12345", "not-an-isbn", "97804410135931234", "04X4101359"})
    void rejectsMalformedIsbns(String input) {
        assertThat(TextNormaliser.normaliseIsbn(input)).isNull();
    }
}
