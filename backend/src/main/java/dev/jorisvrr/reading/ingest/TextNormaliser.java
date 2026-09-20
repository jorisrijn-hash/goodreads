package dev.jorisvrr.reading.ingest;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Normalisation used during ingest.
 *
 * <p>Display strings are never destroyed: {@link #tidyDisplay} only collapses
 * whitespace and trims. The aggressive forms ({@link #searchable}) exist purely so
 * ingest can compare and de-duplicate; the database recomputes its own normalised
 * columns via the IMMUTABLE {@code norm_text()} SQL function, and this class is kept
 * deliberately equivalent to it.
 */
public final class TextNormaliser {

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern COMBINING = Pattern.compile("\\p{M}+");
    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9]+");
    private static final Pattern EDGE_DASH = Pattern.compile("(^-+)|(-+$)");

    private TextNormaliser() {
    }

    /** Collapses whitespace and trims. Keeps accents, case and punctuation. */
    public static String tidyDisplay(String raw) {
        if (raw == null) {
            return null;
        }
        String tidied = WHITESPACE.matcher(raw.replace(' ', ' ')).replaceAll(" ").trim();
        return tidied.isEmpty() ? null : tidied;
    }

    /**
     * Folds typographic apostrophes to ASCII. Applied to display strings too, because
     * "L’Étranger" and "L'Étranger" are the same title and users type the ASCII form.
     */
    public static String foldApostrophes(String raw) {
        return raw == null ? null : raw.replace('’', '\'')
                .replace('‘', '\'')
                .replace('´', '\'')
                .replace('`', '\'');
    }

    /**
     * Lowercased, accent-stripped, apostrophe-folded. Mirrors the SQL norm_text()
     * so ingest-side comparisons agree with database-side search.
     */
    public static String searchable(String raw) {
        if (raw == null) {
            return null;
        }
        String folded = foldApostrophes(raw);
        String decomposed = Normalizer.normalize(folded, Normalizer.Form.NFKD);
        String stripped = COMBINING.matcher(decomposed).replaceAll("");
        return WHITESPACE.matcher(stripped.toLowerCase(Locale.ROOT)).replaceAll(" ").trim();
    }

    /** URL-safe slug. Not unique on its own — callers append a discriminator. */
    public static String slug(String raw) {
        String base = searchable(raw);
        if (base == null) {
            return null;
        }
        String slug = EDGE_DASH.matcher(NON_SLUG.matcher(base).replaceAll("-")).replaceAll("");
        if (slug.length() > 80) {
            slug = EDGE_DASH.matcher(slug.substring(0, 80)).replaceAll("");
        }
        return slug.isEmpty() ? null : slug;
    }

    /**
     * Keeps digits and a trailing X check character. Returns null unless the result is
     * a plausible ISBN-10 or ISBN-13; Open Library contains malformed values.
     */
    public static String normaliseIsbn(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = raw.replaceAll("[^0-9Xx]", "").toUpperCase(Locale.ROOT);
        if (cleaned.length() != 10 && cleaned.length() != 13) {
            return null;
        }
        if (cleaned.indexOf('X') >= 0 && cleaned.indexOf('X') != cleaned.length() - 1) {
            return null;
        }
        return cleaned;
    }
}
