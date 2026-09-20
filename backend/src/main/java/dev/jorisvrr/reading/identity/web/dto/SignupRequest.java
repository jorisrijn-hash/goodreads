package dev.jorisvrr.reading.identity.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Signup input.
 *
 * <p>Password policy is length-based rather than composition-based. A 10-character
 * passphrase is stronger and far more memorable than an 8-character one forced to
 * contain an uppercase letter, a digit and a symbol, and composition rules mostly push
 * people toward predictable substitutions. Argon2id does the rest.
 *
 * <p>Display name is not requested. It derives from the username, because signup should
 * not be onboarding.
 */
public record SignupRequest(

        @NotBlank(message = "Email is required.")
        @Email(message = "Enter a valid email address.")
        @Size(max = 254, message = "That email address is too long.")
        String email,

        @NotBlank(message = "Username is required.")
        @Pattern(regexp = "^[A-Za-z0-9_]{3,30}$",
                message = "Use 3-30 letters, numbers or underscores.")
        String username,

        @NotBlank(message = "Password is required.")
        @Size(min = 10, max = 200, message = "Use at least 10 characters.")
        String password) {
}
