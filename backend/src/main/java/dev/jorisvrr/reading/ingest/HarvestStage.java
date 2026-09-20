package dev.jorisvrr.reading.ingest;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import dev.jorisvrr.reading.ingest.model.Candidate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * Stage 1 — fetch candidate canonical works.
 *
 * <p>Every response is written to disk before anything else touches it, so later stages
 * and re-runs never need to hit the network again. Selection is by reader popularity
 * ({@code sort=readinglog}) because the spike showed that single choice moves cover
 * availability from 12.8% to 99.7%.
 */
@Component
public class HarvestStage {

    private static final Logger log = LoggerFactory.getLogger(HarvestStage.class);

    private static final String FIELDS = String.join(",",
            "key", "title", "author_name", "author_key", "first_publish_year",
            "number_of_pages_median", "cover_i", "language", "isbn", "subject", "edition_count");

    static final List<String> SUBJECTS = List.of(
            "fiction", "fantasy", "science_fiction", "mystery", "thriller", "romance",
            "historical_fiction", "horror", "biography", "history", "science", "psychology",
            "business", "poetry", "young_adult", "classics", "memoir", "self_help",
            "travel", "cookbooks", "computers", "philosophy");

    private final OpenLibraryClient client;
    private final ObjectMapper mapper = new ObjectMapper();

    public HarvestStage(OpenLibraryClient client) {
        this.client = client;
    }

    /** bucket -> candidates, de-duplicated by work key across the whole harvest. */
    public Map<String, Candidate> harvest(Path rawDir, int establishedPages,
                                          int contemporaryPages, int recentPages)
            throws IOException, InterruptedException {
        Files.createDirectories(rawDir);
        Map<String, Candidate> all = new LinkedHashMap<>();

        for (String subject : SUBJECTS) {
            collect(all, rawDir, "established", subject,
                    "subject:" + subject, "readinglog", establishedPages);
        }
        for (String subject : SUBJECTS) {
            collect(all, rawDir, "contemporary", subject,
                    "subject:" + subject + " AND first_publish_year:[2018 TO 2022]",
                    "readinglog", contemporaryPages);
        }
        for (String subject : SUBJECTS) {
            collect(all, rawDir, "recent", subject,
                    "subject:" + subject + " AND first_publish_year:[2023 TO 2026]",
                    "readinglog", recentPages);
        }
        log.info("harvest complete: {} unique candidate works", all.size());
        return all;
    }

    /** Targeted lookups so the demo narrative is guaranteed, if the data is good enough. */
    public Map<String, Candidate> harvestTitles(Path rawDir, List<String> titleQueries)
            throws IOException, InterruptedException {
        Files.createDirectories(rawDir);
        Map<String, Candidate> found = new LinkedHashMap<>();
        for (String query : titleQueries) {
            String file = "demo-" + TextNormaliser.slug(query) + ".json";
            JsonNode root = fetchOrReplay(rawDir.resolve(file),
                    "/search.json?q=" + enc(query) + "&limit=5&fields=" + FIELDS);
            if (root == null) {
                continue;
            }
            for (JsonNode doc : root.path("docs")) {
                Candidate c = toCandidate(doc, "demo");
                if (c != null && c.key() != null) {
                    found.putIfAbsent(c.key(), c);
                }
            }
        }
        log.info("demo harvest: {} candidate works for {} queries", found.size(), titleQueries.size());
        return found;
    }

    private void collect(Map<String, Candidate> sink, Path rawDir, String bucket,
                         String subject, String query, String sort, int pages)
            throws IOException, InterruptedException {
        int added = 0;
        for (int page = 1; page <= pages; page++) {
            Path file = rawDir.resolve("%s-%s-p%d.json".formatted(bucket, subject, page));
            String url = "/search.json?q=" + enc(query) + "&sort=" + sort
                    + "&limit=100&page=" + page + "&fields=" + FIELDS;
            JsonNode root = fetchOrReplay(file, url);
            if (root == null) {
                break;
            }
            JsonNode docs = root.path("docs");
            if (!docs.isArray() || docs.isEmpty()) {
                break;
            }
            for (JsonNode doc : docs) {
                Candidate c = toCandidate(doc, bucket);
                if (c != null && c.key() != null && sink.putIfAbsent(c.key(), c) == null) {
                    added++;
                }
            }
        }
        log.info("  {}/{}: +{} new (total {})", bucket, subject, added, sink.size());
    }

    /** Replays the stored response when present; only fetches when it is not. */
    private JsonNode fetchOrReplay(Path file, String url) throws IOException, InterruptedException {
        if (Files.exists(file) && Files.size(file) > 0) {
            return mapper.readTree(Files.readAllBytes(file));
        }
        var fetch = client.getJson(url);
        if (!fetch.ok()) {
            return null;
        }
        Files.writeString(file, mapper.writeValueAsString(fetch.value()));
        return fetch.value();
    }

    private Candidate toCandidate(JsonNode d, String bucket) {
        String key = text(d, "key");
        if (key == null) {
            return null;
        }
        return new Candidate(
                key,
                text(d, "title"),
                strings(d, "author_name"),
                strings(d, "author_key"),
                d.hasNonNull("first_publish_year") ? d.get("first_publish_year").asInt() : null,
                d.hasNonNull("number_of_pages_median") ? d.get("number_of_pages_median").asInt() : null,
                d.hasNonNull("cover_i") ? d.get("cover_i").asLong() : null,
                strings(d, "language"),
                strings(d, "isbn"),
                strings(d, "subject"),
                bucket);
    }

    private static String text(JsonNode n, String field) {
        return n.hasNonNull(field) ? n.get(field).asText() : null;
    }

    private static List<String> strings(JsonNode n, String field) {
        if (!n.has(field) || !n.get(field).isArray()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        n.get(field).forEach(v -> out.add(v.asText()));
        return out;
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
