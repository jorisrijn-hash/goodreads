package dev.jorisvrr.reading.identity;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The cookie and CSRF lifecycle over real HTTP.
 *
 * <p>MockMvc short-circuits parts of the servlet stack — Spring Session's filter and the
 * real cookie jar among them — so the behaviour that matters most here (rotation on
 * authentication, a session surviving a refresh, a logged-out cookie being refused) is
 * verified against an actual server port instead.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthHttpLifecycleTest {

    @LocalServerPort int port;
    @Autowired UserRepository users;

    private static final String PASSWORD = "a-long-enough-password";

    /** A minimal cookie jar: enough to behave like a browser across requests. */
    private final List<String> cookies = new ArrayList<>();

    private RestClient client() {
        return RestClient.builder().baseUrl("http://localhost:" + port).build();
    }

    @BeforeEach
    void reset() {
        cookies.clear();
        users.findAll().stream().filter(u -> !u.isDemo()).forEach(users::delete);
    }

    private String cookieHeader() {
        return String.join("; ", cookies);
    }

    private String cookieValue(String name) {
        return cookies.stream()
                .filter(c -> c.startsWith(name + "="))
                .map(c -> c.substring(name.length() + 1))
                .findFirst().orElse(null);
    }

    private void absorb(HttpHeaders headers) {
        for (String setCookie : headers.getOrDefault(HttpHeaders.SET_COOKIE, List.of())) {
            String pair = setCookie.split(";", 2)[0];
            String name = pair.split("=", 2)[0];
            cookies.removeIf(c -> c.startsWith(name + "="));
            cookies.add(pair);
        }
    }

    private ResponseEntity<String> send(HttpMethod method, String path, String body) {
        var spec = client().method(method).uri(path)
                .header(HttpHeaders.COOKIE, cookieHeader());
        String token = cookieValue("XSRF-TOKEN");
        if (token != null) {
            spec = spec.header("X-XSRF-TOKEN", token);
        }
        if (body != null) {
            spec = spec.contentType(MediaType.APPLICATION_JSON).body(body);
        }
        ResponseEntity<String> response = spec
                .retrieve().onStatus(status -> true, (req, res) -> { })
                .toEntity(String.class);
        absorb(response.getHeaders());
        return response;
    }

    private void primeCsrf() {
        send(HttpMethod.GET, "/api/v1/csrf", null);
    }

    private ResponseEntity<String> signUp() {
        primeCsrf();
        return send(HttpMethod.POST, "/api/v1/users", """
                {"email":"joris@example.com","username":"joris","password":"%s"}
                """.formatted(PASSWORD));
    }

    @Test
    @DisplayName("authenticating replaces the CSRF token it was given")
    void csrfTokenIsRotatedOnAuthentication() {
        primeCsrf();
        String beforeAuth = cookieValue("XSRF-TOKEN");
        assertThat(beforeAuth).isNotNull();

        ResponseEntity<String> response = send(HttpMethod.POST, "/api/v1/users", """
                {"email":"joris@example.com","username":"joris","password":"%s"}
                """.formatted(PASSWORD));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        assertThat(cookieValue("XSRF-TOKEN"))
                .as("a token obtained before login must not remain valid afterwards")
                .isNotNull()
                .isNotEqualTo(beforeAuth);
    }

    @Test
    @DisplayName("the session cookie is HttpOnly and SameSite=Lax over the wire")
    void sessionCookieAttributes() {
        ResponseEntity<String> response = signUp();

        String setCookie = response.getHeaders().getOrDefault(HttpHeaders.SET_COOKIE, List.of())
                .stream().filter(c -> c.startsWith("GRSESSION=")).findFirst().orElseThrow();

        assertThat(setCookie).contains("HttpOnly").contains("SameSite=Lax").contains("Path=/");
    }

    @Test
    @DisplayName("a refresh keeps the reader signed in")
    void sessionSurvivesSubsequentRequests() {
        assertThat(signUp().getStatusCode()).isEqualTo(HttpStatus.CREATED);

        for (int i = 0; i < 3; i++) {
            assertThat(send(HttpMethod.GET, "/api/v1/me", null).getStatusCode())
                    .isEqualTo(HttpStatus.OK);
        }
    }

    @Test
    void logoutMakesTheExistingCookieUseless() {
        signUp();
        String sessionCookie = cookieValue("GRSESSION");

        assertThat(send(HttpMethod.DELETE, "/api/v1/auth/session", null).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);

        // Put the old cookie back, exactly as a stale browser tab would.
        cookies.removeIf(c -> c.startsWith("GRSESSION="));
        cookies.add("GRSESSION=" + sessionCookie);

        assertThat(send(HttpMethod.GET, "/api/v1/me", null).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void demoSessionWorksOverHttp() {
        primeCsrf();
        ResponseEntity<String> response = send(HttpMethod.POST, "/api/v1/auth/demo-session", null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains(DemoAccountSeeder.DEMO_USERNAME);
        assertThat(send(HttpMethod.GET, "/api/v1/me", null).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void aStateChangingRequestWithoutTheCsrfHeaderIsRejected() {
        primeCsrf();
        ResponseEntity<String> response = client().post().uri("/api/v1/users")
                .header(HttpHeaders.COOKIE, cookieHeader())   // cookie present, header absent
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"email":"joris@example.com","username":"joris","password":"%s"}
                        """.formatted(PASSWORD))
                .retrieve().onStatus(status -> true, (req, res) -> { })
                .toEntity(String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(users.findByEmail("joris@example.com")).isEmpty();
    }
}
