package dev.jorisvrr.reading.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Refuses to run outside local development with the documented development password.
 *
 * <p>The base configuration already has no credential fallback, so this cannot normally
 * happen. It exists because the failure it guards against is silent and serious: a
 * deployment that forgets {@code DATABASE_PASSWORD} should stop, not quietly come up
 * using a password published in {@code .env.example}.
 */
@Component
class CredentialGuard implements ApplicationListener<ApplicationReadyEvent> {

    /** The value in .env.example and scripts/setup-db.sh. */
    private static final String LOCAL_DEV_PASSWORD = "goodreads_dev";
    private static final List<String> LOCAL_PROFILES = List.of("local", "test");

    private final Environment environment;
    private final String password;

    CredentialGuard(Environment environment,
                    @Value("${spring.datasource.password:}") String password) {
        this.environment = environment;
        this.password = password;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        boolean localOnly = Arrays.stream(environment.getActiveProfiles())
                .allMatch(LOCAL_PROFILES::contains);
        if (localOnly) {
            return;
        }
        if (LOCAL_DEV_PASSWORD.equals(password)) {
            throw new IllegalStateException("""
                    Refusing to start: the local development database password is in use \
                    with profiles %s active. Set DATABASE_PASSWORD explicitly for this \
                    environment."""
                    .formatted(Arrays.toString(environment.getActiveProfiles())));
        }
    }
}
