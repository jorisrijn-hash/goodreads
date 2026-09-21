// Prepares the brand marks from the supplied originals in brand/source/.
//
//   node scripts/prepare-brand.mjs
//
// The originals are flat images: ink on white (wordmark) and ink on beige (the "g").
// Each mark is separated from its background by its ink coverage — alpha is how far a
// pixel is from the background towards the ink — so the shape and its anti-aliasing are
// kept exactly and the colour is the original ink. Nothing is redrawn. An ivory copy is
// made for dark surfaces, and the favicon set is built from the "g" on its own beige.
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const INK = [0x1e, 0x19, 0x15]; // sampled from the supplied wordmark
const IVORY = [0xf4, 0xf0, 0xe7];

/** The mark alone, on transparency, in the given colour. */
async function isolate(file, background, colour) {
  // Flatten onto the background first: the wordmark's transparent corners are stored as
  // transparent black, which would otherwise read as solid ink.
  const { data, info } = await sharp(file)
    .flatten({ background: { r: background[0], g: background[1], b: background[2] } })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const bg = lum(...background), ink = lum(...INK);
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const coverage = Math.max(0, Math.min(1, (bg - lum(data[i], data[i + 1], data[i + 2])) / (bg - ink)));
    out[o] = colour[0]; out[o + 1] = colour[1]; out[o + 2] = colour[2];
    out[o + 3] = Math.round(coverage * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim();
}

const wordmarkSrc = "brand/source/goodreads-wordmark.png";
const gSrc = "brand/source/goodreads-g.png";
const GBG = [0xeb, 0xe2, 0xd7];

for (const [name, colour] of [["ink", INK], ["ivory", IVORY]]) {
  const wordmark = await (await isolate(wordmarkSrc, [255, 255, 255], colour)).png().toBuffer();
  await writeFile(`public/brand/goodreads-wordmark-${name}.png`, wordmark);
  const g = await (await isolate(gSrc, GBG, colour)).png().toBuffer();
  await writeFile(`public/brand/goodreads-g-${name}.png`, g);
  const w = await sharp(wordmark).metadata(), m = await sharp(g).metadata();
  console.log(`${name}: wordmark ${w.width}x${w.height}, g ${m.width}x${m.height}`);
}

// Icons: the "g" on its own beige square, scaled so the glyph fills `fill` of the box —
// more at tiny sizes, where breathing room costs legibility; less for the home screen,
// where iOS rounds the corners.
const glyph = await (await isolate(gSrc, GBG, INK)).png().toBuffer();
const { width: gw, height: gh } = await sharp(glyph).metadata();
async function icon(size, fill) {
  const target = Math.round(size * fill);
  const scaled = await sharp(glyph).resize({ width: Math.round(target * gw / Math.max(gw, gh)), height: Math.round(target * gh / Math.max(gw, gh)) }).toBuffer();
  const m = await sharp(scaled).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: GBG[0], g: GBG[1], b: GBG[2], alpha: 1 } } })
    .composite([{ input: scaled, left: Math.round((size - m.width) / 2), top: Math.round((size - m.height) / 2) }])
    .png().toBuffer();
}

// favicon.ico: PNG-encoded entries at 16, 32 and 48 (the ICO container allows PNG data).
const sizes = [[16, 0.86], [32, 0.8], [48, 0.76]];
const pngs = await Promise.all(sizes.map(([s, f]) => icon(s, f)));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const e = 6 + i * 16, s = sizes[i][0];
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
await writeFile("src/app/favicon.ico", Buffer.concat([header, ...pngs]));
await writeFile("src/app/icon.png", await icon(192, 0.7));
await writeFile("src/app/apple-icon.png", await icon(180, 0.62));
console.log("favicon.ico (16, 32, 48), icon.png 192, apple-icon.png 180");
