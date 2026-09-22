// Prepares the product's photographs: download, crop, encode, self-host.
//
//   node scripts/prepare-photos.mjs
//
// Each source is fetched through Unsplash's official download endpoint (which is also how
// Unsplash asks for downloads to be attributed), cropped to the shape it is shown in, and
// written to public/photography as AVIF and WebP at two widths. Originals are cached in
// .photo-cache/ (gitignored) and never committed. Credits live in
// src/content/photography.ts; add the photo there as well as here.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import sharp from "sharp";

/*
 * One world: atmospheric photographs share a restrained grade (warm afternoon, slightly
 * desaturated, cream highlights, lifted rather than crushed blacks). Book covers are never
 * graded; they are shown as printed. Crops are made per layout rather than one crop
 * forced everywhere. Sources are the 3600px downloads.
 */
const WORLD = { saturation: 0.86, warm: [1.035, 1.0, 0.93], lift: 7 };

const PHOTOS = [
  // Discover, desktop: the bust and the shelves behind it, as a tall right-hand field.
  { id: "library-bust", unsplash: "X4Xgm-kWpYY", crop: { left: 0, top: 380, width: 3600, height: 4000 }, widths: [900, 1400, 1900], grade: WORLD, quality: 60 },
  // Discover, phones: shelves above the head, the bust low in the frame, behind the text.
  { id: "library-bust-tall", unsplash: "X4Xgm-kWpYY", crop: { left: 700, top: 0, width: 2900, height: 5378 }, widths: [600, 900], grade: WORLD, quality: 58 },
  // The Old Library's vault: small prints in the library and how-it-works chapters.
  { id: "library-vault", unsplash: "TIS8AnSiFI4", crop: { left: 960, top: 0, width: 1680, height: 2600 }, widths: [360, 600], grade: WORLD, quality: 62 },
  // The leaf, cut out, lightly graded to sit in the same light.
  { id: "leaf-pair", unsplash: "_mUVHhvBYZ0", cutout: true, crop: { left: 570, top: 270, width: 2520, height: 3030 }, widths: [400, 800], grade: { saturation: 0.92, warm: [1.02, 1.0, 0.95], lift: 0 }, quality: 64 },
];

/** White to transparent. Saturated pixels are leaf; grey ones are its shadow, kept as translucent ink. */
async function cutout(image) {
  const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const light = (max + min) / 2;
    const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1));
    const leaf = Math.min(1, Math.max(0, (sat - 0.12) * 4));
    const shade = Math.min(1, Math.max(0, (0.97 - light) * 2.2));
    let alpha = Math.max(leaf, shade * (1 - leaf));
    // Defringe: the anti-aliased rim is pale where it blended with the white; fade it out
    // so the leaf has no halo on a dark ground.
    if (leaf > 0.5 && light > 0.72) alpha *= Math.max(0, (0.9 - light) / 0.18);
    // Leaf keeps its colour; shadow becomes ink, so it darkens whatever it falls on.
    const mix = leaf;
    out[o] = Math.round(data[i] * mix + 22 * (1 - mix));
    out[o + 1] = Math.round(data[i + 1] * mix + 20 * (1 - mix));
    out[o + 2] = Math.round(data[i + 2] * mix + 16 * (1 - mix));
    out[o + 3] = Math.round(alpha * 255 * (mix > 0.5 ? 1 : 0.55));
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
}

const CACHE = ".photo-cache";
const OUT = "public/photography";
await mkdir(CACHE, { recursive: true });
await mkdir(OUT, { recursive: true });

