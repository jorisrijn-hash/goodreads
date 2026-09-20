package dev.jorisvrr.reading.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Primes the CSRF cookie.
 *
 * <p>Spring issues the {@code XSRF-TOKEN} cookie lazily, which leaves a first-visit
 * problem: the very first state-changing request a reader makes is usually logging in,
 * and at that point no token exists yet. The frontend calls this once before submitting
 * an unauthenticated form.
 *
 * <p>Injecting {@link CsrfToken} is what forces the token to be generated and the cookie
 * to be written; the returned value is not secret — the protection comes from the
 * same-origin policy preventing another site from reading it.
 */
@RestController
class CsrfController {

    @GetMapping("/api/v1/csrf")
    ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }
}
