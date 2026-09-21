package dev.jorisvrr.reading.catalog;

import java.util.Optional;

/**
 * Recognises an ISBN typed into the search box.
 *
 * <p>Readers paste ISBNs in whatever form they found them: with hyphens or spaces, as
 * the older ten-digit form, with a lowercase check character. The catalogue stores only
 * ISBN-13, so every valid form is brought to that. The checksum is verified, so a
 * thirteen-digit number that is not an ISBN is left to ordinary search rather than
 * treated as a lookup that finds nothing.
 */
final class Isbn {

    private Isbn() {
    }

    /** The ISBN-13 this query denotes, or empty if it is not a valid ISBN. */
    static Optional<String> toIsbn13(String query) {
        if (query == null) {
            return Optional.empty();
        }
        String compact = query.replaceAll("[\\s-]", "").toUpperCase(java.util.Locale.ROOT);
        if (compact.matches("97[89]\\d{10}")) {
            return checkDigit13(compact.substring(0, 12)) == compact.charAt(12) - '0'
                    ? Optional.of(compact)
                    : Optional.empty();
        }
        if (compact.matches("\\d{9}[\\dX]") && isValidIsbn10(compact)) {
            String stem = "978" + compact.substring(0, 9);
            return Optional.of(stem + checkDigit13(stem));
        }
        return Optional.empty();
    }

    private static int checkDigit13(String twelveDigits) {
        int sum = 0;
        for (int i = 0; i < 12; i++) {
            sum += (twelveDigits.charAt(i) - '0') * (i % 2 == 0 ? 1 : 3);
        }
        return (10 - sum % 10) % 10;
    }

    private static boolean isValidIsbn10(String isbn10) {
        int sum = 0;
        for (int i = 0; i < 10; i++) {
            char c = isbn10.charAt(i);
            int value = c == 'X' ? 10 : c - '0';
            sum += value * (10 - i);
        }
        return sum % 11 == 0;
    }
}
