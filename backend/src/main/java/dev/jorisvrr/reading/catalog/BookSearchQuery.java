package dev.jorisvrr.reading.catalog;

/**
 * Validated search input.
 *
 * <p>A closed set of parameters, deliberately. Nothing here is passed through to SQL as
 * a column name, an ordering clause or a predicate fragment — the repository maps each
 * field onto SQL it owns, so the API cannot be used to query arbitrary columns.
 */
public record BookSearchQuery(
        String q,
        String genre,
        Integer minPages,
        Integer maxPages,
        Sort sort,
        int page,
        int size) {

    public enum Sort {
        /** Search relevance when there is a query; falls back to DEFAULT without one. */
        RELEVANCE,
        NEWEST,
        OLDEST,
        SHORTEST,
        LONGEST,
        TITLE,
        /**
         * The catalogue's own stable order.
         *
         * <p>Named for what it is. This was briefly called POPULAR, which was a claim the
         * system cannot support: there is no popularity signal anywhere in the data. It
         * was a stable id ordering wearing a label that implied readership.
         */
        DEFAULT
    }

    public static final int MAX_SIZE = 48;
    public static final int DEFAULT_SIZE = 24;
    /** Below this, trigram similarity is unreliable and a prefix match works better. */
    public static final int SHORT_QUERY_LENGTH = 5;

    public BookSearchQuery {
        q = (q == null || q.isBlank()) ? null : q.trim();
        genre = (genre == null || genre.isBlank()) ? null : genre.trim();
        sort = sort == null ? (q == null ? Sort.DEFAULT : Sort.RELEVANCE) : sort;
        page = Math.max(0, page);
        size = size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
    }

    public boolean hasQuery() {
        return q != null;
    }

    public boolean isShortQuery() {
        return q != null && q.length() < SHORT_QUERY_LENGTH;
    }

    public int offset() {
        return page * size;
    }
}
