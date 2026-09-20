package dev.jorisvrr.reading.ingest;

import dev.jorisvrr.reading.ingest.model.Fetch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Open Library HTTP access.
 *
 * <p>Open Library allows 1 request/second anonymously and 3 req/s for clients that
 * identify themselves with a contact address in the User-Agent. We identify, then
 * self-throttle below the stated limit and serialise API calls through a lock: the API
 * asks not to be hammered, and the ingest is not latency sensitive.
 *
 * <p>Covers come from a separate CDN host and use a separate, lightly concurrent path.
 * Open Library rate-limits cover lookups by ISBN (100 per IP per 5 minutes) but exempts
 * lookups by {@code cover_id}, which is what we use. That path is latency-bound rather
 * than rate-bound; serialising it behind the API throttle would turn a one-hour stage
 * into roughly six.
 */
@Component
public class OpenLibraryClient {

    private static final Logger log = LoggerFactory.getLogger(OpenLibraryClient.class);
    private static final String BASE = "https://openlibrary.org";
    public static final String COVERS_BASE = "https://covers.openlibrary.org";

    /** 3 req/s permitted on the API; 350ms leaves headroom. */
    private static final long MIN_INTERVAL_MS = 350;
    private static final long COVER_MIN_INTERVAL_MS = 40;
    /** Bounded: transient failures are retried, but never indefinitely. */
    private static final int MAX_RETRIES = 3;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock throttle = new ReentrantLock(true);
    private final ReentrantLock coverThrottle = new ReentrantLock(true);
    private final String userAgent;

    private long lastRequestAt = 0;
    private long lastCoverRequestAt = 0;

    // Counters for the data-quality report.
    private final AtomicInteger requests = new AtomicInteger();
    private final AtomicInteger retries = new AtomicInteger();
    private final AtomicInteger recovered = new AtomicInteger();
    private final AtomicInteger notFound = new AtomicInteger();
    private final AtomicInteger failed = new AtomicInteger();

    public OpenLibraryClient(
            @Value("${ingest.user-agent:goodreads-redesign/0.1 (contact unset)}") String userAgent) {
        this.userAgent = userAgent;
    }

    public int requestCount()   { return requests.get(); }
    public int retryCount()     { return retries.get(); }
    public int recoveredCount() { return recovered.get(); }
    public int notFoundCount()  { return notFound.get(); }
    public int failedCount()    { return failed.get(); }

    public Fetch<JsonNode> getJson(String path) throws InterruptedException {
        String url = path.startsWith("http") ? path : BASE + path;
        Fetch<String> body = send(url, false);
        if (!body.ok()) {
            return new Fetch<>(null, body.status(), body.retries());
        }
        try {
            return Fetch.ok(mapper.readTree(body.value()), body.retries());
        } catch (RuntimeException e) {
            // Malformed JSON is a permanent property of the response, not a transient fault.
            log.warn("unparseable JSON from {}: {}", url, e.getMessage());
            return Fetch.notFound(body.retries());
        }
    }

    /** Cover bytes. Uses the cover CDN pacing path, not the API throttle. */
    public Fetch<byte[]> getBytes(String url) throws InterruptedException {
        return sendBytes(url);
    }

    private Fetch<String> send(String url, boolean cover) throws InterruptedException {
        int used = 0;
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            if (cover) { paceCover(); } else { pace(); }
            requests.incrementAndGet();
            try {
                HttpResponse<String> response = http.send(request(url),
                        HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    if (used > 0) {
                        recovered.incrementAndGet();
                    }
                    return Fetch.ok(response.body(), used);
                }
                if (response.statusCode() == 404 || response.statusCode() == 410) {
                    notFound.incrementAndGet();
                    return Fetch.notFound(used);
                }
                used = backoff(attempt, response.statusCode(), url, used);
            } catch (IOException e) {
                used = backoff(attempt, -1, url, used);
            }
        }
        failed.incrementAndGet();
        log.warn("unrecovered after {} retries: {}", MAX_RETRIES, url);
        return Fetch.failed(used);
    }

    private Fetch<byte[]> sendBytes(String url) throws InterruptedException {
        int used = 0;
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            paceCover();
            requests.incrementAndGet();
            try {
                HttpResponse<byte[]> response = http.send(request(url),
                        HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() == 200) {
                    if (used > 0) {
                        recovered.incrementAndGet();
                    }
                    return Fetch.ok(response.body(), used);
                }
                if (response.statusCode() == 404 || response.statusCode() == 410) {
                    notFound.incrementAndGet();
                    return Fetch.notFound(used);
                }
                used = backoff(attempt, response.statusCode(), url, used);
            } catch (IOException e) {
                used = backoff(attempt, -1, url, used);
            }
        }
        failed.incrementAndGet();
        return Fetch.failed(used);
    }

    private HttpRequest request(String url) {
        return HttpRequest.newBuilder(URI.create(url))
                .header("User-Agent", userAgent)
                .timeout(Duration.ofSeconds(45))
                .GET().build();
    }

    private int backoff(int attempt, int status, String url, int used)
            throws InterruptedException {
        if (attempt >= MAX_RETRIES) {
            return used;
        }
        retries.incrementAndGet();
        long waitMs = (long) Math.pow(2, attempt) * 600;
        log.debug("retry {}/{} (status {}) in {}ms: {}", attempt + 1, MAX_RETRIES, status, waitMs, url);
        Thread.sleep(waitMs);
        return used + 1;
    }

    /** Cover CDN pacing: keeps a floor between starts without serialising latency. */
    private void paceCover() throws InterruptedException {
        long waitFor;
        coverThrottle.lock();
        try {
            long since = System.currentTimeMillis() - lastCoverRequestAt;
            waitFor = Math.max(0, COVER_MIN_INTERVAL_MS - since);
            lastCoverRequestAt = System.currentTimeMillis() + waitFor;
        } finally {
            coverThrottle.unlock();
        }
        if (waitFor > 0) {
            Thread.sleep(waitFor);
        }
    }

    /** Serialises callers and enforces the minimum gap between API requests. */
    private void pace() throws InterruptedException {
        throttle.lock();
        try {
            long since = System.currentTimeMillis() - lastRequestAt;
            if (since < MIN_INTERVAL_MS) {
                Thread.sleep(MIN_INTERVAL_MS - since);
            }
            lastRequestAt = System.currentTimeMillis();
        } finally {
            throttle.unlock();
        }
    }
}
