package dev.jorisvrr.reading.ingest;

import dev.jorisvrr.reading.ingest.model.Candidate;
import dev.jorisvrr.reading.ingest.model.RejectionReason;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CandidateFilterTest {

    private final CandidateFilter filter = new CandidateFilter();

    private Candidate valid() {
        return new Candidate("/works/OL1W", "The Secret History", List.of("Donna Tartt"),
                List.of("OL1A"), 1992, 559, 8091016L, List.of("eng"),
                List.of("9781400031702"), List.of("fiction"), "established");
    }

    @Test
    void acceptsAWellFormedCandidate() {
        assertThat(filter.reject(valid())).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(ints = {39, 0, 2001, 5000})
    @DisplayName("page counts outside 40-2000 are data errors, not short or long books")
    void rejectsImplausiblePageCounts(int pages) {
        Candidate c = new Candidate("/works/OL1W", "T", List.of("A"), List.of("OL1A"),
                1992, pages, 1L, List.of("eng"), List.of(), List.of(), "established");
        assertThat(filter.reject(c)).contains(RejectionReason.INVALID_PAGE_COUNT);
    }

    @ParameterizedTest
    @ValueSource(ints = {40, 325, 2000})
    void acceptsPageCountsOnAndInsideTheBoundaries(int pages) {
        assertThat(filter.validPageCount(pages)).isTrue();
    }

    @Test
    void rejectsMissingPageCount() {
        Candidate c = new Candidate("/works/OL1W", "T", List.of("A"), List.of("OL1A"),
                1992, null, 1L, List.of("eng"), List.of(), List.of(), "established");
        assertThat(filter.reject(c)).contains(RejectionReason.INVALID_PAGE_COUNT);
    }

    @Test
    void rejectsMissingCover() {
        Candidate c = new Candidate("/works/OL1W", "T", List.of("A"), List.of("OL1A"),
                1992, 300, null, List.of("eng"), List.of(), List.of(), "established");
        assertThat(filter.reject(c)).contains(RejectionReason.MISSING_COVER);
    }

    @Test
    void rejectsNonEnglish() {
        Candidate c = new Candidate("/works/OL1W", "T", List.of("A"), List.of("OL1A"),
                1992, 300, 1L, List.of("fre", "spa"), List.of(), List.of(), "established");
        assertThat(filter.reject(c)).contains(RejectionReason.NON_ENGLISH);
    }

    @Test
    void rejectsMissingAuthor() {
        Candidate c = new Candidate("/works/OL1W", "T", List.of(), List.of(),
                1992, 300, 1L, List.of("eng"), List.of(), List.of(), "established");
        assertThat(filter.reject(c)).contains(RejectionReason.NO_AUTHOR);
    }

    @Test
    void rejectsBlankTitle() {
        Candidate c = new Candidate("/works/OL1W", "   ", List.of("A"), List.of("OL1A"),
                1992, 300, 1L, List.of("eng"), List.of(), List.of(), "established");
        assertThat(filter.reject(c)).contains(RejectionReason.NO_TITLE);
    }

    @Test
    @DisplayName("a missing description does not reject an otherwise strong book")
    void descriptionIsNotAGate() {
        // Description is not part of Candidate at all — it arrives during hydration,
        // after filtering. This test documents that ordering as intentional.
        assertThat(filter.reject(valid())).isEmpty();
    }
}
