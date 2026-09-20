package dev.jorisvrr.reading.identity;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import jakarta.servlet.http.Cookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Authentication against the real goodreads_test database — real Argon2id hashing, real
 * constraints, real session handling. See docs/decisions/0005 for why not Testcontainers.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwordEncoder;

    private static final String PASSWORD = "a-long-enough-password";

    @BeforeEach
    void clearNonDemoUsers() {
        users.findAll().stream().filter(u -> !u.isDemo()).forEach(users::delete);
    }

    private MockHttpServletRequestBuilder json(String path, String body) {
        return post(path).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    /**
     * Spring Session wraps the request, so the mock request's own HttpSession is not
     * where the session lives. Driving the tests by cookie is both correct here and
     * closer to what a browser actually does.
     */
    private Cookie sessionCookie(MvcResult result) {
        Cookie cookie = result.getResponse().getCookie("GRSESSION");
        assertThat(cookie).as("authentication must set the session cookie").isNotNull();
        return cookie;
    }

    private MvcResult signUpAndGetResult(String email, String username) throws Exception {
        return mvc.perform(json("/api/v1/users", signupBody(email, username)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private String signupBody(String email, String username) {
        return """
                {"email":"%s","username":"%s","password":"%s"}
                """.formatted(email, username, PASSWORD);
    }

    // ---------------------------------------------------------------- signup --

    @Test
    void signupCreatesAnAccountAndSignsTheUserIn() throws Exception {
        MvcResult result = mvc.perform(json("/api/v1/users", signupBody("joris@example.com", "joris")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("joris"))
                .andExpect(jsonPath("$.displayName").value("joris"))
                .andExpect(jsonPath("$.demo").value(false))
                .andReturn();

        // The response must carry a session, or the reader would have to log in again
        // immediately after signing up.
        Cookie session = sessionCookie(result);
        mvc.perform(get("/api/v1/me").cookie(session)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("the password is Argon2id hashed and never echoed back")
    void passwordIsHashedAndNeverReturned() throws Exception {
        String body = mvc.perform(json("/api/v1/users", signupBody("joris@example.com", "joris")))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain(PASSWORD).doesNotContain("password");

        User user = users.findByEmail("joris@example.com").orElseThrow();
        assertThat(user.getPasswordHash()).startsWith("$argon2id$").isNotEqualTo(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, user.getPasswordHash())).isTrue();
    }

    @Test
    void emailIsNormalisedToLowercase() throws Exception {
        mvc.perform(json("/api/v1/users", signupBody("Joris@EXAMPLE.com", "joris")))
                .andExpect(status().isCreated());
        assertThat(users.findByEmail("joris@example.com")).isPresent();
    }

    @Test
    void duplicateEmailIsRejectedWithAFieldError() throws Exception {
        mvc.perform(json("/api/v1/users", signupBody("joris@example.com", "joris")))
                .andExpect(status().isCreated());

        mvc.perform(json("/api/v1/users", signupBody("joris@example.com", "someoneelse")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors.email").exists());
    }

    @Test
    @DisplayName("usernames collide case-insensitively")
    void duplicateUsernameIsRejected() throws Exception {
        mvc.perform(json("/api/v1/users", signupBody("one@example.com", "joris")))
                .andExpect(status().isCreated());

        mvc.perform(json("/api/v1/users", signupBody("two@example.com", "JORIS")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors.username").exists());
    }

    @Test
    void invalidInputIsRejectedWithPerFieldMessages() throws Exception {
        mvc.perform(json("/api/v1/users",
                        """
                        {"email":"not-an-email","username":"a","password":"short"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.username").exists())
                .andExpect(jsonPath("$.errors.password").exists());
        assertThat(users.count()).isEqualTo(1); // demo account only
    }

    // ----------------------------------------------------------------- login --

    @Test
    void loginSucceedsWithCorrectCredentials() throws Exception {
        mvc.perform(json("/api/v1/users", signupBody("joris@example.com", "joris")));

        mvc.perform(json("/api/v1/auth/session",
                        """
                        {"email":"joris@example.com","password":"%s"}
                        """.formatted(PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("joris"));
    }

    @Test
    @DisplayName("a wrong password and an unknown account fail identically")
    void loginFailuresDoNotEnumerateAccounts() throws Exception {
        mvc.perform(json("/api/v1/users", signupBody("joris@example.com", "joris")));

        String wrongPassword = mvc.perform(json("/api/v1/auth/session",
                        """
                        {"email":"joris@example.com","password":"definitely-not-it"}
                        """))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        String unknownAccount = mvc.perform(json("/api/v1/auth/session",
                        """
                        {"email":"nobody@example.com","password":"definitely-not-it"}
                        """))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(wrongPassword)
                .as("the two responses must be byte-identical or they leak which emails exist")
                .isEqualTo(unknownAccount)
                .contains("Email or password is incorrect.");
    }

    // --------------------------------------------------------------- session --

    @Test
    void meRequiresASession() throws Exception {
        mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void meReturnsTheAuthenticatedIdentity() throws Exception {
        Cookie session = sessionCookie(signUpAndGetResult("joris@example.com", "joris"));

        mvc.perform(get("/api/v1/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("joris"))
                .andExpect(jsonPath("$.id").exists());
    }

    @Test
    @DisplayName("the identity projection never carries email or credentials")
    void meDoesNotLeakSensitiveFields() throws Exception {
        Cookie session = sessionCookie(signUpAndGetResult("joris@example.com", "joris"));

        String body = mvc.perform(get("/api/v1/me").cookie(session))
                .andReturn().getResponse().getContentAsString();

        assertThat(body)
                .doesNotContain("joris@example.com")
                .doesNotContain("passwordHash")
                .doesNotContain("argon2");
    }

    @Test
    void repeatedRequestsOnTheSameSessionStayAuthenticated() throws Exception {
        Cookie session = sessionCookie(signUpAndGetResult("joris@example.com", "joris"));

        // Stands in for a page refresh: same cookie, new request, still authenticated.
        for (int i = 0; i < 3; i++) {
            mvc.perform(get("/api/v1/me").cookie(session)).andExpect(status().isOk());
        }
    }

    @Test
    void logoutInvalidatesTheSession() throws Exception {
        Cookie session = sessionCookie(signUpAndGetResult("joris@example.com", "joris"));

        mvc.perform(delete("/api/v1/auth/session").with(csrf()).cookie(session))
                .andExpect(status().isNoContent());

        // The cookie value still exists client-side; the server must no longer honour it.
        mvc.perform(get("/api/v1/me").cookie(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRequiresAuthentication() throws Exception {
        mvc.perform(delete("/api/v1/auth/session").with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    // --------------------------------------------------------- authorization --

    @Test
    @DisplayName("personal resources stay denied by default as new ones are added")
    void personalResourcesAreDeniedWithoutASession() throws Exception {
        mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me/library")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me/anything-future")).andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ CSRF --

    @Test
    void stateChangingRequestsWithoutACsrfTokenAreRejected() throws Exception {
        mvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signupBody("joris@example.com", "joris")))
                .andExpect(status().isForbidden());
        assertThat(users.count()).isEqualTo(1); // demo only; nothing was created
    }

    @Test
    @DisplayName("login is CSRF-protected too, against login-CSRF")
    void loginWithoutCsrfIsRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/session")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"joris@example.com","password":"%s"}
                                """.formatted(PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void theSameRequestWithACsrfTokenSucceeds() throws Exception {
        mvc.perform(json("/api/v1/users", signupBody("joris@example.com", "joris")))
                .andExpect(status().isCreated());
    }

    // ------------------------------------------------------------------ demo --

    @Test
    void demoSessionSignsInWithoutAPassword() throws Exception {
        mvc.perform(post("/api/v1/auth/demo-session").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(DemoAccountSeeder.DEMO_USERNAME))
                .andExpect(jsonPath("$.demo").value(true));
    }

    @Test
    @DisplayName("the demo account has no password that could ever work")
    void demoAccountCannotBeReachedThroughNormalLogin() throws Exception {
        for (String attempt : new String[]{"demo", "password", "demo-account-has-no-password",
                "{noop-unusable}demo-account-has-no-password", ""}) {
            mvc.perform(json("/api/v1/auth/session",
                            """
                            {"email":"%s","password":"%s"}
                            """.formatted(DemoAccountSeeder.DEMO_EMAIL, attempt)))
                    .andExpect(status().is4xxClientError());
        }
    }

    @Test
    @DisplayName("the session cookie is HttpOnly and SameSite=Lax")
    void sessionCookieCarriesItsSecurityAttributes() throws Exception {
        // Spring Session ignores server.servlet.session.cookie.*, so these attributes
        // come from an explicit CookieSerializer bean. Asserting them here catches a
        // silent downgrade, which is otherwise invisible until something is exploited.
        MvcResult result = signUpAndGetResult("joris@example.com", "joris");
        Cookie cookie = sessionCookie(result);

        assertThat(cookie.getName()).isEqualTo("GRSESSION");
        assertThat(cookie.isHttpOnly()).as("must be unreadable from JavaScript").isTrue();
        assertThat(cookie.getPath()).isEqualTo("/");

        String header = result.getResponse().getHeaders("Set-Cookie").stream()
                .filter(h -> h.startsWith("GRSESSION="))
                .findFirst().orElseThrow();
        assertThat(header).contains("HttpOnly").contains("SameSite=Lax");
    }

    @Test
    @DisplayName("the CSRF cookie is deliberately readable by JavaScript")
    void csrfCookieIsReadableByTheClient() throws Exception {
        MvcResult result = signUpAndGetResult("joris@example.com", "joris");
        String header = result.getResponse().getHeaders("Set-Cookie").stream()
                .filter(h -> h.startsWith("XSRF-TOKEN="))
                .findFirst().orElseThrow();
        // The frontend has to read this one to echo it back in a header; the protection
        // comes from same-origin policy, not from hiding the value.
        assertThat(header).doesNotContain("HttpOnly");
    }

    @Test
    void onlyOneDemoAccountCanExist() {
        assertThat(users.findAll().stream().filter(User::isDemo).count()).isEqualTo(1);
    }
}
