import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PublicShell } from "@/components/PublicShell";
import { SearchInput } from "@/components/SearchInput";
import { WakingUp } from "@/components/WakingUp";
import { CatalogueGrid } from "@/components/discover/CatalogueGrid";
import { FilterSort } from "@/components/discover/FilterSort";
import { GenreRail, type RailItem } from "@/components/discover/GenreRail";
import {
  apiQuery, clean, discoverHref, lengthLabel, PAGE_SIZE, type DiscoverParams,
} from "@/components/discover/params";
import { Leaf } from "@/components/landing/Leaf";
import type { Book, BookPage, Genre } from "@/lib/api";
import { fetchCatalogueStats, fetchPublicResult } from "@/lib/server-api";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

/**
 * The genres shown as cover compositions. Chosen for breadth (fiction and non-fiction,
 * old and new), not ranked; every genre is still in the index beneath the rail.
 */
const RAIL = ["classics", "fantasy", "romance", "thriller", "science-fiction", "biography-memoir"];

/**
 * Discover is one catalogue page: genres, the title and search, filter and sort, then the
 * grid. Browsing and searching are the same view; the difference is only which of the
 * URL's parameters are set, and every one of them maps straight onto the books API.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = clean(await searchParams);
  const page = Math.max(0, Math.floor(Number(params.page ?? 0)) || 0);

  const [user, results, genresResult, stats, rail] = await Promise.all([
    getCurrentUser(),
    fetchPublicResult<BookPage>(apiQuery(params, page), 0),
    fetchPublicResult<Genre[]>("/api/v1/genres", 21600),
    fetchCatalogueStats(),
    railCovers(),
  ]);

  const genres = genresResult.kind === "ok" ? genresResult.data : [];
  const railItems: RailItem[] = RAIL.flatMap((slug) => {
    const genre = genres.find((g) => g.slug === slug);
    const covers = rail.get(slug) ?? [];
    return genre && covers.length === 3 ? [{ genre, covers }] : [];
  });

  const body =
    results.kind === "unavailable" && genresResult.kind === "unavailable" ? (
      <WakingUp what="the catalogue" />
    ) : (
      <Catalogue
        params={params}
        page={page}
        results={results.kind === "ok" ? results.data : null}
        unavailable={results.kind === "unavailable"}
        genres={genres}
        railItems={railItems}
        stats={stats}
      />
    );

  return user ? <AppShell user={user}>{body}</AppShell> : <PublicShell>{body}</PublicShell>;
}

/**
 * Three covers for each rail genre, in the catalogue's own order, skipping books without
 * a cover and books already shown for an earlier genre (the genre tags overlap, and the
 * same famous novel three times would say nothing about the genres). Cached for a day:
 * this only changes when the ingest runs.
 */
async function railCovers(): Promise<Map<string, Book[]>> {
  const pages = await Promise.all(
    RAIL.map((slug) => fetchPublicResult<BookPage>(`/api/v1/books?genre=${slug}&size=16`, 86400)),
  );
  const used = new Set<string>();
  const out = new Map<string, Book[]>();
  RAIL.forEach((slug, i) => {
    const result = pages[i];
    if (result.kind !== "ok") return;
    const picked = result.data.items.filter((b) => b.coverKey && !used.has(b.slug)).slice(0, 3);
    picked.forEach((b) => used.add(b.slug));
    out.set(slug, picked);
  });
  return out;
}

