package dev.jorisvrr.reading.ingest;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import dev.jorisvrr.reading.ingest.model.Candidate;
import dev.jorisvrr.reading.ingest.model.GenreMapping;
import dev.jorisvrr.reading.ingest.model.RejectionReason;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Catalogue ingest — a standalone task, not a service.
 *
 * <pre>
 *   HARVEST -> FILTER -> HYDRATE -> NORMALISE -> GENRE MAP -> COVERS -> VALIDATE -> UPSERT
 * </pre>
 *
 * Run with: {@code ./mvnw spring-boot:run -Dspring-boot.run.profiles=ingest}
 *
 * <p>Every stage is resumable: harvested search pages and hydrated works are cached on
 * disk, cover derivatives are skipped when already present, and the write is an upsert
 * keyed on the Open Library work key. Re-running is therefore cheap and safe.
 */
@Component
@Profile("ingest")
public class IngestRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(IngestRunner.class);
    /** Modest on purpose: enough to beat the 2.17s median latency, not enough to hammer. */
    private static final int COVER_THREADS = 8;
    /**
     * Hydration threads. The shared pacer still enforces a global 350ms floor between
     * request starts, so this does not exceed Open Library's 3 req/s allowance — it
     * simply stops us from wasting it. Serially, each request costs 350ms of pacing plus
     * ~500ms of latency, yielding only ~1.2 req/s of the 2.85 req/s we are permitted.
     */
    private static final int HYDRATE_THREADS = 3;
    /** Headroom so genre rejections do not leave buckets under-filled. */
    private static final int SELECTION_MARGIN_PCT = 118;

    /** A candidate that survived hydration and genre mapping, awaiting its cover. */
    private record Prepared(Candidate candidate, String bucket, String title,
                            HydrateStage.WorkDetail detail, List<String> subjects,
                            GenreMapping mapping) {
    }

    private final HarvestStage harvest;
    private final HydrateStage hydrate;
    private final CoverStage covers;
    private final CandidateFilter filter;
    private final GenreMapper genres;
    private final CatalogueWriter writer;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${ingest.data-dir:./data/ingest}") String dataDir;
    @Value("${ingest.cover-dir:./data/covers}") String coverDir;
    @Value("${ingest.target.established:8500}") int targetEstablished;
    @Value("${ingest.target.contemporary:1200}") int targetContemporary;
    @Value("${ingest.target.recent:300}") int targetRecent;
    @Value("${ingest.pages.established:6}") int pagesEstablished;
    @Value("${ingest.pages.contemporary:3}") int pagesContemporary;
    @Value("${ingest.pages.recent:2}") int pagesRecent;

    private final OpenLibraryClient client;

    public IngestRunner(HarvestStage harvest, HydrateStage hydrate, CoverStage covers,
                        CandidateFilter filter, GenreMapper genres, CatalogueWriter writer,
                        OpenLibraryClient client) {
        this.client = client;
        this.harvest = harvest;
        this.hydrate = hydrate;
        this.covers = covers;
        this.filter = filter;
        this.genres = genres;
        this.writer = writer;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Instant startedAt = Instant.now();
        IngestReport report = new IngestReport();

        Path raw = Path.of(dataDir, "raw");
        Path works = Path.of(dataDir, "works");
        Path storage = Path.of(coverDir);
        Files.createDirectories(storage);

        log.info("seeding genre taxonomy ({} genres)", genres.taxonomy().size());
        writer.seedGenres(genres.taxonomy());

        // ---- 1. HARVEST ------------------------------------------------------------
        Map<String, Candidate> candidates =
                harvest.harvest(raw, pagesEstablished, pagesContemporary, pagesRecent);
        Set<String> demoKeys = new HashSet<>();
        for (Map.Entry<String, Candidate> e : harvest.harvestTitles(raw, demoQueries()).entrySet()) {
            demoKeys.add(e.getKey());
            candidates.putIfAbsent(e.getKey(), e.getValue());
        }
        candidates.values().forEach(c -> report.harvested(c.bucket()));

        // ---- 2. FILTER (cheap gates first, before any per-book network cost) --------
        List<Candidate> survivors = new ArrayList<>();
        for (Candidate c : candidates.values()) {
            Optional<RejectionReason> rejection = filter.reject(c);
            if (rejection.isPresent()) {
                report.rejected(rejection.get());
            } else {
                survivors.add(c);
            }
        }
        log.info("filter: {} of {} candidates passed the quality gates",
                survivors.size(), candidates.size());

        // Demo books first, then fill each bucket to its target.
        survivors.sort(Comparator.comparingInt(c -> demoKeys.contains(c.key()) ? 0 : 1));
        Map<String, Integer> targets = Map.of(
                "established", targetEstablished,
                "contemporary", targetContemporary,
                "recent", targetRecent,
                "demo", Integer.MAX_VALUE);
        Map<String, Integer> taken = new HashMap<>();

        ArrayNode reviewQueue = mapper.createArrayNode();

        // ---- PHASE 0: select, then warm the hydration cache ------------------------
        // Selection is applied first so we only fetch what we might actually keep, with
        // margin for books that will later fail genre mapping.
        Map<String, Integer> selectionCounts = new HashMap<>();
        List<Candidate> selected = new ArrayList<>();
        for (Candidate c : survivors) {
            String bucket = demoKeys.contains(c.key()) ? "demo" : c.bucket();
            int cap = targets.getOrDefault(bucket, 0);
            int withMargin = cap == Integer.MAX_VALUE ? cap : cap * SELECTION_MARGIN_PCT / 100;
            if (selectionCounts.getOrDefault(bucket, 0) < withMargin) {
                selected.add(c);
                selectionCounts.merge(bucket, 1, Integer::sum);
            }
        }
        log.info("selected {} candidates for hydration {}", selected.size(), selectionCounts);

        AtomicInteger warmed = new AtomicInteger();
        // Outcomes are recorded here, not in phase A: by the time phase A runs the cache
        // is warm, so it would only ever observe CACHED and the real fetch statistics
        // would be lost.
        Map<String, HydrateStage.Outcome> hydrateOutcomes = new ConcurrentHashMap<>();
        AtomicInteger hydrateRecovered = new AtomicInteger();
        try (ExecutorService pool = Executors.newFixedThreadPool(HYDRATE_THREADS)) {
            for (Candidate c : selected) {
                pool.submit(() -> {
                    try {
                        HydrateStage.WorkDetail d = hydrate.hydrate(works, c.key());
                        hydrateOutcomes.put(c.key(), d.outcome());
                        if (d.retries() > 0 && d.usable()) {
                            hydrateRecovered.incrementAndGet();
                        }
                    } catch (Exception e) {
                        // Left uncached on purpose, so the next run retries it.
                        hydrateOutcomes.put(c.key(), HydrateStage.Outcome.FAILED);
                    }
                    int n = warmed.incrementAndGet();
                    if (n % 1000 == 0) {
                        log.info("hydration warm {} / {}", n, selected.size());
                    }
                });
            }
        }
        for (HydrateStage.Outcome o : hydrateOutcomes.values()) {
            switch (o) {
                case CACHED -> report.hydrateCached++;
                case FETCHED -> report.hydrateFetched++;
                case NOT_FOUND -> report.hydrateNotFound++;
                case FAILED -> report.hydrateFailed++;
            }
        }
        report.hydrateRetriesRecovered = hydrateRecovered.get();
        log.info("phase 0 complete: hydration cache warmed for {} works "
                        + "(cached {}, fetched {}, not-found {}, failed {})",
                selected.size(), report.hydrateCached, report.hydrateFetched,
                report.hydrateNotFound, report.hydrateFailed);

        // ---- PHASE A: read cache + genre map ---------------------------------------
        // Serial and fast: the cache is warm, so this reads from disk rather than network.
        List<Prepared> prepared = new ArrayList<>();
        int seen = 0;
        for (Candidate c : selected) {
            String bucket = demoKeys.contains(c.key()) ? "demo" : c.bucket();
            if (taken.getOrDefault(bucket, 0) >= targets.getOrDefault(bucket, 0)) {
                continue;
            }

            // Outcomes were recorded during the warm phase; this reads the cache.
            HydrateStage.WorkDetail detail = hydrate.hydrate(works, c.key());
            // A transient failure is not a statement about the data. Skip the book and
            // leave it uncached, so the next run retries it rather than accepting a
            // record we could not verify.
            if (detail.outcome() == HydrateStage.Outcome.FAILED) {
                continue;
            }

            String title = TextNormaliser.tidyDisplay(TextNormaliser.foldApostrophes(c.title()));
            if (title == null) {
                report.rejected(RejectionReason.NO_TITLE);
                continue;
            }
            List<String> subjects = !detail.subjects().isEmpty() ? detail.subjects() : c.subjects();
            GenreMapping mapping = genres.map(subjects, demoKeys.contains(c.key()));
            if (mapping.genres().isEmpty()) {
                report.genreZero++;
                report.rejected(RejectionReason.NO_GENRE_MAPPING);
                continue;
            }
            report.genreMappedAutomatically++;

            prepared.add(new Prepared(c, bucket, title, detail, subjects, mapping));
            taken.merge(bucket, 1, Integer::sum);
            if (++seen % 500 == 0) {
                log.info("hydrated {} / prepared {} {}", seen, prepared.size(), taken);
            }
        }
        log.info("phase A complete: {} books prepared", prepared.size());

        // ---- PHASE B: covers, concurrently ----------------------------------------
        // Latency-bound against a CDN rather than rate-bound, so a small pool is both
        // safe and necessary: serially this stage alone would take about six hours.
        Map<String, CoverStage.Result> coverResults = new ConcurrentHashMap<>();
        Map<String, CoverStage.Result> coverOutcomes = new ConcurrentHashMap<>();
        AtomicInteger coverFailures = new AtomicInteger();
        AtomicInteger coverDone = new AtomicInteger();
        try (ExecutorService pool = Executors.newFixedThreadPool(COVER_THREADS)) {
            for (Prepared p : prepared) {
                pool.submit(() -> {
                    try {
                        CoverStage.Result result = covers.download(storage, p.candidate().coverId());
                        coverOutcomes.put(p.candidate().key(), result);
                        if (result.stored()) {
                            coverResults.put(p.candidate().key(), result);
                        } else {
                            coverFailures.incrementAndGet();
                        }
                    } catch (Exception e) {
                        coverOutcomes.put(p.candidate().key(),
                                new CoverStage.Result(null, 0,
                                        CoverStage.Outcome.DOWNLOAD_FAILED, 0));
                        coverFailures.incrementAndGet();
                    }
                    int done = coverDone.incrementAndGet();
                    if (done % 500 == 0) {
                        log.info("covers {} / {} ({} failed)", done, prepared.size(), coverFailures.get());
                    }
                });
            }
        }
        for (CoverStage.Result r : coverOutcomes.values()) {
            switch (r.outcome()) {
                case CACHED -> report.coverCached++;
                case STORED -> report.coverStored++;
                case NOT_FOUND -> report.coverNotFound++;
                case DOWNLOAD_FAILED -> report.coverDownloadFailed++;
                case PROCESSING_FAILED -> report.coverProcessingFailed++;
            }
        }
        log.info("phase B complete: {} covers available, {} unusable",
                coverResults.size(), coverFailures.get());

        // ---- PHASE C: validate + upsert -------------------------------------------
        for (Prepared p : prepared) {
            Candidate c = p.candidate();
            CoverStage.Result cover = coverResults.get(c.key());
            if (cover == null) {
                CoverStage.Result outcome = coverOutcomes.get(c.key());
                report.rejected(outcome != null
                        && outcome.outcome() == CoverStage.Outcome.NOT_FOUND
                        ? RejectionReason.MISSING_COVER
                        : RejectionReason.COVER_DOWNLOAD_FAILED);
                continue;
            }
            if (!filter.validPageCount(c.pageCount())) {
                report.rejected(RejectionReason.INVALID_PAGE_COUNT);
                continue;
            }
            report.coverBytes += cover.bytesWritten();

            boolean isNew = writer.upsert(new CatalogueWriter.BookRow(
                    c.key(), p.title(), p.detail().description(), c.firstPublishYear(),
                    c.pageCount(), "eng", TextNormaliser.normaliseIsbn(c.primaryIsbn()),
                    c.coverId(), cover.coverKey(),
                    mapper.writeValueAsString(genres.denoise(p.subjects())),
                    authorRows(c), p.mapping().genres()));

            if (isNew) {
                report.inserted++;
            } else {
                report.updated++;
            }
            report.acceptedIn(p.bucket());
            report.year(c.firstPublishYear());
            p.mapping().genres().forEach(report::genre);
            if (p.detail().description() != null) {
                report.withDescription++;
                if (p.detail().description().length() >= HydrateStage.USABLE_DESCRIPTION_CHARS) {
                    report.withUsableDescription++;
                }
            }
            if (p.mapping().needsReview()) {
                p.mapping().anomalies().forEach(report::anomaly);
                reviewQueue.add(reviewEntry(c, p.title(), p.mapping()));
            }
        }
        log.info("phase C complete: {} inserted, {} updated", report.inserted, report.updated);

        report.reviewQueueSize = reviewQueue.size();
        report.apiRequests = client.requestCount();
        report.apiRetries = client.retryCount();
        report.apiRecovered = client.recoveredCount();
        report.apiUnrecovered = client.failedCount();
        report.duration = Duration.between(startedAt, Instant.now());

        Path reviewFile = Path.of(dataDir, "review-queue.json");
        Files.writeString(reviewFile, mapper.writerWithDefaultPrettyPrinter()
                .writeValueAsString(reviewQueue));
        Path reportFile = Path.of(dataDir, "ingest-report.txt");
        Files.writeString(reportFile, report.render());

        log.info(report.render());
        log.info("review queue -> {}", reviewFile.toAbsolutePath());
    }

    private List<CatalogueWriter.AuthorRow> authorRows(Candidate c) {
        List<CatalogueWriter.AuthorRow> rows = new ArrayList<>();
        List<String> names = c.authorNames();
        List<String> keys = c.authorKeys();
        for (int i = 0; i < names.size(); i++) {
            String name = TextNormaliser.tidyDisplay(TextNormaliser.foldApostrophes(names.get(i)));
            if (name == null || isTombstone(name)) {
                continue;
            }
            // Open Library usually supplies an author key. When it does not, derive a
            // stable synthetic one from the name so re-runs deduplicate consistently.
            String key = (keys != null && i < keys.size() && keys.get(i) != null)
                    ? "/authors/" + keys.get(i)
                    : "name:" + TextNormaliser.searchable(name);
            rows.add(new CatalogueWriter.AuthorRow(key, name));
        }
        return rows;
    }

    /**
     * Open Library leaves tombstone records behind when an author entry is deleted, and
     * they surface as a literal author name. "Anonymous" and "Various" are deliberately
     * not filtered — those are legitimate bylines for anthologies and classics.
     */
    private static boolean isTombstone(String name) {
        String n = name.trim().toLowerCase(java.util.Locale.ROOT);
        return n.equals("removed") || n.equals("deleted") || n.equals("n/a") || n.equals("none");
    }

    private ObjectNode reviewEntry(Candidate c, String title, GenreMapping mapping) {
        ObjectNode node = mapper.createObjectNode();
        node.put("workKey", c.key());
        node.put("title", title);
        node.put("author", c.authorNames().isEmpty() ? null : c.authorNames().getFirst());
        node.put("confidence", Math.round(mapping.confidence() * 100) / 100.0);
        node.set("genres", mapper.valueToTree(mapping.genres()));
        node.set("dropped", mapper.valueToTree(mapping.dropped()));
        node.set("anomalies", mapper.valueToTree(
                mapping.anomalies().stream().map(Enum::name).toList()));
        return node;
    }

    private List<String> demoQueries() throws Exception {
        try (InputStream in = new ClassPathResource("ingest/demo-books.json").getInputStream()) {
            JsonNode root = mapper.readTree(in);
            List<String> out = new ArrayList<>();
            root.get("queries").forEach(n -> out.add(n.asText()));
            return out;
        }
    }
}
