package dev.jorisvrr.reading.ingest.model;

import java.util.List;

/**
 * A work as returned by Open Library's search endpoint, before hydration.
 * Field names mirror the API so the mapping stays obvious.
 */
public record Candidate(
        String key,
        String title,
        List<String> authorNames,
        List<String> authorKeys,
        Integer firstPublishYear,
        Integer pageCount,
        Long coverId,
        List<String> languages,
        List<String> isbns,
        List<String> subjects,
        String bucket) {

    public boolean hasEnglish() {
        return languages != null && languages.contains("eng");
    }

    public String primaryIsbn() {
        return isbns == null ? null : isbns.stream().findFirst().orElse(null);
    }
}
