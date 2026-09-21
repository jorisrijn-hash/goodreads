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
  // Two fragments of one photograph, used like an art book spreads a single image:
  // the timber vault as a tall strip beside Discover, the shelves beside the close.
  {
    id: "library-vault",
    unsplash: "TIS8AnSiFI4",
    crop: { left: 640, top: 0, width: 1120, height: 3200 },
    widths: [420, 760],
  },
  {
    id: "library-shelves",
    unsplash: "TIS8AnSiFI4",
    crop: { left: 1080, top: 1500, width: 1320, height: 1700 },
    widths: [560, 1000],
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
