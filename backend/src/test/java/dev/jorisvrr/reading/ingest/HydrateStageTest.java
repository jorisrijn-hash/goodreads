package dev.jorisvrr.reading.ingest;

import dev.jorisvrr.reading.ingest.model.Fetch;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Hydration is the rate-bound stage, so its resume behaviour is what makes an
 * interrupted ingest cheap to restart. These tests pin that behaviour.
 */
class HydrateStageTest {

    private static final String WORK_JSON = """
            {"key":"/works/OL1W","title":"The Secret History",
             "description":{"type":"/type/text","value":"%s"},
             "subjects":["Fiction","Mystery"]}
            """.formatted("A long description. ".repeat(20));

    /** Client stub that counts calls, so we can prove the cache prevents them. */
    private static class StubClient extends OpenLibraryClient {
        final AtomicInteger calls = new AtomicInteger();
        private final Fetch.Status status;

        StubClient(Fetch.Status status) {
            super("test-agent");
            this.status = status;
        }

        @Override
        public Fetch<JsonNode> getJson(String path) {
            calls.incrementAndGet();
            return switch (status) {
                case OK -> Fetch.ok(new ObjectMapper().readTree(WORK_JSON), 0);
                case NOT_FOUND -> Fetch.notFound(0);
                case FAILED -> Fetch.failed(3);
            };
        }
    }

    @Test
    @DisplayName("a fetched work is cached, and the next run makes no request")
    void cachesAndResumes(@TempDir Path dir) throws Exception {
        StubClient client = new StubClient(Fetch.Status.OK);
        HydrateStage stage = new HydrateStage(client);

        var first = stage.hydrate(dir, "/works/OL1W");
        assertThat(first.outcome()).isEqualTo(HydrateStage.Outcome.FETCHED);
        assertThat(first.subjects()).containsExactly("Fiction", "Mystery");
        assertThat(client.calls.get()).isEqualTo(1);

        var second = stage.hydrate(dir, "/works/OL1W");
        assertThat(second.outcome()).isEqualTo(HydrateStage.Outcome.CACHED);
        assertThat(second.description()).isEqualTo(first.description());
        assertThat(client.calls.get())
                .as("a resumed run must not re-request an already hydrated work")
                .isEqualTo(1);
    }

    @Test
    @DisplayName("a permanent 404 is not conflated with a transient failure")
    void distinguishesNotFoundFromFailure(@TempDir Path dir) throws Exception {
        var notFound = new HydrateStage(new StubClient(Fetch.Status.NOT_FOUND))
                .hydrate(dir, "/works/OL404W");
        assertThat(notFound.outcome()).isEqualTo(HydrateStage.Outcome.NOT_FOUND);
        assertThat(notFound.usable()).isFalse();

        var failed = new HydrateStage(new StubClient(Fetch.Status.FAILED))
                .hydrate(dir, "/works/OL500W");
        assertThat(failed.outcome()).isEqualTo(HydrateStage.Outcome.FAILED);
        assertThat(failed.retries()).isEqualTo(3);
    }

    @Test
    @DisplayName("a failed fetch writes nothing, so the next run retries it")
    void failureLeavesNoCacheEntry(@TempDir Path dir) throws Exception {
        new HydrateStage(new StubClient(Fetch.Status.FAILED)).hydrate(dir, "/works/OL500W");
        assertThat(Files.list(dir)).isEmpty();
    }

    @Test
    @DisplayName("a truncated cache entry is re-fetched rather than trusted or fatal")
    void recoversFromCorruptCache(@TempDir Path dir) throws Exception {
        Files.writeString(dir.resolve("OL1W.json"), "{\"key\": \"/works/OL1W\", trunca");
        StubClient client = new StubClient(Fetch.Status.OK);

        var result = new HydrateStage(client).hydrate(dir, "/works/OL1W");

        assertThat(result.outcome()).isEqualTo(HydrateStage.Outcome.FETCHED);
        assertThat(client.calls.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("cache writes are atomic — no temp files survive")
    void leavesNoTempFiles(@TempDir Path dir) throws Exception {
        new HydrateStage(new StubClient(Fetch.Status.OK)).hydrate(dir, "/works/OL1W");
        assertThat(Files.list(dir).map(p -> p.getFileName().toString()))
                .containsExactly("OL1W.json");
    }

    @Test
    void extractsDescriptionFromBothOpenLibraryShapes(@TempDir Path dir) throws Exception {
        var result = new HydrateStage(new StubClient(Fetch.Status.OK)).hydrate(dir, "/works/OL1W");
        assertThat(result.description()).startsWith("A long description.");
        assertThat(result.description().length())
                .isGreaterThanOrEqualTo(HydrateStage.USABLE_DESCRIPTION_CHARS);
    }
}
