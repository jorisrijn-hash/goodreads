package dev.jorisvrr.reading.identity;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads a user by email — the identifier readers actually log in with.
 *
 * <p>The exception message is deliberately uninformative. Spring Security converts it to
 * a generic {@code BadCredentialsException} before it reaches the client, which is what
 * keeps login from confirming whether an email is registered.
 */
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository users;

    public AppUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return users.findByEmail(User.normaliseEmail(email))
                .map(AppUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("Bad credentials"));
    }

    @Transactional(readOnly = true)
    public UserDetails loadDemoUser() {
        return users.findByDemoIsTrue()
                .map(AppUserDetails::new)
                .orElseThrow(() -> new IllegalStateException(
                        "No demo account exists. It is seeded at startup; check DemoAccountSeeder."));
    }
}