function Catalogue({
  params, page, results, unavailable, genres, railItems, stats,
}: {
  params: DiscoverParams;
  page: number;
  results: BookPage | null;
  unavailable: boolean;
  genres: Genre[];
  railItems: RailItem[];
  stats: { books: number; genres: number } | null;
}) {
  const genre = genres.find((g) => g.slug === params.genre);
  const title = genre?.name ?? "Discover";

  return (
    <div className="discover">
      <GenreRail items={railItems} genres={genres} params={params} />

      <header className="discover-head relative mt-[var(--space-10)] pt-[var(--space-10)] lg:mt-[var(--space-12)] lg:pt-[var(--space-12)]">
        <Leaf shadow width="26rem" rotate={-24} className="discover-leaf" priority />
        <div className="relative grid items-end gap-[var(--space-6)] lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-[var(--space-12)]">
          <div>
            <h1
              className="discover-title"
              style={{ ["--chars" as string]: Math.max(6, ...title.split(/\s+/).map((word) => word.length)) }}
            >
              {title}
            </h1>
            {/* Catalogue facts only; the data attribution lives in the footer and About. */}
            <p className="type-label m-0 mt-[var(--space-4)] flex flex-wrap gap-x-[var(--space-5)] text-[0.75rem] tabular-nums text-[var(--fg-muted)]">
              {genre ? (
                <span>{genre.bookCount.toLocaleString("en")} books</span>
              ) : stats ? (
                <>
                  <span>{stats.books.toLocaleString("en")} books</span>
                  <span>{stats.genres.toLocaleString("en")} genres</span>
                </>
              ) : null}
            </p>
          </div>
          <SearchInput params={params} />
        </div>
      </header>

      <div className="mt-[var(--space-10)] lg:mt-[var(--space-12)]">
        <FilterSort params={params} total={results?.total ?? null} genres={genres} />
      </div>

      <section aria-labelledby="results-heading" className="mt-[var(--space-8)] lg:mt-[var(--space-10)]">
        <h2 id="results-heading" className="sr-only">Books</h2>
        {unavailable ? (
          <WakingUp what="the catalogue" />
        ) : !results || results.items.length === 0 ? (
          <NothingMatched params={params} genreName={genre?.name} />
        ) : (
          <>
            {/*
              The search corrected itself. Saying so is the difference between helping and
              quietly answering a different question.
            */}
            {results.correctedFrom && (
              <p className="type-label m-0 mb-[var(--space-6)] text-[0.6875rem] text-[var(--fg-muted)]">
                Showing results for a close match to{" "}
                <span className="font-serif text-[0.9375rem] normal-case tracking-normal text-[var(--fg)]">“{results.correctedFrom}”</span>
              </p>
            )}
            <CatalogueGrid books={results.items} />
            <Pagination params={params} page={page} total={results.total} hasMore={results.hasMore} />
          </>
        )}
      </section>
    </div>
  );
}

function NothingMatched({ params, genreName }: { params: DiscoverParams; genreName?: string }) {
  const range = lengthLabel(params);
  const ways = [
    params.genre && { href: discoverHref(params, { genre: undefined }), label: `Search every genre, not just ${genreName ?? params.genre}` },
    range && { href: discoverHref(params, { minPages: undefined, maxPages: undefined }), label: "Any length" },
    params.q && { href: discoverHref(params, { q: undefined }), label: "Clear the search" },
    { href: "/discover", label: "Browse the catalogue" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="border-t border-[var(--rule)] pt-[var(--space-10)] pb-[var(--space-6)]">
      <h2 className="font-serif text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-[var(--fg)]">
        {params.q ? <>Nothing matched “{params.q}”.</> : <>Nothing matched these filters.</>}
      </h2>
      <p className="m-0 mt-[var(--space-3)] max-w-[52ch] text-[var(--fg-muted)]">
        {params.q ? "Try fewer words, or search by author." : "Try a different length or genre."}
      </p>
      <ul className="m-0 mt-[var(--space-6)] flex list-none flex-col gap-[var(--space-1)] p-0">
        {ways.map((way) => (
          <li key={way.href + way.label}>
            <Link href={way.href} className="option-link">{way.label} <span aria-hidden="true">→</span></Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pagination({ params, page, total, hasMore }: { params: DiscoverParams; page: number; total: number; hasMore: boolean }) {
  if (page === 0 && !hasMore) return null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (target: number) => discoverHref(params, { page: String(target) });

  return (
    <nav aria-label="Pagination" className="mt-[var(--space-16)] grid grid-cols-3 items-center border-y border-[var(--rule-strong)] py-[var(--space-2)]">
      <span>
        {page > 0 && (
          <Link href={link(page - 1)} rel="prev" className="pager-link">
            <span aria-hidden="true">←</span> Previous
          </Link>
        )}
      </span>
      <p className="type-label m-0 text-center text-[0.75rem] tabular-nums text-[var(--fg)]">
        Page {page + 1} / {pages.toLocaleString("en")}
      </p>
      <span className="text-right">
        {hasMore && (
          <Link href={link(page + 1)} rel="next" className="pager-link">
            Next <span aria-hidden="true">→</span>
          </Link>
        )}
      </span>
    </nav>
  );
}
