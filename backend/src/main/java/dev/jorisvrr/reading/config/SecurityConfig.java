package dev.jorisvrr.reading.config;

import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Checkpoint A security posture: the catalogue and health endpoints are public,
 * everything else is denied. Real session authentication arrives in Checkpoint C.
 *
 * <p>This class exists from the first commit so the application has an explicit,
 * reviewable stance rather than relying on framework defaults.
 */
@Configuration
class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // CSRF is disabled only while the API is unauthenticated. It is
                // re-enabled in Checkpoint C when cookie-based sessions arrive,
                // because cookie auth is exactly what CSRF protection guards.
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Spring dispatches errors as a separate internal request.
                        // Without this, `anyRequest().denyAll()` intercepts the
                        // ERROR dispatch and every 404 is reported to the client
                        // as 403, which would make the error contract unusable.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers("/actuator/health/**").permitAll()
                        .requestMatchers("/api/v1/books/**").permitAll()
                        .anyRequest().denyAll())
                .build();
    }

    /**
     * Argon2id. Deliberately chosen over BCrypt: it is memory-hard and is the
     * current OWASP recommendation for new applications.
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }
}
