package dev.jorisvrr.reading.identity.web.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Login input. Deliberately not annotated with {@code @Email} or a size constraint:
 * validating the shape of a submitted credential tells an attacker which values are
 * worth trying. Anything that does not match an account fails identically.
 */
public record LoginRequest(

        @NotBlank(message = "Email is required.")
        String email,

        @NotBlank(message = "Password is required.")
        String password) {
}
