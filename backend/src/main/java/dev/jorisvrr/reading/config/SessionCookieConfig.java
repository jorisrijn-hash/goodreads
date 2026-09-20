package dev.jorisvrr.reading.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

/**
 * Session cookie policy.
 *
 * <p>Declared explicitly because Spring Session takes over cookie handling from the
 * servlet container and does <em>not</em> read {@code server.servlet.session.cookie.*}.
 * Relying on those properties looks correct and silently yields a cookie named
 * {@code SESSION} with no HttpOnly flag, no SameSite attribute and no Secure flag —
 * verified by inspecting the actual Set-Cookie header, not by reading the config.
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class SessionCookieConfig {

    @Bean
    CookieSerializer cookieSerializer(
            @Value("${app.session.cookie-name:GRSESSION}") String cookieName,
            @Value("${app.session.cookie-secure:false}") boolean secure) {

        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName(cookieName);
        // Unreachable from JavaScript, so an XSS bug cannot exfiltrate the session.
        serializer.setUseHttpOnlyCookie(true);
        // Lax still sends the cookie on top-level navigation, so returning from an
        // external link keeps the reader signed in, while withholding it from
        // cross-site form posts and subresource requests.
        serializer.setSameSite("Lax");
        // True in production, where everything is HTTPS.
        serializer.setUseSecureCookie(secure);
        serializer.setCookiePath("/");
        return serializer;
    }
}
