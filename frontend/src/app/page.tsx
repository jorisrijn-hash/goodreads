import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { ClosingSection } from "@/components/landing/ClosingSection";
import { DiscoverSection } from "@/components/landing/DiscoverSection";
import type { Placement, ShelfBook } from "@/components/landing/HeroShelf";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { LandingHero } from "@/components/landing/LandingHero";
import { LibrarySection } from "@/components/landing/LibrarySection";
import { EXAMPLE_LIBRARY, HERO_BOOKS, HERO_BOOKS_MOBILE, TYPO_EXAMPLE } from "@/content/selected";
import type { BookDetail, BookPage, Genre } from "@/lib/api";
import { fetchCatalogueStats, fetchPublic } from "@/lib/server-api";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/*
 * Where each selected book stands on the desktop ledge, left to right. Widths are capped
 * in rem because the stored covers are about 320px wide: past ~14rem they would be
 * upscaled on a high-density screen. Back books turn to show their fore-edge; the front
 * one faces the reader.
 */
const DESKTOP: Placement[] = [
  // Klara and the Sun, Beloved: turned spine-out at the end of the row.
  { left: "4%", width: "min(17cqw, 8.75rem)", turn: 62, depth: 0.35, z: 1 },
  { left: "12%", width: "min(19cqw, 9.75rem)", turn: 48, depth: 0.45, z: 2 },
  // The Secret History, angled toward the centre.
  { left: "23%", width: "min(23cqw, 11.75rem)", turn: 26, depth: 0.65, z: 3 },
  // Circe faces the reader: the front of the composition.
  { left: "43%", width: "min(27cqw, 14rem)", turn: -2, depth: 1, z: 5 },
  // Dune and Project Hail Mary turn away, showing their pages.
  { left: "65%", width: "min(23cqw, 11.75rem)", turn: -26, depth: 0.65, z: 4 },
  { left: "81%", width: "min(19cqw, 9.75rem)", turn: -50, depth: 0.45, z: 3 },
  // The Creative Act: small, standing in front where two books meet.
  { left: "18%", width: "min(11cqw, 5.75rem)", turn: 12, depth: 1, z: 6, bottom: "-12px" },
];

const MOBILE: Placement[] = [
  { left: "9%", width: "min(28vw, 7.5rem)", turn: 30, depth: 0, z: 1 },
  { left: "35%", width: "min(33vw, 9rem)", turn: -2, depth: 0, z: 3 },
  { left: "63%", width: "min(28vw, 7.5rem)", turn: -30, depth: 0, z: 2 },
];

/**
 * The landing page: five chapters, alternating light and dark.
 *
 * Every number and every cover comes from the API. What is chosen by hand is which books
 * appear in the composed scenes — the SELECTED list — and the page says so.
 */
export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/home");

  const book = (slug: string) => fetchPublic<BookDetail>(`/api/v1/books/${slug}`, 3600);
  const [stats, genres, typo, ...selected] = await Promise.all([
    fetchCatalogueStats(),
    fetchPublic<Genre[]>("/api/v1/genres", 21600),
    fetchPublic<BookPage>(`/api/v1/books?q=${encodeURIComponent(TYPO_EXAMPLE)}&size=3`, 3600),
    ...HERO_BOOKS.map((b) => book(b.slug)),
  ]);

  const bySlug = new Map(selected.filter((b): b is BookDetail => b !== null).map((b) => [b.slug, b]));

  // A missing book leaves a gap in the arrangement rather than shifting everyone along.
  const heroBooks: ShelfBook[] = HERO_BOOKS.flatMap((entry, i) => {
    const found = bySlug.get(entry.slug);
    return found ? [{ book: found, ratio: entry.ratio, placement: DESKTOP[i] }] : [];
  });
  const mobileBooks: ShelfBook[] = HERO_BOOKS_MOBILE.flatMap((slug, i) => {
    const found = bySlug.get(slug);
    const ratio = HERO_BOOKS.find((b) => b.slug === slug)?.ratio ?? 2 / 3;
    return found ? [{ book: found, ratio, placement: MOBILE[i] }] : [];
  });
  const library = EXAMPLE_LIBRARY.flatMap(({ slug, status }) => {
    const found = bySlug.get(slug);
    return found ? [{ book: { ...found, genres: found.genres.map((g) => g.slug) }, status }] : [];
  });

  return (
    <PublicShell bare>
      <LandingHero books={heroBooks} mobileBooks={mobileBooks} stats={stats} />
      <DiscoverSection stats={stats} genres={genres} typo={typo} typoQuery={TYPO_EXAMPLE} />
      <LibrarySection entries={library} />
      <HowItWorksSection />
      <ClosingSection />
    </PublicShell>
  );
}
