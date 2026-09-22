// Screenshots of the real product, for places the landing page shows it on a device.
//
//   node scripts/prepare-product-shots.mjs [baseUrl]
//
// Taken from the running site (production by default) at a phone viewport, so the phone
// on the landing page shows exactly what a visitor's phone would. Re-run after the pages
// it shows are redesigned. Also writes the QR code that opens the site.
import { writeFile } from "node:fs/promises";
import { chromium, devices } from "@playwright/test";
import QRCode from "qrcode";
import sharp from "sharp";

const BASE = process.argv[2] ?? "https://goodreads-rose.vercel.app";
const SHOTS = [{ id: "mobile-book", path: "/book/dune-ol893414w" }];

const browser = await chromium.launch();
const page = await (await browser.newContext({ ...devices["iPhone 13"], reducedMotion: "reduce" })).newPage();
for (const shot of SHOTS) {
  await page.goto(BASE + shot.path, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // The whole top of the page at the phone screen's own proportion (about 390 x 830),
  // not just the browser viewport, so the phone frame crops nothing at the sides.
  const png = await page.screenshot({ fullPage: true, clip: { x: 0, y: 0, width: 390, height: 830 } });
  for (const width of [600, 900, 1170]) {
    const resized = sharp(png).resize({ width });
    await writeFile(`public/product/${shot.id}-${width}.avif`, await resized.clone().avif({ quality: 64 }).toBuffer());
    await writeFile(`public/product/${shot.id}-${width}.webp`, await resized.clone().webp({ quality: 84 }).toBuffer());
  }
  const { width, height } = await sharp(png).metadata();
  console.log(`${shot.id}: ${width}x${height} from ${shot.path}`);
}
await browser.close();

const svg = await QRCode.toString("https://goodreads-rose.vercel.app/", {
  type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#191815", light: "#0000" },
});
await writeFile("public/product/qr-site.svg", svg);
console.log("qr-site.svg -> https://goodreads-rose.vercel.app/");
