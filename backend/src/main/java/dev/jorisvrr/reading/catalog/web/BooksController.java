package dev.jorisvrr.reading.catalog.web;

import dev.jorisvrr.reading.catalog.BookSearchQuery;
import dev.jorisvrr.reading.catalog.CatalogueRepository;
import dev.jorisvrr.reading.catalog.web.dto.BookDetailResponse;
import dev.jorisvrr.reading.catalog.web.dto.BookSummaryResponse;
import dev.jorisvrr.reading.catalog.web.dto.PageResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

/** Public catalogue. No authentication: browsing and searching are open. */
@RestController
@RequestMapping("/api/v1/books")
@org.springframework.validation.annotation.Validated
class BooksController {

    private final CatalogueRepository catalogue;

    BooksController(CatalogueRepository catalogue) {
        this.catalogue = catalogue;
    }

    /**
     * Discovery and search share one endpoint, because they are one product surface:
     * without {@code q} this browses, with {@code q} it searches.
     */
    @GetMapping
    ResponseEntity<PageResponse<BookSummaryResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) @Min(0) Integer minPages,
            @RequestParam(required = false) @Max(5000) Integer maxPages,
            @RequestParam(required = false) BookSearchQuery.Sort sort,
            // Bounded so page * size cannot overflow into a negative OFFSET. Far past the
            // last page of any catalogue this size; beyond it is an empty page, not an error.
            @RequestParam(defaultValue = "0") @Min(0) @Max(10_000) int page,
            @RequestParam(defaultValue = "24") @Min(1) int size) {

        BookSearchQuery query =
                new BookSearchQuery(q, genre, minPages, maxPages, sort, page, size);
        CatalogueRepository.SearchResult result = catalogue.search(query);

        PageResponse<BookSummaryResponse> body = PageResponse.of(
                result.books().stream().map(BookSummaryResponse::from).toList(),
                query.page(), query.size(), result.total(), result.correctedFrom());

        // The catalogue is rebuilt by an offline job, never by a request, so results are
        // safe to cache briefly at the edge.
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(body);
    }

    @GetMapping("/{slug}")
    ResponseEntity<BookDetailResponse> detail(@PathVariable String slug) {
        return catalogue.findBySlug(slug)
                .map(BookDetailResponse::from)
                .map(book -> ResponseEntity.ok()
                        .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                        .body(book))
                .orElseThrow(() -> new ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "No such book"));
    }
}
