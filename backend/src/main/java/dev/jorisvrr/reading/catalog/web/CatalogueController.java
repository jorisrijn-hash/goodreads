package dev.jorisvrr.reading.catalog.web;

import dev.jorisvrr.reading.catalog.CatalogueStatsService;
import dev.jorisvrr.reading.catalog.web.dto.CatalogueStatsResponse;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Facts about the catalogue as a whole. Public and read-only. */
@RestController
@RequestMapping("/api/v1/catalogue")
class CatalogueController {

    private final CatalogueStatsService stats;

    CatalogueController(CatalogueStatsService stats) {
        this.stats = stats;
    }

    @GetMapping("/stats")
    ResponseEntity<CatalogueStatsResponse> stats() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(CatalogueStatsResponse.from(stats.current()));
    }
}
