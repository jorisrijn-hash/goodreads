import Link from "next/link";
import { Suspense } from "react";
import { BookGrid } from "@/components/BookGrid";
import { BookRow } from "@/components/BookRow";
import { EmptyState } from "@/components/EmptyState";
import { SearchInput } from "@/components/SearchInput";
import { PublicShell } from "@/components/PublicShell";
import { AppShell } from "@/components/AppShell";
import type { BookPage, Genre } from "@/lib/api";
import { fetchPublicResult } from "@/lib/server-api";
import { WakingUp } from "@/components/WakingUp";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

type Params = {
  q?: string;
  genre?: string;
  maxPages?: string;
  minPages?: string;
  sort?: string;
  page?: string;
};

/**
 * Discover and search are one surface, not two.
 *
 * Without a query this is an editorial browse page; with one it becomes the results.
 * Same route, same URL, same field — the difference is whether `q` is set.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const query = params.q?.trim();

  const body = query || params.genre || params.minPages || params.maxPages
    ? await resultsView(params)
    : await browseView();

  // Signed-in readers keep the application shell; everyone else gets the public header.
  return user ? (
    <AppShell user={user}>{body}</AppShell>
  ) : (
    <PublicShell>{body}</PublicShell>
  );
}

async function resultsView(params: Params) {
  const page = Number(params.page ?? 0) || 0;
  const result = await fetchPublicResult<BookPage>(
    `/api/v1/books?${new URLSearchParams({
      ...(params.q ? { q: params.q } : {}),
      ...(params.genre ? { genre: params.genre } : {}),
      ...(params.minPages ? { minPages: params.minPages } : {}),
      ...(params.maxPages ? { maxPages: params.maxPages } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
      page: String(page),
      size: "24",
    })}`,
    0,
  );
  // A 4xx here is the API rejecting the request itself — a hand-edited filter, say.
  // That is an answer, and the honest one is "nothing", not "come back later".
  const results = result.kind === "ok" ? result.data : null;

  return (
    <>
      <div className="max-w-[640px]">
        <Suspense fallback={null}>
          <SearchInput autoFocus />
        </Suspense>
      </div>

      {result.kind === "unavailable" ? (
        <div className="mt-[var(--space-10)]">
          <WakingUp what="the catalogue" />
        </div>
      ) : !results || results.items.length === 0 ? (
        <div className="mt-[var(--space-10)]">
          <EmptyState
            title="Nothing matched"
            body={`No books found for "${params.q ?? ""}". Try fewer words, or search by author.`}
            action={{ href: "/discover", label: "Browse the catalogue" }}
          />
        </div>
      ) : (
        <>
          <div className="mt-[var(--space-8)] flex flex-wrap items-baseline gap-x-[var(--space-3)]">
            <p className="text-[0.875rem] text-[var(--ink-70)]">
              {results.total.toLocaleString()} {results.total === 1 ? "book" : "books"}
            </p>
            {/*
              The search corrected itself. Saying so is the difference between helping and
              quietly answering a different question.
            */}
            {results.correctedFrom && (
              <p className="text-[0.875rem] text-[var(--ink-60)]">
                Showing results for a close match to{" "}
                <span className="text-[var(--ink)]">“{results.correctedFrom}”</span>
              </p>
            )}
          </div>

          <div className="mt-[var(--space-6)]">
            <BookGrid books={results.items} />
          </div>

          <Pagination params={params} page={page} hasMore={results.hasMore} />
        </>
      )}
    </>
  );
}

function Pagination({ params, page, hasMore }: { params: Params; page: number; hasMore: boolean }) {
  if (page === 0 && !hasMore) return null;

  const link = (target: number) => {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    );
    next.set("page", String(target));
    return `/discover?${next.toString()}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-[var(--space-12)] flex items-center justify-between border-t
                 border-[var(--border)] pt-[var(--space-5)]"
    >
      {page > 0 ? (
        <Link href={link(page - 1)} className="min-h-[44px] text-[var(--forest)] underline underline-offset-4">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-[0.875rem] text-[var(--ink-60)]">Page {page + 1}</span>
      {hasMore ? (
        <Link href={link(page + 1)} className="min-h-[44px] text-[var(--forest)] underline underline-offset-4">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/**
 * The zero-query state.
 *
 * Every section is a plain, deterministic catalogue query — nothing here is personalised
 * and nothing claims to be. There is no recommendation engine yet, so there is no "for
 * you", no match percentage and no invented popularity.
 */
async function browseView() {
  const results = await Promise.all([
    // size=1 so this is a count query, not a page of books we then discard.
    fetchPublicResult<BookPage>("/api/v1/books?size=1"),
    fetchPublicResult<BookPage>("/api/v1/books?sort=NEWEST&size=12"),
    fetchPublicResult<BookPage>("/api/v1/books?maxPages=200&size=12"),
    fetchPublicResult<BookPage>("/api/v1/books?minPages=600&size=12"),
    fetchPublicResult<BookPage>("/api/v1/books?genre=classics&size=12"),
    fetchPublicResult<Genre[]>("/api/v1/genres", 21600),
  ] as const);

  // All of them failing together is the API being asleep, not six separate problems.
  if (results.every(r => r.kind === "unavailable")) {
    return <WakingUp what="the catalogue" />;
  }

  const [total, recent, short, long, classics, genres] = results.map(r =>
    r.kind === "ok" ? r.data : null,
  ) as [BookPage | null, BookPage | null, BookPage | null, BookPage | null, BookPage | null, Genre[] | null];

  return (
    <>
      <div className="max-w-[640px]">
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight">Discover</h1>
        <p className="mt-[var(--space-3)] text-[var(--ink-70)]">
          {/*
            The count comes from the catalogue itself. It was hardcoded as "Nine thousand
            books", which happened to be true and would have quietly stopped being true
            the first time the catalogue changed.
          */}
          {total
            ? `${total.total.toLocaleString()} books, and a search that forgives a typo.`
            : "Find your next book."}
        </p>
        <div className="mt-[var(--space-6)]">
          <Suspense fallback={null}>
            <SearchInput />
          </Suspense>
        </div>
      </div>

      {genres && genres.length > 0 && (
        <section className="mt-[var(--space-10)]">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--ink-60)]">
            Browse by genre
          </h2>
          <ul className="mt-[var(--space-4)] flex list-none flex-wrap gap-[var(--space-2)] p-0">
            {genres.slice(0, 14).map((genre) => (
              <li key={genre.slug}>
                <Link
                  href={`/discover?genre=${genre.slug}`}
                  className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)]
                             border border-[var(--border-strong)] px-[var(--space-4)]
                             text-[0.875rem] text-[var(--ink)] no-underline
                             transition-colors duration-[var(--motion-fast)]
                             hover:bg-[var(--paper)]"
                >
                  {genre.name}
                  <span className="ml-[var(--space-2)] text-[var(--ink-60)]">
                    {genre.bookCount.toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BookRow
        title="Recently published"
        description="The newest books in the catalogue"
        books={recent?.items ?? []}
        href="/discover?sort=NEWEST"
      />
      <BookRow
        title="Short reads"
        description="Under 200 pages"
        books={short?.items ?? []}
        href="/discover?maxPages=200"
      />
      <BookRow
        title="Long reads"
        description="600 pages and up"
        books={long?.items ?? []}
        href="/discover?minPages=600"
      />
      <BookRow
        title="Classics"
        books={classics?.items ?? []}
        href="/discover?genre=classics"
      />
    </>
  );
}
