import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { ClosingSection } from "@/components/landing/ClosingSection";
import { DiscoverSection } from "@/components/landing/DiscoverSection";
import type { CollageBook, CollagePlacement } from "@/components/landing/CoverCollage";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { LandingHero } from "@/components/landing/LandingHero";
import { LibrarySection } from "@/components/landing/LibrarySection";
import { CLOSING_SHELF, COVER_RATIO, EXAMPLE_LIBRARY, HERO_BOOKS, HERO_BOOKS_MOBILE, HOW_IT_WORKS_QUERY, LANDING_SLUGS, TYPO_EXAMPLE } from "@/content/selected";
import type { BookDetail, BookPage, Genre } from "@/lib/api";
import { fetchCatalogueStats, fetchPublic } from "@/lib/server-api";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/*
 * The desktop mosaic, back to front, as positions in the collage box (which runs from
 * just under half-way across the page frame to the right edge of the window). Covers
 * are capped in rem: the stored files are about 320px wide and would soften much past
 * 15rem on a high-density screen. Piranesi runs off the edge; Klara reaches toward the
 * copy; The Creative Act, whose file is small, stays small.
 */
const DESKTOP: Record<string, CollagePlacement> = {
  "piranesi-ol20893680w": { left: "84%", top: "28%", width: "min(20cqw, 11rem)", rotate: 1.5, z: 1, depth: 0.35 },
  "normal-people-ol20150260w": { left: "52%", top: "6%", width: "min(18cqw, 10rem)", rotate: 2, z: 2, depth: 0.45 },
  "klara-and-the-sun-ol20883297w": { left: "0%", top: "48%", width: "min(17cqw, 9.5rem)", rotate: -1.5, z: 3, depth: 0.55 },
  "project-hail-mary-ol21745884w": { left: "56%", top: "52%", width: "min(21cqw, 11.5rem)", rotate: -2, z: 5, depth: 0.7 },
  "circe-ol18012166w": { left: "22%", top: "20%", width: "min(27cqw, 15rem)", rotate: -0.8, z: 4, depth: 1 },
  "the-creative-act-ol27955361w": { left: "9%", top: "12%", width: "min(11cqw, 6rem)", rotate: -2.5, z: 2, depth: 0.5 },
};

const MOBILE: Record<string, CollagePlacement> = {
  "klara-and-the-sun-ol20883297w": { left: "0%", top: "30%", width: "min(26vw, 8rem)", rotate: -2, z: 2, depth: 0 },
  "normal-people-ol20150260w": { left: "62%", top: "0%", width: "min(26vw, 8rem)", rotate: 2, z: 1, depth: 0 },
  "circe-ol18012166w": { left: "25%", top: "6%", width: "min(38vw, 11rem)", rotate: -1, z: 3, depth: 0 },
  "project-hail-mary-ol21745884w": { left: "68%", top: "40%", width: "min(28vw, 8.5rem)", rotate: -2.5, z: 4, depth: 0 },
};

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/home");

  const book = (slug: string) => fetchPublic<BookDetail>(`/api/v1/books/${slug}`, 3600);
  const [stats, genres, typo, herbert, ...selected] = await Promise.all([
    fetchCatalogueStats(),
    fetchPublic<Genre[]>("/api/v1/genres", 21600),
    fetchPublic<BookPage>(`/api/v1/books?q=${encodeURIComponent(TYPO_EXAMPLE)}&size=3`, 3600),
    fetchPublic<BookPage>(`/api/v1/books?q=${encodeURIComponent(HOW_IT_WORKS_QUERY)}&size=3`, 3600),
    ...LANDING_SLUGS.map((slug) => book(slug)),
  ]);

  const bySlug = new Map(selected.filter((b): b is BookDetail => b !== null).map((b) => [b.slug, b]));

  const find = (slug: string) => bySlug.get(slug) ?? null;
  const ratio = (slug: string) => COVER_RATIO[slug] ?? 2 / 3;
  // A missing book leaves a gap in the arrangement rather than shifting the others.
  const collage = (slugs: string[], places: Record<string, CollagePlacement>): CollageBook[] =>
    slugs.flatMap((slug) => {
      const found = find(slug);
      return found ? [{ book: found, ratio: ratio(slug), placement: places[slug] }] : [];
    });
  const library = EXAMPLE_LIBRARY.flatMap(({ slug, status }) => {
    const found = find(slug);
    return found ? [{ book: found, status, ratio: ratio(slug) }] : [];
  });

  return (
    <PublicShell bare>
      <LandingHero books={collage(HERO_BOOKS, DESKTOP)} mobileBooks={collage(HERO_BOOKS_MOBILE, MOBILE)} stats={stats} />
      <DiscoverSection stats={stats} genres={genres} typo={typo} typoQuery={TYPO_EXAMPLE} />
      <LibrarySection entries={library} />
      <HowItWorksSection
        dune={find("dune-ol893414w")}
        herbert={herbert}
        shelf={["the-secret-history-ol4321141w", "crying-in-h-mart-ol22448002w", "the-song-of-achilles-ol16509148w"].flatMap((slug) => find(slug) ?? [])}
      />
      <ClosingSection books={CLOSING_SHELF.flatMap((slug) => { const b = find(slug); return b ? [{ book: b, ratio: ratio(slug) }] : []; })} />
    </PublicShell>
  );
}
