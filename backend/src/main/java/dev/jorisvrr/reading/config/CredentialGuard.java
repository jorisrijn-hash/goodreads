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
    /**
     * Profiles that describe what the process does rather than where it runs. "ingest"
     * is a task, not an environment, so it must not be mistaken for production — that
     * would block a perfectly ordinary local ingest. A production ingest still activates
     * a production profile alongside it, and is still caught.
     */
    private static final List<String> TASK_PROFILES = List.of("ingest");

    private final Environment environment;
    private final String password;
    private final boolean secureCookie;
    private final String frontendOrigin;

    CredentialGuard(Environment environment,
                    @Value("${spring.datasource.password:}") String password,
                    @Value("${app.session.cookie-secure:false}") boolean secureCookie,
                    @Value("${app.frontend-origin:}") String frontendOrigin) {
        this.environment = environment;
        this.password = password;
        this.secureCookie = secureCookie;
        this.frontendOrigin = frontendOrigin;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        List<String> environmentProfiles = Arrays.stream(environment.getActiveProfiles())
                .filter(profile -> !TASK_PROFILES.contains(profile))
                .toList();
        // No environment profile at all means local development, where the default
        // profile supplies these credentials deliberately.
        boolean localOnly = environmentProfiles.isEmpty()
                || environmentProfiles.stream().allMatch(LOCAL_PROFILES::contains);
        if (localOnly) {
            return;
        }
        // Outside local development these are not optional. Failing at startup is far
        // better than serving traffic with a session cookie that can travel in clear text.
        if (!secureCookie) {
            throw new IllegalStateException(
                    "Refusing to start: SESSION_COOKIE_SECURE must be true outside local "
                            + "development, or the session cookie can be sent over plain HTTP.");
        }
        if (frontendOrigin.isBlank() || frontendOrigin.contains("localhost")) {
            throw new IllegalStateException(
                    "Refusing to start: FRONTEND_ORIGIN must be set to the real frontend "
                            + "origin outside local development (was: '" + frontendOrigin + "').");
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
