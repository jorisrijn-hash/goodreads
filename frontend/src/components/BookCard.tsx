import Link from "next/link";
import type { Book } from "@/lib/api";
import { BookCover } from "./BookCover";

/**
 * A book on a shelf.
 *
 * <p>The cover dominates and the metadata stays thin — title, author, and a year only
 * where it earns its place. Browsing should feel closer to running a finger along a
 * shelf than scanning an inventory listing.
 */
export function BookCard({
  book,
  priority = false,
  showYear = false,
}: {
  book: Book;
  priority?: boolean;
  showYear?: boolean;
}) {
  return (
    <Link
      href={`/book/${book.slug}`}
      className="book-card group block no-underline focus-visible:outline-none"
    >
      {/* Decorative: the title and author are right below, so announcing them from the
          image as well would say the same book twice. */}
      <BookCover
        coverKey={book.coverKey}
        title={book.title}
        authors={book.authors}
        priority={priority}
        decorative
        className="book-card-cover"
      />

      <div className="mt-[var(--space-3)]">
        <h3 className="font-serif text-[0.9375rem] leading-snug text-[var(--ink)] line-clamp-2">
          {book.title}
        </h3>
        {book.authors.length > 0 && (
          <p className="mt-[2px] text-[0.8125rem] leading-snug text-[var(--ink-60)] line-clamp-1">
            {book.authors.join(", ")}
          </p>
        )}
        {showYear && book.publishedYear && (
          <p className="mt-[2px] text-[0.75rem] text-[var(--ink-60)]">{book.publishedYear}</p>
        )}
      </div>
    </Link>
  );
}
