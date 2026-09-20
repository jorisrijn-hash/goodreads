package dev.jorisvrr.reading.identity.web;

import dev.jorisvrr.reading.identity.*;
import dev.jorisvrr.reading.identity.web.dto.LoginRequest;
import dev.jorisvrr.reading.identity.web.dto.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * The session is the resource: creating one is logging in, deleting it is logging out.
 */
@RestController
@RequestMapping("/api/v1/auth")
class SessionController {

    private final SessionService sessions;
    private final UserRepository users;
    private final AppUserDetailsService userDetails;

    SessionController(SessionService sessions, UserRepository users,
                      AppUserDetailsService userDetails) {
        this.sessions = sessions;
        this.users = users;
        this.userDetails = userDetails;
    }

    @PostMapping("/session")
    ResponseEntity<UserResponse> logIn(@Valid @RequestBody LoginRequest request,
                                       HttpServletRequest httpRequest,
                                       HttpServletResponse httpResponse) {
        Authentication authentication =
                sessions.signIn(request.email(), request.password(), httpRequest, httpResponse);
        return ResponseEntity.ok(UserResponse.from(currentUser(authentication)));
    }

    /**
     * Enters the demo account without a password.
     *
     * <p>A shared demo password would be a real credential that works from anywhere and
     * would inevitably leak. Instead the server authenticates a known, non-privileged
     * identity flagged {@code is_demo}, and no password for it is ever issued. The
     * account is created with an unusable hash, so the normal login path cannot reach it.
     */
    @PostMapping("/demo-session")
    ResponseEntity<UserResponse> enterDemo(HttpServletRequest httpRequest,
                                           HttpServletResponse httpResponse) {
        Authentication authentication =
                sessions.signInTrusted(userDetails.loadDemoUser(), httpRequest, httpResponse);
        return ResponseEntity.ok(UserResponse.from(currentUser(authentication)));
    }

    @DeleteMapping("/session")
    ResponseEntity<Void> logOut(HttpServletRequest httpRequest) {
        sessions.signOut(httpRequest);
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Authentication authentication) {
        AppUserDetails principal = (AppUserDetails) authentication.getPrincipal();
        return users.findById(principal.getUserId()).orElseThrow();
    }
}
