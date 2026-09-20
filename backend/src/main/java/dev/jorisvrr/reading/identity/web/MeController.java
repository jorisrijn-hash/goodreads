package dev.jorisvrr.reading.identity.web;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import dev.jorisvrr.reading.identity.AppUserDetails;
import dev.jorisvrr.reading.identity.UserRepository;
import dev.jorisvrr.reading.identity.web.dto.UserResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Authentication only exists in the web application. The ingest task runs with
// web-application-type=none, where AuthenticationManager is not created.
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@RestController
@RequestMapping("/api/v1/me")
class MeController {

    private final UserRepository users;

    MeController(UserRepository users) {
        this.users = users;
    }

    /**
     * The current reader. Reached only with a valid session — Spring Security denies it
     * otherwise, so there is no null principal to handle here.
     */
    @GetMapping
    ResponseEntity<UserResponse> me(@AuthenticationPrincipal AppUserDetails principal) {
        return users.findById(principal.getUserId())
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
