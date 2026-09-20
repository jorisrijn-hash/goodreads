package dev.jorisvrr.reading.ingest;

import dev.jorisvrr.reading.ingest.model.GenreMapping;
import dev.jorisvrr.reading.ingest.model.RejectionReason;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/** Counters for the data-quality report. Mutable by design; one instance per run. */
public class IngestReport {

    public final Map<String, AtomicInteger> harvestedByBucket = new LinkedHashMap<>();
    public final Map<RejectionReason, AtomicInteger> rejections = new EnumMap<>(RejectionReason.class);
    public final Map<String, AtomicInteger> acceptedByBucket = new LinkedHashMap<>();
    public final Map<String, AtomicInteger> genreCounts = new TreeMap<>();
    public final Map<GenreMapping.Anomaly, AtomicInteger> anomalies =
            new EnumMap<>(GenreMapping.Anomaly.class);
    public final Map<String, AtomicInteger> decades = new TreeMap<>();

    public int harvested;
    public int accepted;
    public int inserted;
    public int updated;
    public int withDescription;
    public int withUsableDescription;
    public int reviewQueueSize;
    public long coverBytes;

    // Hydration outcomes
    public int hydrateCached;
    public int hydrateFetched;
    public int hydrateNotFound;
    public int hydrateFailed;
    public int hydrateRetriesRecovered;

    // Cover outcomes
    public int coverCached;
    public int coverStored;
    public int coverNotFound;
    public int coverDownloadFailed;
    public int coverProcessingFailed;

    // API totals
    public int apiRequests;
    public int apiRetries;
    public int apiRecovered;
    public int apiUnrecovered;

    // Genre mapping
    public int genreMappedAutomatically;
    public int genreZero;
    public Duration duration = Duration.ZERO;

    public void harvested(String bucket) {
        harvestedByBucket.computeIfAbsent(bucket, k -> new AtomicInteger()).incrementAndGet();
        harvested++;
    }

    public void rejected(RejectionReason reason) {
        rejections.computeIfAbsent(reason, k -> new AtomicInteger()).incrementAndGet();
    }

    public void acceptedIn(String bucket) {
        acceptedByBucket.computeIfAbsent(bucket, k -> new AtomicInteger()).incrementAndGet();
        accepted++;
    }

    public void genre(String slug) {
        genreCounts.computeIfAbsent(slug, k -> new AtomicInteger()).incrementAndGet();
    }

    public void anomaly(GenreMapping.Anomaly a) {
        anomalies.computeIfAbsent(a, k -> new AtomicInteger()).incrementAndGet();
    }

    public void year(Integer year) {
        String bucket = year == null ? "unknown" : (year / 10 * 10) + "s";
        decades.computeIfAbsent(bucket, k -> new AtomicInteger()).incrementAndGet();
    }

    public int totalRejected() {
        return rejections.values().stream().mapToInt(AtomicInteger::get).sum();
    }

    public String render() {
        StringBuilder sb = new StringBuilder();
        sb.append("\n================ INGEST REPORT ================\n");
        sb.append("duration            : %s\n".formatted(human(duration)));
        sb.append("harvested           : %d\n".formatted(harvested));
        sb.append("accepted            : %d\n".formatted(accepted));
        sb.append("rejected            : %d\n".formatted(totalRejected()));
        sb.append("  inserted          : %d\n".formatted(inserted));
        sb.append("  updated           : %d\n".formatted(updated));
        sb.append("\n-- harvested by bucket --\n");
        harvestedByBucket.forEach((k, v) -> sb.append("  %-14s %d\n".formatted(k, v.get())));
        sb.append("\n-- accepted by bucket --\n");
        acceptedByBucket.forEach((k, v) -> sb.append("  %-14s %d\n".formatted(k, v.get())));
        sb.append("\n-- rejections --\n");
        rejections.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<RejectionReason, AtomicInteger> e) ->
                        e.getValue().get()).reversed())
                .forEach(e -> sb.append("  %-22s %d\n".formatted(e.getKey(), e.getValue().get())));
        sb.append("\n-- genres --\n");
        genreCounts.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<String, AtomicInteger> e) ->
                        e.getValue().get()).reversed())
                .forEach(e -> sb.append("  %-20s %d\n".formatted(e.getKey(), e.getValue().get())));
        sb.append("\n-- publication decades --\n");
        decades.forEach((k, v) -> sb.append("  %-8s %d\n".formatted(k, v.get())));
        sb.append("\n-- descriptions --\n");
        sb.append("  any               : %d (%.1f%%)\n".formatted(withDescription, pct(withDescription)));
        sb.append("  usable (>=300ch)  : %d (%.1f%%)\n".formatted(withUsableDescription, pct(withUsableDescription)));
        sb.append("\n-- hydration --\n");
        sb.append("  cached (resumed)  : %d\n".formatted(hydrateCached));
        sb.append("  fetched this run  : %d\n".formatted(hydrateFetched));
        sb.append("  permanent 404     : %d\n".formatted(hydrateNotFound));
        sb.append("  unrecovered fail  : %d\n".formatted(hydrateFailed));
        sb.append("  recovered by retry: %d\n".formatted(hydrateRetriesRecovered));
        sb.append("\n-- covers --\n");
        sb.append("  cached (resumed)  : %d\n".formatted(coverCached));
        sb.append("  downloaded+stored : %d\n".formatted(coverStored));
        sb.append("  no image (404)    : %d\n".formatted(coverNotFound));
        sb.append("  download failed   : %d\n".formatted(coverDownloadFailed));
        sb.append("  processing failed : %d\n".formatted(coverProcessingFailed));
        sb.append("\n-- api --\n");
        sb.append("  requests          : %d\n".formatted(apiRequests));
        sb.append("  retries issued    : %d\n".formatted(apiRetries));
        sb.append("  recovered         : %d\n".formatted(apiRecovered));
        sb.append("  unrecovered       : %d\n".formatted(apiUnrecovered));
        sb.append("\n-- genre mapping --\n");
        sb.append("  mapped >=1 genre  : %d\n".formatted(genreMappedAutomatically));
        sb.append("  zero genres       : %d\n".formatted(genreZero));
        sb.append("\n-- review queue --\n");
        anomalies.forEach((k, v) -> sb.append("  %-22s %d\n".formatted(k, v.get())));
        sb.append("  queue size        : %d\n".formatted(reviewQueueSize));
        sb.append("\ncover storage       : %.1f MB\n".formatted(coverBytes / 1024.0 / 1024.0));
        sb.append("===============================================\n");
        return sb.toString();
    }

    private double pct(int n) {
        return accepted == 0 ? 0 : 100.0 * n / accepted;
    }

    private static String human(Duration d) {
        return "%dm %02ds".formatted(d.toMinutes(), d.toSecondsPart());
    }
}
