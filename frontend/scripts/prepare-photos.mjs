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

const PHOTOS = [
  // The Old Library at Trinity College Dublin, Michaela Murphy. One photograph used as a
  // tall strip of vault; its companion below is the same library's bust and shelves.
  {
    id: "library-vault",
    unsplash: "TIS8AnSiFI4",
    crop: { left: 640, top: 0, width: 1120, height: 3200 },
    widths: [420, 760],
  },
  {
    id: "library-bust",
    unsplash: "X4Xgm-kWpYY",
    crop: { left: 0, top: 0, width: 2400, height: 3584 },
    widths: [640, 1100],
    grade: { saturation: 0.8, brightness: 0.95 },
  },
  // Leaves photographed on white, cut out: the white becomes transparent and the soft
  // shadow under each leaf is kept as a transparent shade, so it still falls naturally.
  {
    id: "leaf-pair",
    unsplash: "_mUVHhvBYZ0",
    cutout: true,
    crop: { left: 380, top: 180, width: 1680, height: 2020 },
    widths: [400, 800],
  },
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

for (const photo of PHOTOS) {
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
  if (photo.grade) cropped = cropped.modulate(photo.grade);
  if (photo.cutout) cropped = await cutout(cropped);
  for (const width of photo.widths) {
    const resized = cropped.clone().resize({ width }).toColourspace("srgb");
    const avif = await resized.clone().avif({ quality: 48, effort: 7 }).toBuffer();
    const webp = await resized.clone().webp({ quality: 72, effort: 6 }).toBuffer();
    await writeFile(`${OUT}/${photo.id}-${width}.avif`, avif);
    await writeFile(`${OUT}/${photo.id}-${width}.webp`, webp);
    const { height } = await sharp(avif).metadata();
    console.log(`${photo.id}-${width}: ${width}x${height}  avif ${(avif.length / 1024).toFixed(0)} kB  webp ${(webp.length / 1024).toFixed(0)} kB`);
  }
}
