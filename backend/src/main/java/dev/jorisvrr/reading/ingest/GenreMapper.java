package dev.jorisvrr.reading.ingest;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import dev.jorisvrr.reading.ingest.model.GenreMapping;
import dev.jorisvrr.reading.ingest.model.GenreMapping.Anomaly;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Maps noisy Open Library subjects onto a controlled taxonomy.
 *
 * <p>The spike measured that a greedy substring mapper reaches 98.9% recall with poor
 * precision ("science" matching "science fiction"), so patterns here are anchored and
 * split into strong and weak tiers. Weak patterns only contribute when nothing strong
 * matched, which keeps a book like <i>Thinner</i> from being tagged "science fiction".
 *
 * <p>Books are not silently accepted when the mapping looks doubtful: anomalies drive a
 * review queue rather than manual inspection of all 10,000 records.
 */
@Component
public class GenreMapper {

    /** Above this, the mapping is almost certainly over-tagged. */
    private static final int MAX_GENRES = 3;
    private static final int TOO_MANY_THRESHOLD = 5;

    private record Rule(String slug, String name, List<Pattern> strong, List<Pattern> weak) {
    }

    private final List<Rule> rules = new ArrayList<>();
    private final List<Set<String>> conflicts = new ArrayList<>();
    private final List<Pattern> noise = new ArrayList<>();
    private final Map<String, String> genreNames = new LinkedHashMap<>();

    public GenreMapper() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream in = new ClassPathResource("ingest/genre-taxonomy.json").getInputStream()) {
            JsonNode root = mapper.readTree(in);
            for (JsonNode g : root.get("genres")) {
                rules.add(new Rule(
                        g.get("slug").asText(),
                        g.get("name").asText(),
                        compile(g.get("strong")),
                        compile(g.get("weak"))));
                genreNames.put(g.get("slug").asText(), g.get("name").asText());
            }
            for (JsonNode c : root.get("conflicts")) {
                Set<String> pair = new HashSet<>();
                c.forEach(n -> pair.add(n.asText()));
                conflicts.add(pair);
            }
            for (JsonNode n : root.get("noise")) {
                noise.add(Pattern.compile(Pattern.quote(n.asText()), Pattern.CASE_INSENSITIVE));
            }
        }
    }

    private static List<Pattern> compile(JsonNode arr) {
        List<Pattern> out = new ArrayList<>();
        if (arr != null) {
            arr.forEach(n -> out.add(Pattern.compile(n.asText(), Pattern.CASE_INSENSITIVE)));
        }
        return out;
    }

    /** slug -> display name, for seeding the genre table. */
    public Map<String, String> taxonomy() {
        return Collections.unmodifiableMap(genreNames);
    }

    /**
     * Open Library uses a faceted vocabulary for some subjects — "form:graphic novel",
     * "genre:science fantasy". Anchored patterns cannot see past the prefix, so strip it.
     */
    private static final Pattern FACET_PREFIX =
            Pattern.compile("^(form|genre|place|time|person|subject):\\s*", Pattern.CASE_INSENSITIVE);

    /** Strips subjects that describe the record rather than the book. */
    public List<String> denoise(List<String> subjects) {
        if (subjects == null) {
            return List.of();
        }
        return subjects.stream()
                .map(TextNormaliser::tidyDisplay)
                .filter(Objects::nonNull)
                .filter(s -> noise.stream().noneMatch(p -> p.matcher(s).find()))
                .map(s -> FACET_PREFIX.matcher(s).replaceFirst(""))
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();
    }

    public GenreMapping map(List<String> rawSubjects, boolean isDemoBook) {
        List<String> clean = denoise(rawSubjects);
        List<String> normalised = clean.stream().map(TextNormaliser::searchable).toList();

        // Rank by how many subjects support each genre; strong matches outweigh weak.
        Map<String, Integer> strongHits = new LinkedHashMap<>();
        Map<String, Integer> weakHits = new LinkedHashMap<>();
        for (Rule rule : rules) {
            for (String subject : normalised) {
                if (rule.strong().stream().anyMatch(p -> p.matcher(subject).find())) {
                    strongHits.merge(rule.slug(), 1, Integer::sum);
                } else if (rule.weak().stream().anyMatch(p -> p.matcher(subject).find())) {
                    weakHits.merge(rule.slug(), 1, Integer::sum);
                }
            }
        }

        List<String> ranked = new ArrayList<>(strongHits.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .map(Map.Entry::getKey)
                .toList());
        boolean strongFound = !ranked.isEmpty();
        if (!strongFound) {
            ranked.addAll(weakHits.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .map(Map.Entry::getKey)
                    .toList());
        }

        List<Anomaly> anomalies = new ArrayList<>();
        if (ranked.size() >= TOO_MANY_THRESHOLD) {
            anomalies.add(Anomaly.TOO_MANY_GENRES);
        }
        if (hasConflict(ranked)) {
            anomalies.add(Anomaly.CONFLICTING_GENRES);
        }

        List<String> accepted = ranked.stream().limit(MAX_GENRES).toList();
        List<String> dropped = ranked.stream().skip(MAX_GENRES).toList();

        double confidence = confidenceOf(strongFound, strongHits, accepted, clean.size());
        if (accepted.isEmpty()) {
            anomalies.add(Anomaly.NO_GENRE);
        } else if (confidence < 0.4) {
            anomalies.add(Anomaly.LOW_CONFIDENCE);
        }
        if (isDemoBook) {
            anomalies.add(Anomaly.DEMO_BOOK);
        }

        return new GenreMapping(accepted, dropped, List.copyOf(anomalies), confidence);
    }

    private boolean hasConflict(List<String> genres) {
        Set<String> set = new HashSet<>(genres);
        return conflicts.stream().anyMatch(set::containsAll);
    }

    private double confidenceOf(boolean strongFound, Map<String, Integer> strongHits,
                                List<String> accepted, int subjectCount) {
        if (accepted.isEmpty()) {
            return 0.0;
        }
        if (!strongFound) {
            return 0.25; // weak patterns only
        }
        int support = accepted.stream().mapToInt(g -> strongHits.getOrDefault(g, 0)).sum();
        double base = 0.5 + Math.min(0.4, support * 0.1);
        // A single subject supporting a genre is weaker evidence than several.
        return subjectCount <= 2 ? Math.min(base, 0.5) : base;
    }
}
