package dev.jorisvrr.reading.ingest;

import dev.jorisvrr.reading.ingest.model.GenreMapping;
import dev.jorisvrr.reading.ingest.model.GenreMapping.Anomaly;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GenreMapperTest {

    private GenreMapper mapper;

    @BeforeEach
    void setUp() throws IOException {
        mapper = new GenreMapper();
    }

    @Test
    @DisplayName("strips subjects that describe the record rather than the book")
    void removesNoiseSubjects() {
        List<String> clean = mapper.denoise(List.of(
                "Fantasy", "New York Times bestseller", "Accessible book",
                "Large type books", "Open Library staff picks", "Dragons"));
        assertThat(clean).containsExactly("Fantasy", "Dragons");
    }

    @Test
    void mapsAStraightforwardGenre() {
        GenreMapping m = mapper.map(List.of("Fantasy", "Dragons", "Magic"), false);
        assertThat(m.genres()).contains("fantasy");
        assertThat(m.confidence()).isGreaterThan(0.4);
    }

    @Test
    @DisplayName("anchored patterns stop 'science fiction' from also matching 'science'")
    void doesNotConfuseScienceWithScienceFiction() {
        GenreMapping m = mapper.map(List.of("Science fiction", "Space opera"), false);
        assertThat(m.genres()).contains("science-fiction").doesNotContain("science");
    }

    @Test
    @DisplayName("historical fiction does not leak into history")
    void doesNotConfuseHistoricalFictionWithHistory() {
        GenreMapping m = mapper.map(List.of("Historical fiction"), false);
        assertThat(m.genres()).contains("historical-fiction").doesNotContain("history");
    }

    @Test
    void capsGenresAtThreeAndRecordsTheRest() {
        GenreMapping m = mapper.map(List.of(
                "Fantasy", "Horror", "Romance", "Mystery", "Thriller", "Poetry"), false);
        assertThat(m.genres()).hasSize(3);
        assertThat(m.dropped()).isNotEmpty();
        assertThat(m.anomalies()).contains(Anomaly.TOO_MANY_GENRES);
    }

    @Test
    void flagsBooksWithNoMappableGenre() {
        GenreMapping m = mapper.map(List.of("Something entirely unmapped", "Xyzzy"), false);
        assertThat(m.genres()).isEmpty();
        assertThat(m.anomalies()).contains(Anomaly.NO_GENRE);
        assertThat(m.confidence()).isZero();
    }

    @Test
    void flagsConflictingGenres() {
        GenreMapping m = mapper.map(List.of("Children's fiction", "Horror"), false);
        assertThat(m.anomalies()).contains(Anomaly.CONFLICTING_GENRES);
    }

    @Test
    @DisplayName("weak-only matches are flagged as low confidence rather than trusted")
    void flagsLowConfidenceWeakMatches() {
        GenreMapping m = mapper.map(List.of("Magic", "Wizards", "Dragons"), false);
        assertThat(m.genres()).contains("fantasy");
        assertThat(m.confidence()).isLessThan(0.4);
        assertThat(m.anomalies()).contains(Anomaly.LOW_CONFIDENCE);
    }

    @Test
    void demoBooksAlwaysEnterTheReviewQueue() {
        GenreMapping m = mapper.map(List.of("Fantasy", "Dragons", "Magic", "Epic fantasy"), true);
        assertThat(m.anomalies()).contains(Anomaly.DEMO_BOOK);
        assertThat(m.needsReview()).isTrue();
    }

    @Test
    void handlesNullAndEmptySubjects() {
        assertThat(mapper.map(null, false).genres()).isEmpty();
        assertThat(mapper.map(List.of(), false).anomalies()).contains(Anomaly.NO_GENRE);
    }

    @Test
    @DisplayName("faceted subjects like 'form:graphic novel' are mapped, not missed")
    void stripsFacetPrefixes() {
        assertThat(mapper.denoise(List.of("form:graphic novel", "genre:science fantasy")))
                .containsExactly("graphic novel", "science fantasy");
        assertThat(mapper.map(List.of("form:manga", "form:graphic novel"), false).genres())
                .contains("graphic-novels");
    }

    @Test
    @DisplayName("real books that the first ingest rejected now map correctly")
    void mapsBooksTheFirstIngestMissed() {
        // Clean Code - rejected because the technology patterns were too narrow.
        assertThat(mapper.map(List.of("Agile software development", "Reliability",
                "Computer software", "Computer software, development", "Coding theory"), false)
                .genres()).contains("technology");

        // The Creative Act - the taxonomy had no art or creativity category at all.
        assertThat(mapper.map(List.of("New York Times Bestseller", "creativity", "Artists"), false)
                .genres()).contains("art-design");

        // Programming-language subjects are extremely common and mapped nothing before.
        assertThat(mapper.map(List.of("Python (Computer program language)"), false)
                .genres()).contains("technology");
    }

    @Test
    @DisplayName("bare 'fiction' is a weak signal, not a confident classification")
    void bareFictionMapsWeakly() {
        GenreMapping m = mapper.map(List.of("Fiction"), false);
        assertThat(m.genres()).contains("literary-fiction");
        assertThat(m.anomalies()).contains(Anomaly.LOW_CONFIDENCE);
    }

    @Test
    @DisplayName("subject variants with suffixes still map")
    void toleratesSubjectSuffixes() {
        assertThat(mapper.map(List.of("Poetry (poetic works by one author)"), false).genres())
                .contains("poetry");
        assertThat(mapper.map(List.of("Young adult fiction, fantasy, dark fantasy"), false).genres())
                .contains("young-adult");
    }

    @Test
    void taxonomyIsNonEmptyAndSlugged() {
        assertThat(mapper.taxonomy()).isNotEmpty()
                .allSatisfy((slug, name) -> {
                    assertThat(slug).matches("[a-z0-9-]+");
                    assertThat(name).isNotBlank();
                });
    }
}
