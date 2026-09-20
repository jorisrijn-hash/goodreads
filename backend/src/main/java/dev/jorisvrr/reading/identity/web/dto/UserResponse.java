package dev.jorisvrr.reading.identity.web.dto;

import dev.jorisvrr.reading.identity.User;

/**
 * The identity projection returned by {@code GET /api/v1/me} and after authentication.
 *
 * <p>Deliberately excludes email. Nothing in Phase 1's UI needs it, and an endpoint the
 * frontend calls on every page load is the wrong place to carry a personal identifier.
 * Account settings can add a separate authenticated projection when it needs one.
 *
 * <p>Also excludes, permanently: the password hash, session identifiers, and any
 * internal security state.
 */
public record UserResponse(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        boolean demo) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getDisplayName(),
                user.getAvatarUrl(), user.isDemo());
    }
}
