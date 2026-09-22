import type { Metadata } from "next";
import { Caveat, Inter, Literata } from "next/font/google";
import "./globals.css";

/*
 * Literata is designed for long-form reading, which suits a product about books.
 * Inter carries the interface. Both are variable and subset to Latin; `display: swap`
 * means text is readable before the webfont arrives rather than invisible.
 */
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  display: "swap",
});

// Italic is used deliberately (captions), not synthesised by the browser — but only
// below the fold, so it is not preloaded: preloading it competed with the landing
// hero for bandwidth on a slow connection.
const literataItalic = Literata({
  variable: "--font-literata-italic",
  subsets: ["latin"],
  style: "italic",
  display: "swap",
  preload: false,
});

// Handwriting, for short factual annotations on the landing page only. Decorative, so
// not preloaded: it must never compete with the headline for bandwidth.
const hand = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "A better home for your reading life",
  description:
    "An independent Goodreads redesign and software-engineering case study. Not affiliated with Goodreads or Amazon.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${literata.variable} ${literataItalic.variable} ${hand.variable} ${inter.variable}`}>
      <head>
        {/* Entrances start hidden and some wait for JavaScript; without it, show everything. */}
        <noscript>
          <style>{`[data-reveal],[data-motion-initial],.seq,.seq-line>span,.unfold__item,.collage-item,.collage-enter,.lib-book{opacity:1!important;transform:none!important;animation:none!important}.draw-rule{transform:none!important}.edge--stitch{clip-path:none!important}.plate .plate__frame{clip-path:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