// `--plates` prepares only the plates below; the photographs above are already committed.
for (const photo of process.argv.includes("--plates") ? [] : PHOTOS) {
  const original = `${CACHE}/${photo.unsplash}.jpg`;
  try {
    await access(original);
  } catch {
    const response = await fetch(`https://unsplash.com/photos/${photo.unsplash}/download?w=2400`);
    if (!response.ok) throw new Error(`download ${photo.unsplash}: ${response.status}`);
    await writeFile(original, Buffer.from(await response.arrayBuffer()));
  }
  const meta = await sharp(await readFile(original)).metadata();
  const crop = { ...photo.crop, width: Math.min(photo.crop.width, meta.width - photo.crop.left), height: Math.min(photo.crop.height, meta.height - photo.crop.top) };
  let cropped = sharp(await readFile(original)).extract(crop);
  if (photo.grade) {
    const { saturation, warm, lift } = photo.grade;
    cropped = cropped.modulate({ saturation }).linear(warm, [lift, lift, lift * 0.6]);
  }
  if (photo.cutout) cropped = await cutout(cropped);
  for (const width of photo.widths) {
    const resized = cropped.clone().resize({ width }).toColourspace("srgb");
    const q = photo.quality ?? 58;
    const avif = await resized.clone().avif({ quality: q, effort: 7 }).toBuffer();
    const webp = await resized.clone().webp({ quality: Math.min(90, q + 20), effort: 6 }).toBuffer();
    await writeFile(`${OUT}/${photo.id}-${width}.avif`, avif);
    await writeFile(`${OUT}/${photo.id}-${width}.webp`, webp);
    const { height } = await sharp(avif).metadata();
    console.log(`${photo.id}-${width}: ${width}x${height}  avif ${(avif.length / 1024).toFixed(0)} kB  webp ${(webp.length / 1024).toFixed(0)} kB`);
  }
}

// ------------------------------------------------------------------------ plates --
// Plates (src/content/photography.ts, PLATES): one source each, crops described by ratio
// and focal point. Writes every crop at every listed width that the crop can honestly
// fill, and records what it wrote in src/content/plate-outputs.json, which the Plate
// component builds its srcset from. Run with `--plates` to skip the photographs above.
const { PLATES } = await import("../src/content/photography.ts");
const { cropRect } = await import("../src/content/photo-crop.ts");
const outputs = {};
for (const entry of PLATES) {
  const original = entry.source.kind === "unsplash" ? `${CACHE}/${entry.source.id}.jpg` : `${CACHE}/${entry.source.file}`;
  try {
    await access(original);
  } catch {
    if (entry.source.kind !== "unsplash") throw new Error(`${entry.id}: put the source at ${original}`);
    const response = await fetch(`https://unsplash.com/photos/${entry.source.id}/download?force=true`);
    if (!response.ok) throw new Error(`download ${entry.source.id}: ${response.status}`);
    await writeFile(original, Buffer.from(await response.arrayBuffer()));
  }
  const buffer = await readFile(original);
  const meta = await sharp(buffer).rotate().metadata();
  const native = meta.orientation >= 5 ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height };
  if (native.width !== entry.native.width || native.height !== entry.native.height) {
    console.warn(`${entry.id}: manifest says ${entry.native.width}x${entry.native.height}, file is ${native.width}x${native.height}`);
  }
  outputs[entry.id] = {};
  for (const [name, crop] of Object.entries(entry.crops)) {
    const rect = cropRect(native, crop.ratio, crop.focal);
    let cut = sharp(buffer).rotate().extract(rect);
    if (entry.grade === "world") cut = cut.modulate({ saturation: WORLD.saturation }).linear(WORLD.warm, [WORLD.lift, WORLD.lift, WORLD.lift * 0.6]);
    const written = [];
    for (const width of crop.widths.filter((w) => w <= rect.width)) {
      const resized = cut.clone().resize({ width }).toColourspace("srgb");
      const avif = await resized.clone().avif({ quality: 58, effort: 7 }).toBuffer();
      const webp = await resized.clone().webp({ quality: 78, effort: 6 }).toBuffer();
      await writeFile(`${OUT}/${entry.id}-${name}-${width}.avif`, avif);
      await writeFile(`${OUT}/${entry.id}-${name}-${width}.webp`, webp);
      const { height } = await sharp(avif).metadata();
      written.push({ width, height, avifBytes: avif.length, webpBytes: webp.length });
      console.log(`${entry.id}-${name}-${width}: ${width}x${height}  avif ${(avif.length / 1024).toFixed(0)} kB  webp ${(webp.length / 1024).toFixed(0)} kB  (crop ${rect.width}x${rect.height} of ${native.width}x${native.height})`);
    }
    if (written.length < crop.widths.length) console.warn(`${entry.id}-${name}: source too small for ${crop.widths.filter((w) => w > rect.width).join(", ")}; skipped rather than enlarged`);
    outputs[entry.id][name] = { ratio: crop.ratio, files: written };
  }
}
await writeFile("src/content/plate-outputs.json", JSON.stringify(outputs, null, 2) + "\n");
