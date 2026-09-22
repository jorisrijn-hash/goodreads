import Link from "next/link";
import type { Book } from "@/lib/api";
import { CoverObject } from "../CoverObject";

export type Related = { label: string; href: string; more: string; books: Book[] };

/**
 * A narrow rail of real, related catalogue books: more by the same author when the
 * catalogue has them, otherwise more in the book's first genre. Labelled for exactly
 * what it is; nothing here is a recommendation.
 */
export function RelatedRail({ related }: { related: Related | null }) {
  if (!related || related.books.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="book-rail">
      <h2 id="related-heading" className="type-label m-0 border-b border-[var(--fg)] pb-[var(--space-3)] text-[0.6875rem] text-[var(--fg)]">
        {related.label}
      </h2>
      <ul className="book-rail__list m-0 list-none p-0">
        {related.books.map((book) => (
          <li key={book.slug}>
            <Link prefetch={false} href={`/book/${book.slug}`} className="book-rail__item group no-underline">
              <span className="book-rail__cover">
                <CoverObject book={book} sizes="72px" fill={1} density={2} align="bottom" />
              </span>
              <span className="min-w-0">
                <span className="block line-clamp-2 font-serif text-[0.9375rem] leading-snug text-[var(--fg)] group-hover:underline">{book.title}</span>
                {book.publishedYear && <span className="mt-[2px] block text-[0.75rem] tabular-nums text-[var(--fg-subtle)]">{book.publishedYear}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link prefetch={false} href={related.href} className="option-link">
        {related.more} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
