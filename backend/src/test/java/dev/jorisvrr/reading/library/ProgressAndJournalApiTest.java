package dev.jorisvrr.reading.library;

import dev.jorisvrr.reading.identity.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Reading progress and the journal, against the real catalogue, a real session and a
 * real database.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProgressAndJournalApiTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcClient db;
    @Autowired UserRepository users;

    private static final String PASSWORD = "a-long-enough-password";
    private String slug;
    private String otherSlug;
    private int pages;

    @BeforeEach
    void setUp() {
        // Progress and events cascade with the library item.
        db.sql("DELETE FROM library_item").update();
        users.findAll().stream().filter(u -> !u.isDemo()).forEach(users::delete);

        Long books = db.sql("SELECT count(*) FROM book").query(Long.class).single();
        assumeTrue(books != null && books > 1000, "catalogue not ingested");
        var rows = db.sql("SELECT slug, page_count FROM book WHERE page_count > 0 ORDER BY id LIMIT 2")
                .query((rs, n) -> new String[] { rs.getString(1), rs.getString(2) }).list();
        slug = rows.get(0)[0];
        pages = Integer.parseInt(rows.get(0)[1]);
        otherSlug = rows.get(1)[0];
    }

    private Cookie signIn(String who) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/users").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s@example.com","username":"%s","password":"%s"}
                                """.formatted(who, who, PASSWORD)))
                .andExpect(status().isCreated())
                .andReturn();
        return result.getResponse().getCookie("GRSESSION");
    }

    /** Saving a book as Currently Reading: 201 the first time, 200 if it was already saved. */
    private void start(Cookie session, String bookSlug) throws Exception {
        mvc.perform(put("/api/v1/me/library/" + bookSlug).with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"CURRENTLY_READING"}"""))
                .andExpect(status().is2xxSuccessful());
    }

    private long rowsFor(String table) {
        Long count = db.sql("SELECT count(*) FROM " + table).query(Long.class).single();
        return count == null ? 0 : count;
    }

    // ------------------------------------------------------------------ security --

    @Test
    @DisplayName("progress and journal require a session")
    void requiresSession() throws Exception {
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"page\":10}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me/journal")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("recording progress without a CSRF token is refused")
    void requiresCsrf() throws Exception {
        Cookie session = signIn("csrf_progress");
        start(session, slug);
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"page\":10}"))
                .andExpect(status().isForbidden());
        assertThat(rowsFor("progress_update")).isZero();
    }

    @Test
    @DisplayName("one reader cannot record progress on another reader's book, or read their journal")
    void ownership() throws Exception {
        Cookie mine = signIn("owner_progress");
        Cookie theirs = signIn("stranger_progress");
        start(mine, slug);
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(mine)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"page\":10}"))
                .andExpect(status().isCreated());

        // The stranger has not saved this book: it is simply not in their library.
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(theirs)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"page\":10}"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/me/journal").cookie(theirs))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    // ---------------------------------------------------------------- recording --

    @Test
    @DisplayName("a page becomes a position, a percentage and one history entry")
    void recordsProgress() throws Exception {
        Cookie session = signIn("reader_progress");
        start(session, slug);

        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"page\":%d}".formatted(pages / 2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.libraryItem.currentPage").value(pages / 2))
                .andExpect(jsonPath("$.libraryItem.progressPercent").value(LibraryItem.percentFor(pages / 2, pages)))
                .andExpect(jsonPath("$.libraryItem.progressUpdatedAt").isNotEmpty())
                .andExpect(jsonPath("$.progressUpdate.page").value(pages / 2))
                .andExpect(jsonPath("$.progressUpdate.note").isEmpty());
        assertThat(rowsFor("progress_update")).isEqualTo(1);
    }

    @Test
    @DisplayName("the same page again changes nothing; with a note it is a real entry")
    void samePage() throws Exception {
        Cookie session = signIn("same_page");
        start(session, slug);
        String body = "{\"page\":100}";
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());

        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progressUpdate").isEmpty());
        assertThat(rowsFor("progress_update")).isEqualTo(1);

        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"page\":100,\"note\":\"Slow going, but it is starting to turn.\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.progressUpdate.note").value("Slow going, but it is starting to turn."));
        assertThat(rowsFor("progress_update")).isEqualTo(2);
    }

    @Test
    @DisplayName("going backwards is allowed, and recorded rather than hidden")
    void backwards() throws Exception {
        Cookie session = signIn("backwards");
        start(session, slug);
        for (int page : new int[] { 183, 150 }) {
            mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                            .contentType(MediaType.APPLICATION_JSON).content("{\"page\":%d}".formatted(page)))
                    .andExpect(status().isCreated());
        }
        mvc.perform(get("/api/v1/me/library/" + slug).cookie(session))
                .andExpect(jsonPath("$.currentPage").value(150));
        assertThat(rowsFor("progress_update")).isEqualTo(2);
    }

    @Test
    @DisplayName("progress is refused unless the book is being read")
    void onlyWhileReading() throws Exception {
        Cookie session = signIn("not_reading");
        mvc.perform(put("/api/v1/me/library/" + slug).with(csrf()).cookie(session)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isCreated());

        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"page\":10}"))
                .andExpect(status().isConflict());
        // The book stays where it was: a page number never starts a book.
        mvc.perform(get("/api/v1/me/library/" + slug).cookie(session))
                .andExpect(jsonPath("$.status").value("WANT_TO_READ"))
                .andExpect(jsonPath("$.currentPage").isEmpty());
    }

    @Test
    @DisplayName("a page past the end, a missing page and an over-long note are all refused")
    void validation() throws Exception {
        Cookie session = signIn("validation_progress");
        start(session, slug);

        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"page\":%d}".formatted(pages + 1)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"page\":-1}"))
                .andExpect(status().isBadRequest());
        // This book has a page count, so a percentage is not the input.
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"percent\":40}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"page\":10,\"note\":\"%s\"}".formatted("x".repeat(1001))))
                .andExpect(status().isBadRequest());
        assertThat(rowsFor("progress_update")).isZero();
    }

    @Test
    @DisplayName("notes are turned off on the shared demo account, progress is not")
    void demoNotes() throws Exception {
        MvcResult demo = mvc.perform(post("/api/v1/auth/demo-session").with(csrf()))
                .andExpect(status().isOk()).andReturn();
        Cookie session = demo.getResponse().getCookie("GRSESSION");
        start(session, slug);

        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"page\":20,\"note\":\"private thought\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"page\":20}"))
                .andExpect(status().isCreated());

        // Leave the shared account as it was found.
        mvc.perform(delete("/api/v1/me/library/" + slug).with(csrf()).cookie(session))
                .andExpect(status().isNoContent());
    }

    // ------------------------------------------------------------------ journal --

    @Test
    @DisplayName("the journal is the reader's own history, newest first, events and progress together")
    void journal() throws Exception {
        Cookie session = signIn("journal_reader");
        mvc.perform(put("/api/v1/me/library/" + slug).with(csrf()).cookie(session)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isCreated());
        start(session, slug);
        mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                .contentType(MediaType.APPLICATION_JSON).content("{\"page\":183}")).andExpect(status().isCreated());
        mvc.perform(patch("/api/v1/me/library/" + slug).with(csrf()).cookie(session)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"READ\"}")).andExpect(status().isOk());

        mvc.perform(get("/api/v1/me/journal").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(4))
                .andExpect(jsonPath("$.items[0].event").value("FINISHED"))
                .andExpect(jsonPath("$.items[0].fromStatus").value("CURRENTLY_READING"))
                .andExpect(jsonPath("$.items[0].book.slug").value(slug))
                .andExpect(jsonPath("$.items[1].kind").value("PROGRESS"))
                .andExpect(jsonPath("$.items[1].page").value(183))
                .andExpect(jsonPath("$.items[1].pageCount").value(pages))
                .andExpect(jsonPath("$.items[2].event").value("STARTED"))
                .andExpect(jsonPath("$.items[3].event").value("SAVED"))
                .andExpect(jsonPath("$.items[3].fromStatus").isEmpty())
                .andExpect(jsonPath("$.nextCursor").isEmpty());
    }

    @Test
    @DisplayName("the journal pages with a cursor, and can be narrowed to one book")
    void journalPaging() throws Exception {
        Cookie session = signIn("journal_paging");
        start(session, slug);
        start(session, otherSlug);
        for (int page : new int[] { 10, 20, 30 }) {
            mvc.perform(post("/api/v1/me/library/" + slug + "/progress").with(csrf()).cookie(session)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"page\":%d}".formatted(page)))
                    .andExpect(status().isCreated());
        }

        MvcResult first = mvc.perform(get("/api/v1/me/journal").param("limit", "2").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.nextCursor").isNotEmpty())
                .andReturn();
        String cursor = com.jayway.jsonpath.JsonPath.read(first.getResponse().getContentAsString(), "$.nextCursor");
        String firstId = com.jayway.jsonpath.JsonPath.read(first.getResponse().getContentAsString(), "$.items[0].id");

        MvcResult second = mvc.perform(get("/api/v1/me/journal").param("limit", "2")
                        .param("before", cursor).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andReturn();
        assertThat(second.getResponse().getContentAsString()).doesNotContain("\"" + firstId + "\"");

        // One book's history only: three progress entries and its STARTED event.
        mvc.perform(get("/api/v1/me/journal").param("book", slug).cookie(session))
                .andExpect(jsonPath("$.items.length()").value(4));
        mvc.perform(get("/api/v1/me/journal").param("before", "not-a-cursor").cookie(session))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("an unchanged status writes no event at all")
    void sameStatusWritesNothing() throws Exception {
        Cookie session = signIn("same_status");
        start(session, slug);
        mvc.perform(patch("/api/v1/me/library/" + slug).with(csrf()).cookie(session)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CURRENTLY_READING\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/me/journal").cookie(session))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].event").value("STARTED"));
    }
}
