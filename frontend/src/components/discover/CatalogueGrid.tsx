import Link from "next/link";
import type { Book } from "@/lib/api";
import { TileCover } from "./TileCover";

/*
 * The cover is 62% of its tile. Tiles are a quarter of the frame from 1200px, a third
 * from 768px and a half below that, which gives these rendered widths.
 */
const SIZES = "(min-width: 1440px) 205px, (min-width: 1200px) 14.5vw, (min-width: 768px) 19vw, 29vw";

/**
 * The catalogue grid: each book on its own display tile, the cover first and the facts
 * underneath. No ratings, prices or counts we do not hold.
 */
export function CatalogueGrid({ books }: { books: Book[] }) {
  return (
    <ul className="catalogue-grid m-0 grid list-none p-0">
      {books.map((book, index) => (
        <li key={book.slug}>
          <CatalogueTile book={book} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

function CatalogueTile({ book, priority }: { book: Book; priority: boolean }) {
  const facts = [book.publishedYear, book.pageCount ? `${book.pageCount.toLocaleString("en")} pages` : null].filter(Boolean);
  return (
    <Link href={`/book/${book.slug}`} className="tile group block no-underline">
      <div className="tile__display">
        <TileCover coverKey={book.coverKey} title={book.title} author={book.authors[0]} sizes={SIZES} priority={priority} />
      </div>
      <div className="mt-[var(--space-4)]">
        <h3 className="line-clamp-2 font-serif text-[1.0625rem] leading-snug text-[var(--fg)]">{book.title}</h3>
        {book.authors.length > 0 && (
          <p className="m-0 mt-[2px] line-clamp-1 text-[0.875rem] leading-snug text-[var(--fg-muted)]">{book.authors.join(", ")}</p>
        )}
        {facts.length > 0 && (
          <p className="m-0 mt-[var(--space-2)] text-[0.8125rem] tabular-nums text-[var(--fg-subtle)]">{facts.join(" · ")}</p>
        )}
        {book.genres[0] && <p className="type-label m-0 mt-[var(--space-1)] text-[0.625rem] text-[var(--fg-subtle)]">{book.genres[0]}</p>}
      </div>
    </Link>
  );
}
