package dev.jorisvrr.reading.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.time.Duration;

/**
 * Serves the cover derivatives produced by the ingest.
 *
 * <p>Covers are downloaded once and stored by us; they are never hotlinked from Open
 * Library, whose CDN was measured at a 2.17s median fetch — far too slow for a page full
 * of book covers.
 *
 * <p>Filenames are content-addressed by Open Library cover id and never change, so these
 * are immutable and cacheable for a year. When this moves to object storage the URLs keep
 * the same shape (`/covers/<shard>/<id>-<width>.jpg`) and only the host changes.
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class CoverResourceConfig implements WebMvcConfigurer {

    private final String coverDirectory;

    CoverResourceConfig(@Value("${app.cover-dir:./data/covers}") String coverDirectory) {
        this.coverDirectory = coverDirectory;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(coverDirectory).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/covers/**")
                .addResourceLocations(location)
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
    }
}
