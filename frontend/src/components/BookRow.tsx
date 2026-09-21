import Link from "next/link";
import type { Book } from "@/lib/api";
import { BookCard } from "./BookCard";

/**
 * A horizontal shelf of books with an editorial heading.
 *
 * Scrolls rather than wraps, so a collection reads as a shelf rather than a grid, and so
 * a section can show a dozen books without dominating the page.
 */
export function BookRow({
  title,
  description,
  books,
  href,
}: {
  title: string;
  description?: string;
  books: Book[];
  href?: string;
}) {
  if (books.length === 0) return null;

  return (
    <section className="mt-[var(--space-12)]">
      <div className="flex items-end justify-between gap-[var(--space-4)]">
        <div>
          <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--ink)]">{title}</h2>
          {description && (
            <p className="mt-[2px] text-[0.875rem] text-[var(--ink-60)]">{description}</p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="shrink-0 whitespace-nowrap text-[0.875rem] text-[var(--forest)]
                       underline underline-offset-4"
          >
            See all
          </Link>
        )}
      </div>

      {/* Horizontal scroll with snap; each item keeps a comfortable touch width. */}
      <ul
        className="-mx-[var(--space-5)] mt-[var(--space-5)] flex list-none snap-x snap-mandatory
                   gap-[var(--space-5)] overflow-x-auto px-[var(--space-5)] pb-[var(--space-2)]
                   sm:-mx-[var(--space-8)] sm:px-[var(--space-8)]"
      >
        {books.map((book) => (
          <li key={book.slug} className="w-[140px] shrink-0 snap-start sm:w-[168px]">
            <BookCard book={book} />
          </li>
        ))}
      </ul>
    </section>
  );
}
