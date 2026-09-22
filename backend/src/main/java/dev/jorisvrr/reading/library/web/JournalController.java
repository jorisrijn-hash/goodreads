package dev.jorisvrr.reading.library.web;

import dev.jorisvrr.reading.identity.AppUserDetails;
import dev.jorisvrr.reading.library.ReadingJournal;
import dev.jorisvrr.reading.library.web.dto.JournalResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The reader's private reading journal.
 *
 * <p>Under {@code /api/v1/me}, so a session is required, and every row is reached
 * through the reader's own library items. Nothing here is public, shared or social.
 */
@RestController
@RequestMapping("/api/v1/me/journal")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class JournalController {

    private final ReadingJournal journal;

    JournalController(ReadingJournal journal) {
        this.journal = journal;
    }

    /**
     * A page of the journal, newest first. {@code before} is the cursor from the previous
     * page; {@code book} narrows it to one book's history.
     */
    @GetMapping
    JournalResponse read(@AuthenticationPrincipal AppUserDetails reader,
                         @RequestParam(required = false) String before,
                         @RequestParam(required = false) Integer limit,
                         @RequestParam(required = false) String book) {
        return JournalResponse.from(journal.read(reader.getUserId(), before, limit, book));
    }
}
