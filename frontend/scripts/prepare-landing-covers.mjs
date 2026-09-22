// Full-resolution covers for the landing page (see src/content/landing-covers.ts).
//
//   node scripts/prepare-landing-covers.mjs
//
// Downloads each original from Open Library once (cached in .photo-cache/, gitignored),
// then writes AVIF and WebP at the listed widths to public/covers-hq/. Covers are not
// graded or retouched: they are shown as printed. Prints each file's real ratio, which
// the manifest must match.
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const src = await readFile("src/content/landing-covers.ts", "utf8");
const entries = [...src.matchAll(/slug: "([^"]+)", coverId: (\d+)/g)].map((m) => ({ slug: m[1], id: m[2] }));
// 200 is for the sign-in scene's phone strip (covers drawn ~80px wide); the landing's own
// srcsets list only the widths in content/landing-covers.ts, so it never picks it.
const widths = [200, 320, 560, 840];
await mkdir(".photo-cache", { recursive: true });
await mkdir("public/covers-hq", { recursive: true });

for (const { slug, id } of entries) {
  const original = `.photo-cache/cover-${id}.jpg`;
  try { await access(original); } catch {
    const res = await fetch(`https://covers.openlibrary.org/b/id/${id}.jpg`, { headers: { "User-Agent": "goodreads-redesign case study (jorisvrr@gmail.com)" } });
    if (!res.ok) throw new Error(`cover ${id}: ${res.status}`);
    await writeFile(original, Buffer.from(await res.arrayBuffer()));
    await new Promise((r) => setTimeout(r, 700));
  }
  const image = sharp(await readFile(original)).rotate();
  const { width, height } = await image.metadata();
  const sizes = [];
  for (const w of widths) {
    const resized = image.clone().resize({ width: Math.min(w, width), withoutEnlargement: true });
    const avif = await resized.clone().avif({ quality: 62, effort: 6 }).toBuffer();
    const webp = await resized.clone().webp({ quality: 82 }).toBuffer();
    await writeFile(`public/covers-hq/${slug}-${w}.avif`, avif);
    await writeFile(`public/covers-hq/${slug}-${w}.webp`, webp);
    sizes.push(`${w}:${(avif.length / 1024).toFixed(0)}k`);
  }
  console.log(`${slug.padEnd(48)} ${width}x${height} ratio ${(width / height).toFixed(4)}  ${sizes.join(" ")}`);
}
