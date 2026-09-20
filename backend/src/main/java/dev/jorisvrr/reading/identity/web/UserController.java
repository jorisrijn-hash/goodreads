package dev.jorisvrr.reading.identity.web;

import dev.jorisvrr.reading.identity.*;
import dev.jorisvrr.reading.identity.web.dto.SignupRequest;
import dev.jorisvrr.reading.identity.web.dto.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
class UserController {

    private final UserService users;
    private final SessionService sessions;
    private final AppUserDetailsService userDetails;

    UserController(UserService users, SessionService sessions, AppUserDetailsService userDetails) {
        this.users = users;
        this.sessions = sessions;
        this.userDetails = userDetails;
    }

    /**
     * Creates an account and signs the new reader straight in. Making someone log in
     * immediately after choosing a password is pure friction — the account was just
     * proven to belong to them.
     */
    @PostMapping
    ResponseEntity<UserResponse> signUp(@Valid @RequestBody SignupRequest request,
                                        HttpServletRequest httpRequest,
                                        HttpServletResponse httpResponse) {
        User user = users.signUp(request.email(), request.username(), request.password(), null);
        sessions.signInTrusted(userDetails.loadUserByUsername(user.getEmail()),
                httpRequest, httpResponse);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
    }
}
