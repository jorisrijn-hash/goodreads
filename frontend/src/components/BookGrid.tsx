import type { Book } from "@/lib/api";
import { BookCard } from "./BookCard";

/**
 * Responsive cover grid: 2 columns on a phone, up to 6 on a wide screen. Sized with
 * auto-fill rather than breakpoint steps so it degrades sensibly at any width and
 * survives browser zoom.
 */
export function BookGrid({
  books,
  showYear = false,
}: {
  books: Book[];
  showYear?: boolean;
}) {
  return (
    <ul className="grid list-none grid-cols-2 gap-x-[var(--space-5)] gap-y-[var(--space-8)]
                   p-0 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {books.map((book, index) => (
        <li key={book.slug}>
          {/* Only the first row is eager; the rest load as they approach the viewport. */}
          <BookCard book={book} priority={index < 6} showYear={showYear} />
        </li>
      ))}
    </ul>
  );
}
