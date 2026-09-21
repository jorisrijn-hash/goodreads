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
  {
    id: "wall-light",
    unsplash: "95baBTvQ5gI",
    // The lower two-thirds, where the leaf shadows fall; the landing hero shows it wide.
    crop: { left: 0, top: 800, width: 2400, height: 2400 },
    widths: [800, 1400],
    // The original reads olive; nudged toward the warm stone of the palette.
    grade: { hue: -14, saturation: 0.78, brightness: 1.02 },
  },
  {
    // The same photograph, cropped wide for the desktop hero, where it runs behind the
    // whole composition and fades into the page under the copy.
    id: "wall-wide",
    unsplash: "95baBTvQ5gI",
    crop: { left: 0, top: 1150, width: 2400, height: 1500 },
    widths: [1000, 1800],
    grade: { hue: -14, saturation: 0.78, brightness: 1.02 },
  },
  {
    id: "old-library",
    unsplash: "TIS8AnSiFI4",
    crop: { left: 0, top: 0, width: 2400, height: 3200 },
    widths: [640, 1100],
  },
];

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
  let cropped = sharp(await readFile(original)).extract(photo.crop);
  if (photo.grade) cropped = cropped.modulate(photo.grade);
  for (const width of photo.widths) {
    const resized = cropped.clone().resize({ width }).withMetadata({}).toColourspace("srgb");
    const avif = await resized.clone().avif({ quality: 48, effort: 7 }).toBuffer();
    const webp = await resized.clone().webp({ quality: 72, effort: 6 }).toBuffer();
    await writeFile(`${OUT}/${photo.id}-${width}.avif`, avif);
    await writeFile(`${OUT}/${photo.id}-${width}.webp`, webp);
    const { height } = await sharp(avif).metadata();
    console.log(`${photo.id}-${width}: ${width}x${height}  avif ${(avif.length / 1024).toFixed(0)} kB  webp ${(webp.length / 1024).toFixed(0)} kB`);
  }
}
