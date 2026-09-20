package dev.jorisvrr.reading.ingest;

import dev.jorisvrr.reading.ingest.model.Fetch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

/**
 * Stage 6 — download covers once and generate web derivatives.
 *
 * <p>The spike measured a 2.17s median fetch from Open Library's cover CDN, which is far
 * too slow to sit in a request path, so covers are never hotlinked. Files are stored
 * under a deterministic, object-storage-safe key so the same layout works unchanged when
 * this moves to R2/S3.
 *
 * <p>Layout: {@code covers/<shard>/<coverId>-<width>.jpg}, and {@code book.cover_key}
 * stores {@code covers/<shard>/<coverId>} — the client appends the width it needs.
 */
@Component
public class CoverStage {

    private static final Logger log = LoggerFactory.getLogger(CoverStage.class);

    /** Grid thumbnail, card, and detail-page hero. */
    public static final int[] WIDTHS = {160, 320, 640};
    private static final float JPEG_QUALITY = 0.82f;
    private static final int MIN_BYTES = 2000; // smaller responses are blank placeholders

    public enum Outcome {
        /** Derivatives already on disk — no request made. */
        CACHED,
        /** Downloaded and processed this run. */
        STORED,
        /** Open Library has no image for this cover id. Permanent. */
        NOT_FOUND,
        /** Network or server failure that survived all retries. Infrastructure, not data. */
        DOWNLOAD_FAILED,
        /** Bytes arrived but were unusable: undecodable, blank, or too small to be real. */
        PROCESSING_FAILED
    }

    /**
     * These outcomes are kept distinct because they are different problems: NOT_FOUND is
     * a gap in Open Library's data, DOWNLOAD_FAILED is a network issue on our side, and
     * PROCESSING_FAILED means we received something that is not a usable image.
     */
    public record Result(String coverKey, int bytesWritten, Outcome outcome, int retries) {

        public boolean stored() {
            return outcome == Outcome.CACHED || outcome == Outcome.STORED;
        }
    }

    private final OpenLibraryClient client;

    public CoverStage(OpenLibraryClient client) {
        this.client = client;
    }

    public static String coverKey(long coverId) {
        return "%s/%d".formatted(shard(coverId), coverId);
    }

    private static String shard(long coverId) {
        return String.format(Locale.ROOT, "%02x", Math.floorMod(coverId, 256));
    }

    /** A non-{@code stored()} result rejects the candidate; the outcome says why. */
    public Result download(Path storageRoot, long coverId) throws InterruptedException, IOException {
        String key = coverKey(coverId);
        Files.createDirectories(storageRoot.resolve(key).getParent());

        if (allDerivativesExist(storageRoot, key)) {
            return new Result(key, 0, Outcome.CACHED, 0);
        }

        Fetch<byte[]> fetch = client.getBytes(
                OpenLibraryClient.COVERS_BASE + "/b/id/" + coverId + "-L.jpg");
        if (fetch.status() == Fetch.Status.NOT_FOUND) {
            return new Result(null, 0, Outcome.NOT_FOUND, fetch.retries());
        }
        if (!fetch.ok()) {
            return new Result(null, 0, Outcome.DOWNLOAD_FAILED, fetch.retries());
        }

        byte[] source = fetch.value();
        // Open Library answers 200 with a tiny blank image when it has no real cover.
        if (source.length < MIN_BYTES) {
            return new Result(null, 0, Outcome.PROCESSING_FAILED, fetch.retries());
        }
        BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(source));
        } catch (IOException e) {
            return new Result(null, 0, Outcome.PROCESSING_FAILED, fetch.retries());
        }
        if (image == null || image.getWidth() < 50) {
            return new Result(null, 0, Outcome.PROCESSING_FAILED, fetch.retries());
        }

        int written = 0;
        for (int width : WIDTHS) {
            Path out = storageRoot.resolve(key + "-" + width + ".jpg");
            if (!writeJpeg(scaleToWidth(image, width), out)) {
                return new Result(null, 0, Outcome.PROCESSING_FAILED, fetch.retries());
            }
            written += (int) Files.size(out);
        }
        return new Result(key, written, Outcome.STORED, fetch.retries());
    }

    private boolean allDerivativesExist(Path root, String key) {
        for (int width : WIDTHS) {
            Path p = root.resolve(key + "-" + width + ".jpg");
            try {
                if (!Files.exists(p) || Files.size(p) == 0) {
                    return false;
                }
            } catch (IOException e) {
                return false;
            }
        }
        return true;
    }

    /** Never upscales — a small source stays small rather than becoming blurry. */
    private BufferedImage scaleToWidth(BufferedImage src, int targetWidth) {
        int width = Math.min(targetWidth, src.getWidth());
        int height = Math.max(1, Math.round(src.getHeight() * (width / (float) src.getWidth())));
        BufferedImage out = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(src.getScaledInstance(width, height, Image.SCALE_SMOOTH), 0, 0, null);
        g.dispose();
        return out;
    }

    private boolean writeJpeg(BufferedImage image, Path out) {
        try {
            var writers = ImageIO.getImageWritersByFormatName("jpeg");
            var writer = writers.next();
            var params = writer.getDefaultWriteParam();
            params.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
            params.setCompressionQuality(JPEG_QUALITY);
            try (var stream = ImageIO.createImageOutputStream(out.toFile())) {
                writer.setOutput(stream);
                writer.write(null, new javax.imageio.IIOImage(image, null, null), params);
            } finally {
                writer.dispose();
            }
            return true;
        } catch (IOException e) {
            log.warn("cover write failed: {}", out, e);
            return false;
        }
    }
}
