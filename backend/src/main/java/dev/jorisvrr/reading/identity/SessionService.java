package dev.jorisvrr.reading.identity;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

/**
 * Establishes and destroys authenticated sessions.
 *
 * <p>Authentication happens through Spring Security's {@code AuthenticationManager}
 * rather than by comparing hashes here, so password checking, encoder upgrades and the
 * generic failure behaviour all stay in one place.
 *
 * <p>The session id is rotated on every successful authentication. Without that, a
 * session id an attacker planted before login would remain valid afterwards — session
 * fixation. Spring's form-login filter does this automatically; a programmatic login
 * must do it explicitly.
 */
// Authentication only exists in the web application. The ingest task runs with
// web-application-type=none, where AuthenticationManager is not created.
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Service
public class SessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);

    private final org.springframework.security.authentication.AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy contextHolder =
            SecurityContextHolder.getContextHolderStrategy();
    private final SessionAuthenticationStrategy sessionStrategy;
    private final CsrfTokenRepository csrfTokenRepository;

    public SessionService(
            org.springframework.security.authentication.AuthenticationManager authenticationManager,
            CsrfTokenRepository csrfTokenRepository) {
        this.authenticationManager = authenticationManager;
        // Two things must change the moment someone authenticates:
        //   1. the session id, or a session an attacker planted beforehand stays valid
        //      (session fixation);
        //   2. the CSRF token, or a token an attacker obtained pre-login remains usable
        //      against the now-authenticated session (CSRF token fixation).
        // Spring's form-login filter applies both automatically. A programmatic login
        // has to ask for them.
        this.csrfTokenRepository = csrfTokenRepository;
        this.sessionStrategy = new ChangeSessionIdAuthenticationStrategy();
    }

    /**
     * Verifies credentials and starts a session.
     *
     * @throws org.springframework.security.core.AuthenticationException on any failure —
     *         unknown account and wrong password are indistinguishable by design
     */
    public Authentication signIn(String email, String password,
                                 HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        User.normaliseEmail(email), password));
        establish(authentication, request, response);
        return authentication;
    }

    /**
     * Starts a session for an already-trusted principal, without a password. Used for
     * signup (the account was just created) and for the demo account (which has no
     * shareable password by design).
     */
    public Authentication signInTrusted(UserDetails principal,
                                        HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication =
                UsernamePasswordAuthenticationToken.authenticated(principal, null,
                        principal.getAuthorities());
        establish(authentication, request, response);
        return authentication;
    }

    private void establish(Authentication authentication,
                           HttpServletRequest request, HttpServletResponse response) {
        sessionStrategy.onAuthentication(authentication, request, response);
        rotateCsrfToken(request, response);

        SecurityContext context = contextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        contextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        log.info("session established: principal={}", authentication.getName());
    }

    /**
     * Issues a fresh CSRF token bound to the new session.
     *
     * <p>Done explicitly rather than through {@code CsrfAuthenticationStrategy}: that
     * class clears the old token and defers writing the replacement until something
     * reads it, which in a JSON login leaves the client holding no token at all and
     * makes its next request fail. Generating and saving here guarantees the cookie is
     * on the response.
     */
    private void rotateCsrfToken(HttpServletRequest request, HttpServletResponse response) {
        CsrfToken fresh = csrfTokenRepository.generateToken(request);
        csrfTokenRepository.saveToken(fresh, request, response);
        request.setAttribute(CsrfToken.class.getName(), fresh);
        request.setAttribute(fresh.getParameterName(), fresh);
    }

    /** Invalidates the server-side session and clears the security context. */
    public void signOut(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        contextHolder.clearContext();
        log.info("session invalidated");
    }
}
