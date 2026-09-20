package dev.jorisvrr.reading.identity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the demo reader if it does not exist.
 *
 * <p>The account is deliberately unreachable through normal login: its password hash is
 * a sentinel that no submitted password can produce, so {@code POST /auth/session} can
 * never authenticate it. The only way in is {@code POST /auth/demo-session}, which is an
 * explicit server-side decision rather than a shared credential that would leak.
 *
 * <p>Idempotent, and enforced by a partial unique index — at most one demo account can
 * exist no matter how often this runs.
 */
@Component
@Profile("!ingest")
public class DemoAccountSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoAccountSeeder.class);

    public static final String DEMO_EMAIL = "demo@goodreads-redesign.local";
    public static final String DEMO_USERNAME = "demo_reader";
    public static final String DEMO_DISPLAY_NAME = "Demo Reader";

    /**
     * Not a hash of anything. Argon2 verification against a value that is not a valid
     * encoded hash fails for every input, which is precisely the intent.
     */
    private static final String UNUSABLE_PASSWORD = "{noop-unusable}demo-account-has-no-password";

    private final UserRepository users;

    public DemoAccountSeeder(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        users.findByDemoIsTrue().ifPresentOrElse(
                existing -> log.debug("demo account present: userId={}", existing.getId()),
                this::create);
    }

    private void create() {
        User demo = users.save(User.create(DEMO_EMAIL, DEMO_USERNAME, DEMO_DISPLAY_NAME,
                UNUSABLE_PASSWORD, true));
        log.info("demo account created: userId={}", demo.getId());
    }
}
