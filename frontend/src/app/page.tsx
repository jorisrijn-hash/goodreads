import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { AboutSection } from "@/components/landing/AboutSection";
import { AnywhereSection } from "@/components/landing/AnywhereSection";
import { ChapterIndex } from "@/components/landing/ChapterIndex";
import type { CollageBook, CollagePlacement } from "@/components/landing/CoverCollage";
import { DiscoverSection } from "@/components/landing/DiscoverSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { LandingHero } from "@/components/landing/LandingHero";
import { LibrarySection } from "@/components/landing/LibrarySection";
import {
  ANYWHERE_BOOK, COVER_RATIO, EXAMPLE_LIBRARY, HERO_BOOKS, HERO_BOOKS_MOBILE, HERO_FRAGMENT,
  HOW_IT_WORKS_QUERY, HOW_SHELF, LANDING_SLUGS, TYPO_EXAMPLE,
} from "@/content/selected";
import type { BookDetail, BookPage, Genre } from "@/lib/api";
import { fetchCatalogueStats, fetchPublic } from "@/lib/server-api";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/*
 * The hero covers, as positions in the collage box (from 43% of the page frame to the
 * right edge of the window). Covers are capped in rem: the stored files are about 320px
 * wide. Circe stands tallest; Project Hail Mary is cut by the edge of the window.
 * depth: how strongly each answers the pointer (back 0.3, front 1).
 */
const DESKTOP: Record<string, CollagePlacement> = {
  // Standing on the floor of the box, at slightly different depths.
  "dune-ol893414w": { left: "3%", bottom: "4%", width: "min(27cqw, 15.5rem)", rotate: -2.5, z: 3, depth: 0.85 },
  "the-secret-history-ol4321141w": { left: "25%", bottom: "11%", width: "min(23cqw, 13.25rem)", rotate: 1, z: 2, depth: 0.35 },
  "circe-ol18012166w": { left: "45%", bottom: "7%", width: "min(29cqw, 16.5rem)", rotate: 0.5, z: 4, depth: 1 },
  "project-hail-mary-ol21745884w": { left: "72%", bottom: "5%", width: "min(26cqw, 14.75rem)", rotate: 2.5, z: 3, depth: 0.6 },
};

const MOBILE: Record<string, CollagePlacement> = {
  "dune-ol893414w": { left: "0%", top: "14%", width: "min(34vw, 10rem)", rotate: -2.5, z: 2, depth: 0 },
  "circe-ol18012166w": { left: "30%", top: "0%", width: "min(40vw, 12rem)", rotate: 0.5, z: 3, depth: 0 },
  "project-hail-mary-ol21745884w": { left: "64%", top: "12%", width: "min(34vw, 10rem)", rotate: 2.5, z: 2, depth: 0 },
};

/** First sentences of a description, cut at a sentence end near `max` characters. */
function opening(text: string | null, max = 430): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return end > 120 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/**
 * The landing page: five chapters of one composition, then the project notes.
 *
 * Every number, cover and search result comes from the API, fetched once on the server.
 * What is chosen by hand is which books appear in the composed scenes (the SELECTED
 * list), and the page says so. Nothing on the page writes anything.
 */
export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/home");

  const book = (slug: string) => fetchPublic<BookDetail>(`/api/v1/books/${slug}`, 3600);
  const [stats, genres, typo, herbert, ...selected] = await Promise.all([
    fetchCatalogueStats(),
    fetchPublic<Genre[]>("/api/v1/genres", 21600),
    fetchPublic<BookPage>(`/api/v1/books?q=${encodeURIComponent(TYPO_EXAMPLE)}&size=4`, 3600),
    fetchPublic<BookPage>(`/api/v1/books?q=${encodeURIComponent(HOW_IT_WORKS_QUERY)}&size=4`, 3600),
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
  const fragmentBook = find(HERO_FRAGMENT);
  const fragmentText = opening(fragmentBook?.description ?? null);
  const anywhere = find(ANYWHERE_BOOK);

  return (
    <PublicShell bare>
      <LandingHero
        books={collage(HERO_BOOKS, DESKTOP)}
        mobileBooks={collage(HERO_BOOKS_MOBILE, MOBILE)}
        stats={stats}
        fragment={fragmentBook && fragmentText ? { title: `${fragmentBook.title}, ${fragmentBook.authors[0] ?? ""}`, text: fragmentText } : null}
      />
      <DiscoverSection stats={stats} genres={genres} typo={typo} typoQuery={TYPO_EXAMPLE} />
      <LibrarySection entries={library} />
      <HowItWorksSection dune={find("dune-ol893414w")} herbert={herbert} shelf={HOW_SHELF.flatMap((s) => find(s) ?? [])} />
      <AnywhereSection book={anywhere ? { book: anywhere, ratio: ratio(ANYWHERE_BOOK) } : null} />
      <AboutSection />
      {/* Last in the document so keyboard order reaches the page content first. */}
      <ChapterIndex />
    </PublicShell>
  );
}
