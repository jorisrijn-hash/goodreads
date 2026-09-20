package dev.jorisvrr.reading.identity;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Bridges our {@link User} to Spring Security.
 *
 * <p>Holds the user id rather than the whole entity: this object is serialised into the
 * session, and a detached JPA entity in a session store is a source of stale data.
 */
public class AppUserDetails implements UserDetails {

    private final Long userId;
    private final String username;
    private final transient String passwordHash;
    private final boolean demo;

    AppUserDetails(User user) {
        this.userId = user.getId();
        this.username = user.getUsername();
        this.passwordHash = user.getPasswordHash();
        this.demo = user.isDemo();
    }

    public Long getUserId() {
        return userId;
    }

    public boolean isDemo() {
        return demo;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }
}
