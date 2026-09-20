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

/** The personal library, against the real catalogue and a real session. */
@SpringBootTest
@AutoConfigureMockMvc
class LibraryApiTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JdbcClient db;

    private static final String PASSWORD = "a-long-enough-password";
    private String slug;
    private String otherSlug;

    @BeforeEach
    void setUp() {
        db.sql("DELETE FROM library_item").update();
        users.findAll().stream().filter(u -> !u.isDemo()).forEach(users::delete);

        Long books = db.sql("SELECT count(*) FROM book").query(Long.class).single();
        assumeTrue(books != null && books > 1000, "catalogue not ingested");
        var slugs = db.sql("SELECT slug FROM book ORDER BY id LIMIT 2").query(String.class).list();
        slug = slugs.get(0);
        otherSlug = slugs.get(1);
    }

    /** Signs a fresh reader in and returns their session cookie. */
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

    // -------------------------------------------------------------- authorisation --

    @Test
    void theLibraryIsDeniedWithoutASession() throws Exception {
        mvc.perform(get("/api/v1/me/library")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me/library/summary")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/me/library/{slug}", slug).with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("one reader cannot see or change another reader's library")
    void librariesAreIsolatedBetweenReaders() throws Exception {
        Cookie alice = signIn("alice");
        Cookie bob = signIn("bob");

        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(alice))
                .andExpect(status().isCreated());

        // Bob's library is empty, and the same book is not in it.
        mvc.perform(get("/api/v1/me/library").cookie(bob))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/me/library/{slug}", slug).cookie(bob))
                .andExpect(status().isNotFound());

        // Bob cannot delete Alice's row by naming the same book.
        mvc.perform(delete("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(bob))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/me/library/{slug}", slug).cookie(alice))
                .andExpect(status().isOk());
    }

    // ---------------------------------------------------------------------- saving --

    @Test
    void savingABookDefaultsToWantToRead() throws Exception {
        Cookie reader = signIn("reader");

        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("WANT_TO_READ"))
                .andExpect(jsonPath("$.book.title").isNotEmpty())
                .andExpect(jsonPath("$.book.coverKey").isNotEmpty())
                .andExpect(jsonPath("$.savedAt").isNotEmpty());
    }

    @Test
    @DisplayName("saving twice updates rather than duplicating")
    void savingIsIdempotent() throws Exception {
        Cookie reader = signIn("reader");

        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader))
                .andExpect(status().isCreated());
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/me/library").cookie(reader))
                .andExpect(jsonPath("$.length()").value(1));
        assertThat(db.sql("SELECT count(*) FROM library_item").query(Long.class).single())
                .isEqualTo(1L);
    }

    @Test
    void savingAnUnknownBookIsNotFound() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", "not-a-real-book").with(csrf()).cookie(reader))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("the save reason is optional and can be added afterwards")
    void saveReasonIsOptionalAndLateBinding() throws Exception {
        Cookie reader = signIn("reader");

        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader))
                .andExpect(jsonPath("$.saveReason").doesNotExist());

        mvc.perform(patch("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"saveReason":"RECOMMENDED","saveNote":"Sam mentioned it."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saveReason").value("RECOMMENDED"))
                .andExpect(jsonPath("$.saveNote").value("Sam mentioned it."))
                // Adding a reason must not disturb the status.
                .andExpect(jsonPath("$.status").value("WANT_TO_READ"));
    }

    @Test
    void anOverlongNoteIsRejected() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader));

        mvc.perform(patch("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"saveNote\":\"%s\"}".formatted("x".repeat(2100))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.saveNote").exists());
    }

    // ----------------------------------------------------------------- transitions --

    @Test
    @DisplayName("starting a book records when it started")
    void startingRecordsTheDate() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader))
                .andExpect(jsonPath("$.startedAt").doesNotExist());

        mvc.perform(patch("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CURRENTLY_READING\"}"))
                .andExpect(jsonPath("$.status").value("CURRENTLY_READING"))
                .andExpect(jsonPath("$.startedAt").isNotEmpty())
                .andExpect(jsonPath("$.finishedAt").doesNotExist());
    }

    @Test
    @DisplayName("a book can be finished without ever being marked as started")
    void finishingDirectlyStillRecordsBothDates() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader));

        mvc.perform(patch("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"READ\"}"))
                .andExpect(jsonPath("$.status").value("READ"))
                .andExpect(jsonPath("$.startedAt").isNotEmpty())
                .andExpect(jsonPath("$.finishedAt").isNotEmpty());
    }

    @Test
    @DisplayName("re-reading a finished book does not erase that it was finished")
    void statusChangesDoNotDestroyHistory() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader));
        mvc.perform(patch("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"READ\"}"));

        mvc.perform(patch("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CURRENTLY_READING\"}"))
                .andExpect(jsonPath("$.status").value("CURRENTLY_READING"))
                .andExpect(jsonPath("$.finishedAt").isNotEmpty());
    }

    @Test
    void didNotFinishIsARealStatus() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader));
        mvc.perform(patch("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DNF\"}"))
                .andExpect(jsonPath("$.status").value("DNF"));
    }

    @Test
    void anUnknownStatusIsRejected() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader));
        mvc.perform(patch("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ABANDONED_FOREVER\"}"))
                .andExpect(status().is4xxClientError());
    }

    // ------------------------------------------------------------ listing, removal --

    @Test
    void theLibraryFiltersByStatusAndSearchesByTitle() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader));
        mvc.perform(put("/api/v1/me/library/{slug}", otherSlug).with(csrf()).cookie(reader));
        mvc.perform(patch("/api/v1/me/library/{slug}", otherSlug).with(csrf()).cookie(reader)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"READ\"}"));

        mvc.perform(get("/api/v1/me/library").cookie(reader))
                .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/v1/me/library").param("status", "READ").cookie(reader))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("READ"));

        String title = db.sql("SELECT title FROM book WHERE slug = :s").param("s", slug)
                .query(String.class).single();
        mvc.perform(get("/api/v1/me/library").param("q", title.substring(0, 4)).cookie(reader))
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
    }

    @Test
    void theSummaryCountsEachStatus() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader));
        mvc.perform(put("/api/v1/me/library/{slug}", otherSlug).with(csrf()).cookie(reader));
        mvc.perform(patch("/api/v1/me/library/{slug}", otherSlug).with(csrf()).cookie(reader)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CURRENTLY_READING\"}"));

        mvc.perform(get("/api/v1/me/library/summary").cookie(reader))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.wantToRead").value(1))
                .andExpect(jsonPath("$.currentlyReading").value(1))
                .andExpect(jsonPath("$.read").value(0))
                .andExpect(jsonPath("$.didNotFinish").value(0));
    }

    @Test
    void removingABookTakesItOutOfTheLibrary() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader));

        mvc.perform(delete("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/me/library").cookie(reader))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(delete("/api/v1/me/library/{slug}", slug).with(csrf()).cookie(reader))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("library mutations require a CSRF token like every other state change")
    void mutationsAreCsrfProtected() throws Exception {
        Cookie reader = signIn("reader");
        mvc.perform(put("/api/v1/me/library/{slug}", slug).cookie(reader))
                .andExpect(status().isForbidden());
    }
}
