package dev.jorisvrr.reading.config;

import dev.jorisvrr.reading.identity.AppUserDetailsService;
import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Deny by default. Only the routes named here are reachable without a session.
 *
 * <p>The filter chain applies to the web application only — the ingest task runs with
 * {@code web-application-type: none}, where {@code HttpSecurity} does not exist.
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class SecurityConfig {

    private final AppUserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final String allowedOrigin;

    SecurityConfig(AppUserDetailsService userDetailsService, PasswordEncoder passwordEncoder,
                   @Value("${app.frontend-origin:http://localhost:3000}") String allowedOrigin) {
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
        this.allowedOrigin = allowedOrigin;
    }

    /** Shared so {@code SessionService} rotates the very same token store. */
    @Bean
    org.springframework.security.web.csrf.CsrfTokenRepository csrfTokenRepository() {
        return CookieCsrfTokenRepository.withHttpOnlyFalse();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // The browser reads this cookie and echoes it in the X-XSRF-TOKEN header. The
        // plain handler (rather than the XOR default) is what makes the cookie value and
        // the header value comparable, which a JavaScript client needs.
        CsrfTokenRequestAttributeHandler csrfHandler = new CsrfTokenRequestAttributeHandler();
        csrfHandler.setCsrfRequestAttributeName(null);

        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Cookie-based sessions are exactly what CSRF protection exists for, so
                // it is on for every state-changing request -- including login, which is
                // vulnerable to login-CSRF (an attacker silently signing a victim into an
                // account they control). Nothing is exempt.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository())
                        .csrfTokenRequestHandler(csrfHandler))
                // No concurrent-session limit. One was configured, but its registry lived
                // in memory, so it was never enforced against the JDBC session store and
                // reset on every restart. The shared demo account needs many concurrent
                // visitors anyway: if a single-session rule is ever added for real
                // accounts, it must be backed by the session store and exempt the demo.
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                // The default request cache stores every rejected request in a new session
                // so it can be replayed after login. Nothing here replays it — the
                // frontend carries returnTo itself — so all it did was write a 30-day
                // session row to the database for each anonymous hit on /api/v1/me.
                // Found in production: rows that only ever held SAVED_REQUEST.
                .requestCache(cache -> cache.disable())
                .exceptionHandling(ex -> ex
                        // An API answers 401; it does not redirect a fetch() to a login page.
                        .authenticationEntryPoint(
                                new HttpStatusEntryPoint(org.springframework.http.HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        // Spring dispatches errors as a separate internal request. Without
                        // this, denyAll intercepts the ERROR dispatch and every 404 reaches
                        // the client as 403.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers("/actuator/health/**").permitAll()
                        .requestMatchers("/api/v1/csrf").permitAll()
                        // The catalogue is public: browsing and searching need no account.
                        .requestMatchers(HttpMethod.GET, "/api/v1/books/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/genres").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/catalogue/stats").permitAll()
                        .requestMatchers(HttpMethod.GET, "/covers/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/users").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/session").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/demo-session").permitAll()
                        // Logging out requires being logged in.
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/auth/session").authenticated()
                        // Everything under /api/v1/me is personal and stays protected as
                        // later checkpoints add resources beneath it.
                        .requestMatchers("/api/v1/me/**").authenticated()
                        .anyRequest().denyAll())
                .logout(logout -> logout.disable()) // handled by DELETE /api/v1/auth/session
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .authenticationManager(authenticationManager())
                .build();
    }

    @Bean
    AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        // Without this, a request for an unknown account fails faster than one for a
        // known account with a wrong password, and the timing difference reveals which
        // emails are registered.
        provider.setHideUserNotFoundExceptions(true);
        return new ProviderManager(provider);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigin));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN", "Accept"));
        // Required for the session and CSRF cookies to travel at all.
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
