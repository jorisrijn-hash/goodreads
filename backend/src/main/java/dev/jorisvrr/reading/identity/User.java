package dev.jorisvrr.reading.identity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.Locale;

/**
 * A reader.
 *
 * <p>Deliberately small. Phase 1 identity carries what authentication and display
 * require and nothing else — no bio, no favourite genres, no social fields. Those
 * belong to later product work, not to the identity model.
 *
 * <p>{@code passwordHash} is package-private on purpose: nothing outside this package
 * has any reason to read it, and it must never reach a DTO.
 */
@Entity
@Table(name = "app_user")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String username;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "is_demo", nullable = false)
    private boolean demo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected User() {
        // for JPA
    }

    static User create(String email, String username, String displayName,
                       String passwordHash, boolean demo) {
        User user = new User();
        user.email = normaliseEmail(email);
        user.username = username.trim();
        user.displayName = displayName.trim();
        user.passwordHash = passwordHash;
        user.demo = demo;
        return user;
    }

    /** The schema enforces {@code email = lower(email)}; normalise before it gets there. */
    static String normaliseEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    String getPasswordHash() {
        return passwordHash;
    }

    public String getUsername() {
        return username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public boolean isDemo() {
        return demo;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    /** Never includes credentials. */
    @Override
    public String toString() {
        return "User[id=%d, username=%s, demo=%s]".formatted(id, username, demo);
    }
}
