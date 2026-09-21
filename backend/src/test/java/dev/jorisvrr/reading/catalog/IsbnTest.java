package dev.jorisvrr.reading.catalog;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class IsbnTest {

    @ParameterizedTest
    @CsvSource({
            "9780306406157,     9780306406157",
            "978-0-306-40615-7, 9780306406157",
            "978 0 306 40615 7, 9780306406157",
            "0306406152,        9780306406157",   // ISBN-10 of the same book
            "0-306-40615-2,     9780306406157",
            "080442957X,        9780804429573",   // check character X
            "080442957x,        9780804429573",
    })
    void normalisesEveryValidFormToIsbn13(String typed, String expected) {
        assertThat(Isbn.toIsbn13(typed)).contains(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "9780306406158",   // wrong check digit
            "0306406153",      // wrong ISBN-10 check digit
            "1234567890123",   // thirteen digits, not a 978/979 prefix
            "dune",
            "1984",
            "",
    })
    void rejectsAnythingThatIsNotAValidIsbn(String typed) {
        assertThat(Isbn.toIsbn13(typed)).isEmpty();
    }

    @Test
    void rejectsNull() {
        assertThat(Isbn.toIsbn13(null)).isEmpty();
    }
}
