package dev.jorisvrr.reading.identity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Creates an account. Uniqueness is checked here for a useful field-level error, and
     * enforced by the database, which is the actual authority — two concurrent signups
     * with the same email will still produce exactly one account.
     */
    @Transactional
    public User signUp(String email, String username, String password, String displayName) {
        String normalisedEmail = User.normaliseEmail(email);

        if (users.existsByEmail(normalisedEmail)) {
            throw new DuplicateAccountException("email", "An account with this email already exists.");
        }
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new DuplicateAccountException("username", "That username is taken.");
        }

        String resolvedDisplayName = (displayName == null || displayName.isBlank())
                ? username.trim()
                : displayName.trim();

        User user = users.save(User.create(
                normalisedEmail, username, resolvedDisplayName,
                passwordEncoder.encode(password), false));

        // Identifiers only. Never the email, password or hash.
        log.info("account created: userId={}", user.getId());
        return user;
    }
}
