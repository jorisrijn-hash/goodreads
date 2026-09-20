import type { Metadata } from "next";
import { Inter, Literata } from "next/font/google";
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
    <html lang="en" className={`${literata.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
