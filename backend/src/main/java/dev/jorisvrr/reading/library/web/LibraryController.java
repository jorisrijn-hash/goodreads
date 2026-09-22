package dev.jorisvrr.reading.library.web;

import dev.jorisvrr.reading.identity.AppUserDetails;
import dev.jorisvrr.reading.library.LibraryService;
import dev.jorisvrr.reading.library.ReadingStatus;
import dev.jorisvrr.reading.library.web.dto.*;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * The reader's own library.
 *
 * <p>Under {@code /api/v1/me}, which Spring Security already requires a session for, and
 * the reader's id comes from the authenticated principal on every call. The client names
 * a book; it never names a user.
 */
@RestController
@RequestMapping("/api/v1/me/library")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class LibraryController {

    private final LibraryService library;

    LibraryController(LibraryService library) {
        this.library = library;
    }

    @GetMapping
    List<LibraryEntryResponse> list(@AuthenticationPrincipal AppUserDetails reader,
                                    @RequestParam(required = false) ReadingStatus status,
                                    @RequestParam(required = false) String q) {
        return library.list(reader.getUserId(), status, q).stream()
                .map(LibraryEntryResponse::from)
                .toList();
    }

    @GetMapping("/summary")
    LibrarySummaryResponse summary(@AuthenticationPrincipal AppUserDetails reader) {
        return LibrarySummaryResponse.from(library.counts(reader.getUserId()));
    }

    /** What the reader has saved for one book, if anything. Used by Book Detail. */
    @GetMapping("/{slug}")
    ResponseEntity<LibraryEntryResponse> one(@AuthenticationPrincipal AppUserDetails reader,
                                             @PathVariable String slug) {
        return library.find(reader.getUserId(), slug)
                .map(LibraryEntryResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Saves a book. Idempotent: saving one already in the library updates it rather than
     * failing, because a reader tapping twice has not made a mistake.
     */
    @PutMapping("/{slug}")
    ResponseEntity<LibraryEntryResponse> save(@AuthenticationPrincipal AppUserDetails reader,
                                              @PathVariable String slug,
                                              @Valid @RequestBody(required = false) SaveBookRequest request) {
        SaveBookRequest body = request == null
                ? new SaveBookRequest(null, null, null)
                : request;

        boolean isNew = library.find(reader.getUserId(), slug).isEmpty();
        LibraryService.Entry entry = library.save(reader.getUserId(), slug,
                body.statusOrDefault(), body.saveReason(), body.saveNote());

        return ResponseEntity.status(isNew ? HttpStatus.CREATED : HttpStatus.OK)
                .body(LibraryEntryResponse.from(entry));
    }

    /** Changes status, or adds the reason and note after the fact. */
    @PatchMapping("/{slug}")
    LibraryEntryResponse update(@AuthenticationPrincipal AppUserDetails reader,
                                @PathVariable String slug,
                                @Valid @RequestBody UpdateLibraryItemRequest request) {
        LibraryService.Entry entry = null;
        if (request.status() != null) {
            entry = library.updateStatus(reader.getUserId(), slug, request.status());
        }
        if (request.saveReason() != null || request.saveNote() != null
                || Boolean.TRUE.equals(request.clearSaveDetails())) {
            entry = library.describe(reader.getUserId(), slug,
                    request.saveReason(), request.saveNote());
        }
        // Nothing to change is not an error; return the current state.
        return LibraryEntryResponse.from(
                entry != null ? entry : library.find(reader.getUserId(), slug).orElseThrow(
                        () -> new org.springframework.web.server.ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Not in your library")));
    }

    /**
     * Records where the reader has got to, and returns both the book's state now and the
     * history entry that was written (null when the same page was sent again with no
     * note, which changes nothing).
     *
     * <p>Notes are refused on the shared demo account: everyone who opens the demo sees
     * the same library, and a private note there would not be private.
     */
    @PostMapping("/{slug}/progress")
    ResponseEntity<ProgressResponse> recordProgress(@AuthenticationPrincipal AppUserDetails reader,
                                                    @PathVariable String slug,
                                                    @Valid @RequestBody RecordProgressRequest request) {
        LibraryService.Progress progress = library.recordProgress(reader.getUserId(), slug,
                request.page(), request.percent(), request.note(), !reader.isDemo());
        return ResponseEntity.status(progress.update() == null ? HttpStatus.OK : HttpStatus.CREATED)
                .body(ProgressResponse.from(progress));
    }

    @DeleteMapping("/{slug}")
    ResponseEntity<Void> remove(@AuthenticationPrincipal AppUserDetails reader,
                                @PathVariable String slug) {
        library.remove(reader.getUserId(), slug);
        return ResponseEntity.noContent().build();
    }
}
