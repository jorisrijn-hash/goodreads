package dev.jorisvrr.reading.catalog.web;

import dev.jorisvrr.reading.catalog.CatalogueRepository;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/** The controlled genre taxonomy, with counts, for building browse surfaces. */
@RestController
@RequestMapping("/api/v1/genres")
class GenresController {

    private final CatalogueRepository catalogue;

    GenresController(CatalogueRepository catalogue) {
        this.catalogue = catalogue;
    }

    @GetMapping
    ResponseEntity<List<CatalogueRepository.GenreCount>> genres() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(6)).cachePublic())
                .body(catalogue.genres());
    }
}
