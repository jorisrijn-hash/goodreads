import Link from "next/link";
import type { BookDetail } from "@/lib/api";

/**
 * The book's facts as a ledger: only what the catalogue holds and is worth reading.
 *
 * Language is left out on purpose: every record says "eng", including editions in other
 * languages (docs/backlog/0001), so the row would carry no information and could mislead.
 * The Open Library work is derived from the slug, whose suffix is the work's id.
 */
export function BookFacts({ book }: { book: BookDetail }) {
  const work = book.slug.match(/-(ol\d+w)$/i)?.[1]?.toUpperCase();
  const rows: [string, React.ReactNode][] = [];
  if (book.publishedYear) rows.push(["First published", book.publishedYear]);
  if (book.pageCount) rows.push(["Pages", book.pageCount.toLocaleString("en")]);
  // The field is named isbn13 but some records hold a 10-digit ISBN; label what it is.
  if (book.isbn13) rows.push([book.isbn13.replace(/[^0-9Xx]/g, "").length === 13 ? "ISBN-13" : "ISBN", <span key="isbn" className="tabular-nums">{book.isbn13}</span>]);
  if (book.genres.length) {
    rows.push([
      book.genres.length === 1 ? "Genre" : "Genres",
      <span key="g">
        {book.genres.map((g, i) => (
          <span key={g.slug}>
            {i > 0 && ", "}
            <Link prefetch={false} href={`/discover?genre=${g.slug}`} className="underline decoration-[var(--rule-strong)] underline-offset-4 hover:decoration-[var(--fg)]">{g.name}</Link>
          </span>
        ))}
      </span>,
    ]);
  }
  if (work) {
    rows.push([
      "Catalogue record",
      <a key="ol" href={`https://openlibrary.org/works/${work}`} className="underline decoration-[var(--rule-strong)] underline-offset-4 hover:decoration-[var(--fg)]">
        Open Library <span aria-hidden="true">↗</span>
      </a>,
    ]);
  }

  return (
    <section aria-labelledby="facts-heading" className="book-facts">
      <h2 id="facts-heading" className="type-label m-0 border-b-2 border-[var(--fg)] pb-[var(--space-3)] text-[var(--fg)]">
        About this edition
      </h2>
      <dl className="m-0">
        {rows.map(([label, value]) => (
          <div key={label} className="book-facts__row">
            <dt className="type-label text-[0.625rem] text-[var(--fg-subtle)]">{label}</dt>
            <dd className="m-0 text-[0.9375rem] text-[var(--fg)]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
