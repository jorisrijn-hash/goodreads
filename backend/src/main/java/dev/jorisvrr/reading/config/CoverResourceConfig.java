package dev.jorisvrr.reading.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Files;
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
 * are immutable and cacheable for a year.
 *
 * <p><b>Local development only.</b> In production the frontend rewrites `/covers/**`
 * straight to Supabase Storage, so image bytes never pass through this application — a
 * backend hop in front of every image on a page full of covers would be pure cost. The
 * handler is therefore registered only when the cover directory actually exists, so a
 * deployment with no local covers does not advertise a route that can only ever 404.
 *
 * <p>The public path is identical either way (`/covers/<shard>/<id>-<width>.jpg`), which
 * is what lets the storage provider change without touching code or database values.
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class CoverResourceConfig implements WebMvcConfigurer {

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(CoverResourceConfig.class);

    private final String coverDirectory;

    CoverResourceConfig(@Value("${app.cover-dir:./data/covers}") String coverDirectory) {
        this.coverDirectory = coverDirectory;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path directory = Path.of(coverDirectory).toAbsolutePath().normalize();
        if (!Files.isDirectory(directory)) {
            log.info("No cover directory at {} — not serving /covers/**. "
                    + "Expected in production, where covers come from object storage.", directory);
            return;
        }
        log.info("Serving /covers/** from {}", directory);
        registry.addResourceHandler("/covers/**")
                .addResourceLocations(directory.toUri().toString())
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
    }
}
