import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { ClosingSection } from "@/components/landing/ClosingSection";
import { DiscoverSection } from "@/components/landing/DiscoverSection";
import type { Placement, ShelfBook } from "@/components/landing/HeroShelf";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { LandingHero } from "@/components/landing/LandingHero";
import { LibrarySection } from "@/components/landing/LibrarySection";
import { EXAMPLE_LIBRARY, HERO_BOOKS, HERO_BOOKS_MOBILE, HOW_IT_WORKS_QUERY, TYPO_EXAMPLE } from "@/content/selected";
import type { BookDetail, BookPage, Genre } from "@/lib/api";
import { fetchCatalogueStats, fetchPublic } from "@/lib/server-api";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/*
 * Where each selected book stands on the desktop plinth, left to right, as fractions of
 * a stage that runs from a third of the way across the page to just past its right edge.
 * Widths are capped in rem because the stored covers are about 320px wide: much past
 * 16rem they would be visibly upscaled on a high-density screen. The ends of the row turn
 * to show spines and fore-edges; Circe faces the reader.
 */
const DESKTOP: Placement[] = [
  { left: "1%", width: "min(13cqw, 9.5rem)", turn: 64, depth: 0.3, z: 1 },
  { left: "8%", width: "min(15cqw, 11rem)", turn: 52, depth: 0.4, z: 2 },
  { left: "17.5%", width: "min(18cqw, 13rem)", turn: 30, depth: 0.6, z: 3 },
  { left: "35%", width: "min(22cqw, 16rem)", turn: -3, depth: 1, z: 5 },
  { left: "56%", width: "min(18cqw, 13.5rem)", turn: -22, depth: 0.6, z: 4 },
  { left: "73%", width: "min(15cqw, 11.5rem)", turn: -42, depth: 0.4, z: 3 },
  // The Creative Act: small, standing forward on the plinth's front edge.
  { left: "27.5%", width: "min(9cqw, 6.5rem)", turn: 12, depth: 1, z: 6, bottom: "-18px" },
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
  const [stats, genres, typo, herbert, ...selected] = await Promise.all([
    fetchCatalogueStats(),
    fetchPublic<Genre[]>("/api/v1/genres", 21600),
    fetchPublic<BookPage>(`/api/v1/books?q=${encodeURIComponent(TYPO_EXAMPLE)}&size=3`, 3600),
    fetchPublic<BookPage>(`/api/v1/books?q=${encodeURIComponent(HOW_IT_WORKS_QUERY)}&size=3`, 3600),
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
      <HowItWorksSection
        dune={bySlug.get("dune-ol893414w") ?? null}
        herbert={herbert}
        shelf={["the-secret-history-ol4321141w", "klara-and-the-sun-ol20883297w"].flatMap((slug) => bySlug.get(slug) ?? [])}
      />
      <ClosingSection books={["beloved-ol50548w", "the-secret-history-ol4321141w", "circe-ol18012166w", "dune-ol893414w", "project-hail-mary-ol21745884w"].flatMap((slug) => bySlug.get(slug) ?? [])} />
    </PublicShell>
  );
}
