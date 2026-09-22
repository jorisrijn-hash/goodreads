"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LocalDate } from "@/components/Greeting";
import { CoverObject } from "@/components/CoverObject";
import { STATUS_LABEL, type LibraryEntry, type LibrarySummary } from "@/lib/api";
import { libraryHref, parseShelf, parseSort, SHELVES, SORTS, view, type LibrarySort, type Shelf } from "./filter";

const COUNT: Record<Shelf, (s: LibrarySummary) => number> = {
  ALL: (s) => s.total,
  WANT_TO_READ: (s) => s.wantToRead,
  CURRENTLY_READING: (s) => s.currentlyReading,
  READ: (s) => s.read,
  DNF: (s) => s.didNotFinish,
};

const EMPTY: Record<Shelf, { title: string; body: string }> = {
  ALL: { title: "Your library is empty.", body: "Start with a book you want to read. Everything you save collects here." },
  WANT_TO_READ: { title: "Nothing on your list yet.", body: "Books you want to read will wait here." },
  CURRENTLY_READING: { title: "Nothing in progress.", body: "Start a book and it moves here." },
  READ: { title: "No finished books yet.", body: "Books you finish will be kept here." },
  DNF: { title: "Nothing set aside.", body: "Books you stop reading will be kept here." },
};

/**
 * The reader's library as one ordered archive: a shelf, a search within it, an order,
 * and the books. The page loads the whole library once; everything here is applied to
 * that list in the browser, so switching shelves, searching and sorting are instant and
 * cost no server render. The URL follows every change (so a view can be linked, and
 * back and forward work), and every control is also a real link or form, so without
 * JavaScript the server renders the same views.
 */
export function LibraryView({
  entries,
  summary,
  initial,
}: {
  entries: LibraryEntry[];
  summary: LibrarySummary | null;
  initial: { shelf: Shelf; query: string; sort: LibrarySort };
}) {
  const [shelf, setShelf] = useState(initial.shelf);
  const [query, setQuery] = useState(initial.query);
  const [sort, setSort] = useState(initial.sort);
  const books = useMemo(() => view(entries, shelf, query, sort), [entries, shelf, query, sort]);

  // Back and forward restore the view the URL describes.
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      setShelf(parseShelf(params.get("status")));
      setQuery(params.get("q") ?? "");
      setSort(parseSort(params.get("sort")));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(next: { shelf?: Shelf; query?: string; sort?: LibrarySort }, mode: "push" | "replace" = "push") {
    const s = next.shelf ?? shelf, q = next.query ?? query, o = next.sort ?? sort;
    setShelf(s);
    setQuery(q);
    setSort(o);
    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", libraryHref(s, q, o));
  }

  /** A link that works as a link, and in the browser updates the view in place. */
  const inPlace = (next: { shelf?: Shelf; sort?: LibrarySort }) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    go(next);
  };

  const total = summary?.total ?? entries.length;
  const count = (key: Shelf) => (summary ? COUNT[key](summary) : entries.filter((e) => key === "ALL" || e.status === key).length);

  return (
    <div className="library">
      <nav aria-label="Reading status" className="library-shelves">
        <ul className="library-shelves__list">
          {SHELVES.map(({ key, label }) => {
            const n = count(key);
            return (
              <li key={key}>
                <a
                  href={libraryHref(key, query, sort)}
                  onClick={inPlace({ shelf: key })}
                  aria-current={shelf === key ? "page" : undefined}
                  className="library-shelf"
                >
                  <span>{label}</span>
                  <span className="library-shelf__count">
                    {n}
                    <span className="sr-only"> {n === 1 ? "book" : "books"}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {total > 0 && (
        <div className="library-tools">
          <form role="search" action="/library" onSubmit={(event) => event.preventDefault()} className="library-search">
            {shelf !== "ALL" && <input type="hidden" name="status" value={shelf} />}
            {sort !== "updated" && <input type="hidden" name="sort" value={sort} />}
            <label htmlFor="library-search" className="sr-only">Search your library</label>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="library-search__icon">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              id="library-search"
              name="q"
              type="search"
              value={query}
              onChange={(event) => go({ query: event.target.value }, "replace")}
              placeholder="Title or author"
              autoComplete="off"
              className="library-search__input"
            />
          </form>

          <div className="library-sort" role="group" aria-label="Order">
            <span className="type-label text-[0.625rem] text-[var(--fg-subtle)]" aria-hidden="true">Order</span>
            {SORTS.map((o) => (
              <a
                key={o.key}
                href={libraryHref(shelf, query, o.key)}
                onClick={inPlace({ sort: o.key })}
                aria-current={sort === o.key ? "true" : undefined}
                className="option-link"
              >
                {o.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* The count of what is shown, announced when a filter or search changes it. */}
      <p className="library-count" aria-live="polite">
        {total > 0 && (query ? `${books.length} ${books.length === 1 ? "book matches" : "books match"} “${query.trim()}”` : `${books.length} ${books.length === 1 ? "book" : "books"}`)}
      </p>

      <h2 id="library-books-heading" className="sr-only">Books</h2>
      {books.length === 0 ? (
        <div className="library-empty">
          {query ? (
            <>
              <h2 className="library-empty__title">Nothing matches “{query.trim()}”.</h2>
              <p className="m-0 mt-[var(--space-3)] text-[var(--fg-muted)]">Search looks at titles and authors in this shelf.</p>
              <a href={libraryHref(shelf, "", sort)} onClick={(event) => { event.preventDefault(); go({ query: "" }); }} className="option-link mt-[var(--space-4)]">
                Clear the search <span aria-hidden="true">→</span>
              </a>
            </>
          ) : (
            <>
              <h2 className="library-empty__title">{EMPTY[shelf].title}</h2>
              <p className="m-0 mt-[var(--space-3)] text-[var(--fg-muted)]">{EMPTY[shelf].body}</p>
              <Link prefetch={false} href="/discover" className="library-empty__action">
                Explore books <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>
      ) : (
        // Keyed by shelf, so a shelf change reads as a change: a short fade, nothing more.
        // Phone sizes aim at CoverObject's 1.6x density target, not a 3x screen's full
        // density, so a phone fetches the 320px file it can show sharply, not the 640px one.
        <ul key={shelf} className="library-grid" aria-labelledby="library-books-heading">
          {books.map((entry, i) => (
            <li key={entry.book.slug}>
              <Link prefetch={false} href={`/book/${entry.book.slug}`} className="library-book group">
                <span className="library-book__display">
                  <CoverObject book={entry.book} sizes="(min-width: 1200px) 150px, (min-width: 768px) 18vw, 18vw" surface fill={0.66} align="center" priority={i < 5} />
                </span>
                <h3 dir="auto" className="library-book__title">{entry.book.title}</h3>
                {entry.book.authors.length > 0 && <span className="library-book__author">{entry.book.authors.join(", ")}</span>}
                <span className="library-book__meta">
                  {shelf === "ALL" && (
                    <>
                      <span className="library-book__status">{STATUS_LABEL[entry.status]}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="sr-only">, </span>
                    </>
                  )}
                  <LocalDate iso={entry.savedAt} prefix="Saved " month="short" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
