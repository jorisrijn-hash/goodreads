package dev.jorisvrr.reading.ingest;

import dev.jorisvrr.reading.ingest.model.Fetch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

/**
 * Stage 3 — fetch work-level detail the search endpoint does not return.
 *
 * <p>Descriptions and full subject lists only exist on {@code /works/{key}.json}, one
 * request per book. This is the pipeline's rate-bound stage.
 *
 * <p><b>Resumability.</b> Every response is cached to disk and replayed on subsequent
 * runs, so an interrupted ingest resumes rather than restarting. Cache writes are atomic
 * (write to a temp file, then move) so a process killed mid-write cannot leave a
 * truncated JSON file that would poison the next run.
 */
@Component
public class HydrateStage {

    private static final Logger log = LoggerFactory.getLogger(HydrateStage.class);

    /** Below this a description is a stub, not prose. Kept, but counted separately. */
    public static final int USABLE_DESCRIPTION_CHARS = 300;

    public enum Outcome {
        /** Served from the on-disk cache — no network request made. */
        CACHED,
        /** Fetched successfully this run. */
        FETCHED,
        /** Open Library has no record for this work. Permanent; not retried. */
        NOT_FOUND,
        /** Network or server failure that survived all retries. Transient in nature. */
        FAILED
    }

    public record WorkDetail(String description, List<String> subjects,
                             Outcome outcome, int retries) {

        public boolean usable() {
            return outcome == Outcome.CACHED || outcome == Outcome.FETCHED;
        }
    }

    private final OpenLibraryClient client;
    private final ObjectMapper mapper = new ObjectMapper();

    public HydrateStage(OpenLibraryClient client) {
        this.client = client;
    }

    public WorkDetail hydrate(Path worksDir, String workKey) throws IOException, InterruptedException {
        Files.createDirectories(worksDir);
        String id = workKey.substring(workKey.lastIndexOf('/') + 1);
        Path file = worksDir.resolve(id + ".json");

        if (Files.exists(file) && Files.size(file) > 0) {
            try {
                JsonNode cached = mapper.readTree(Files.readAllBytes(file));
                return new WorkDetail(description(cached), subjects(cached), Outcome.CACHED, 0);
            } catch (RuntimeException e) {
                // A corrupt cache entry should not be trusted or fatal — re-fetch it.
                log.warn("corrupt cache entry {}, re-fetching", file.getFileName());
                Files.deleteIfExists(file);
            }
        }

        Fetch<JsonNode> fetch = client.getJson(workKey + ".json");
        if (fetch.status() == Fetch.Status.NOT_FOUND) {
            return new WorkDetail(null, List.of(), Outcome.NOT_FOUND, fetch.retries());
        }
        if (!fetch.ok()) {
            return new WorkDetail(null, List.of(), Outcome.FAILED, fetch.retries());
        }

        writeAtomically(file, mapper.writeValueAsString(fetch.value()));
        return new WorkDetail(description(fetch.value()), subjects(fetch.value()),
                Outcome.FETCHED, fetch.retries());
    }

    /** Temp file + atomic move, so an interrupted run never leaves a partial cache entry. */
    private void writeAtomically(Path target, String content) throws IOException {
        Path temp = target.resolveSibling(target.getFileName() + ".tmp");
        Files.writeString(temp, content);
        try {
            Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    /** Open Library stores description either as a plain string or as {type, value}. */
    private String description(JsonNode root) {
        JsonNode node = root.get("description");
        if (node == null) {
            return null;
        }
        String raw = node.isTextual() ? node.asText()
                : node.hasNonNull("value") ? node.get("value").asText() : null;
        String tidied = TextNormaliser.tidyDisplay(TextNormaliser.foldApostrophes(raw));
        if (tidied == null) {
            return null;
        }
        // Strip the "----------\nsource" footers some descriptions carry.
        int cut = tidied.indexOf("----------");
        if (cut > 100) {
            tidied = tidied.substring(0, cut).trim();
        }
        return tidied.isEmpty() ? null : tidied;
    }

    private List<String> subjects(JsonNode root) {
        List<String> out = new ArrayList<>();
        JsonNode node = root.get("subjects");
        if (node != null && node.isArray()) {
            node.forEach(s -> out.add(s.asText()));
        }
        return out;
    }
}
