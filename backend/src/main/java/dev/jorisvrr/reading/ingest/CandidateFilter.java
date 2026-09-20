package dev.jorisvrr.reading.ingest;

import dev.jorisvrr.reading.ingest.model.Candidate;
import dev.jorisvrr.reading.ingest.model.RejectionReason;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Catalogue quality gates.
 *
 * <p>The spike showed completeness is driven by curation, not by the provider:
 * a popularity-curated corpus yields 99.7% covers and 98.6% page counts, while the
 * 2023+ bucket yields 12.8% and 37.9%. These gates enforce that on the way in, so the
 * application never has to render a book with no cover or no length.
 *
 * <p>Description is deliberately <em>not</em> a gate — 20% of otherwise excellent books
 * lack one, and Book Detail has a real empty state for it.
 */
@Component
public class CandidateFilter {

    /** Values outside this range are data errors, not short or long books. */
    public static final int MIN_PAGES = 40;
    public static final int MAX_PAGES = 2000;
    private static final int MIN_YEAR = 1000;
    private static final int MAX_YEAR = 2100;

    public Optional<RejectionReason> reject(Candidate c) {
        if (TextNormaliser.tidyDisplay(c.title()) == null) {
            return Optional.of(RejectionReason.NO_TITLE);
        }
        if (c.authorNames() == null || c.authorNames().isEmpty()
                || TextNormaliser.tidyDisplay(c.authorNames().getFirst()) == null) {
            return Optional.of(RejectionReason.NO_AUTHOR);
        }
        if (!c.hasEnglish()) {
            return Optional.of(RejectionReason.NON_ENGLISH);
        }
        if (c.coverId() == null || c.coverId() <= 0) {
            return Optional.of(RejectionReason.MISSING_COVER);
        }
        if (!validPageCount(c.pageCount())) {
            return Optional.of(RejectionReason.INVALID_PAGE_COUNT);
        }
        if (c.firstPublishYear() != null
                && (c.firstPublishYear() < MIN_YEAR || c.firstPublishYear() > MAX_YEAR)) {
            return Optional.of(RejectionReason.IMPLAUSIBLE_YEAR);
        }
        return Optional.empty();
    }

    public boolean validPageCount(Integer pages) {
        return pages != null && pages >= MIN_PAGES && pages <= MAX_PAGES;
    }
}
