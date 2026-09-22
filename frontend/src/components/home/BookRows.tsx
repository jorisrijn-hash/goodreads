import Link from "next/link";
import { LocalDate } from "@/components/Greeting";
import { Reveal } from "@/components/motion/Reveal";
import { STATUS_LABEL, type Book, type LibraryEntry } from "@/lib/api";
import { HomeCover } from "./HomeCover";

/**
 * The reader's own recently saved books: covers on display tiles, with the facts we hold
 * (title, author, shelf, and the day it was saved).
 */
export function PersonalBookRow({ entries }: { entries: LibraryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <Reveal as="section" className="home-section">
      <div className="home-section__head">
        <h2 id="saved-heading" className="type-label m-0 text-[var(--fg)]">Recently saved</h2>
        <Link href="/library" className="option-link">
          Your library <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul aria-labelledby="saved-heading" className="home-grid m-0 list-none p-0">
        {entries.map((entry) => (
          <li key={entry.book.slug}>
            <Link href={`/book/${entry.book.slug}`} className="home-tile group block no-underline">
              <span className="home-tile__display">
                <HomeCover
                  coverKey={entry.book.coverKey}
                  title={entry.book.title}
                  author={entry.book.authors[0]}
                  sizes="(min-width: 1280px) 130px, (min-width: 768px) 17vw, 28vw"
                />
              </span>
              <h3 className="mt-[var(--space-4)] line-clamp-2 font-serif text-[1rem] leading-snug text-[var(--fg)]">{entry.book.title}</h3>
              {entry.book.authors.length > 0 && (
                <p className="m-0 mt-[2px] truncate text-[0.8125rem] text-[var(--fg-muted)]">{entry.book.authors.join(", ")}</p>
              )}
              <p className="m-0 mt-[var(--space-2)] text-[0.75rem] text-[var(--fg-subtle)]">
                {STATUS_LABEL[entry.status]}
                <span aria-hidden="true"> · </span>
                <span className="sr-only">, </span>
                <LocalDate iso={entry.savedAt} prefix="Saved " month="short" />
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

/**
 * Public catalogue books, deliberately quieter than the reader's own: smaller, no tiles,
 * and labelled for what the order is (publication year), not as a suggestion.
 */
export function CatalogueBookRow({ books }: { books: Book[] }) {
  if (books.length === 0) return null;
  return (
    <Reveal as="section" className="home-section home-section--quiet">
      <div className="home-section__head">
        <div>
          <h2 id="published-heading" className="type-label m-0 text-[var(--fg)]">Recently published</h2>
          <p className="m-0 mt-[var(--space-1)] text-[0.8125rem] text-[var(--fg-muted)]">From the catalogue, newest first.</p>
        </div>
        <Link href="/discover" className="option-link">
          Discover <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul aria-labelledby="published-heading" className="catalogue-row m-0 list-none p-0">
        {books.map((book) => (
          <li key={book.slug}>
            <Link href={`/book/${book.slug}`} className="quiet-book group block no-underline">
              <span className="quiet-book__cover">
                <HomeCover coverKey={book.coverKey} title={book.title} author={book.authors[0]} sizes="112px" />
              </span>
              <h3 className="mt-[var(--space-3)] line-clamp-2 font-serif text-[0.9375rem] leading-snug text-[var(--fg)]">{book.title}</h3>
              {book.authors.length > 0 && <p className="m-0 mt-[2px] truncate text-[0.8125rem] text-[var(--fg-muted)]">{book.authors[0]}</p>}
              {book.publishedYear && <p className="m-0 mt-[2px] text-[0.75rem] tabular-nums text-[var(--fg-subtle)]">{book.publishedYear}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
