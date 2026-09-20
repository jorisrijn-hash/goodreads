package dev.jorisvrr.reading.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Password hashing. Separate from {@code SecurityConfig} because it is not
 * web-specific — the ingest task runs without a servlet context.
 */
@Configuration
class PasswordConfig {

    /**
     * Argon2id: memory-hard, and the current OWASP recommendation for new
     * applications. Used from Checkpoint C onwards.
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }
}
