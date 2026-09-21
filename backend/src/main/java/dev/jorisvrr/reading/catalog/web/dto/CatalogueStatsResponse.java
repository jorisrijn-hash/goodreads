package dev.jorisvrr.reading.catalog.web.dto;

import dev.jorisvrr.reading.catalog.CatalogueRepository;

/**
 * The size of the catalogue: what the landing page states as fact.
 *
 * Deliberately three numbers and nothing else — no timestamps, no database or ingest
 * metadata, nothing about readers.
 */
public record CatalogueStatsResponse(long books, long authors, long genres) {

    public static CatalogueStatsResponse from(CatalogueRepository.CatalogueStats stats) {
        return new CatalogueStatsResponse(stats.books(), stats.authors(), stats.genres());
    }
}
