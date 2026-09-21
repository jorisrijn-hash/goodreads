import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BookCover } from "@/components/BookCover";
import { SaveControl } from "@/components/SaveControl";
import { PublicShell } from "@/components/PublicShell";
import type { BookDetail, LibraryEntry } from "@/lib/api";
import { fetchPrivate, fetchPublic, fetchPublicResult } from "@/lib/server-api";
import { WakingPage } from "@/components/WakingPage";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await fetchPublic<BookDetail>(`/api/v1/books/${slug}`, 3600);
  if (!book) return { title: "Book" };
  return {
    title: `${book.title}${book.authors[0] ? ` — ${book.authors[0]}` : ""}`,
    description: book.description?.slice(0, 160) ?? undefined,
  };
}

/**
 * Book Detail: the hub the whole reading loop returns to.
 *
 * Public, so a book can be linked and shared. The reader's own relationship with it is
 * layered on top when there is a session.
 */
export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ save?: string }>;
}) {
  const { slug } = await params;
  const { save } = await searchParams;

  const [result, user] = await Promise.all([
    fetchPublicResult<BookDetail>(`/api/v1/books/${slug}`, 3600),
    getCurrentUser(),
  ]);
  // Only an answer from the API makes this a 404. A sleeping API is not evidence that
  // the book does not exist, and a 404 page would say it does not.
  if (result.kind === "unavailable") return <WakingPage what="this book" />;
  if (result.kind === "absent") notFound();
  const book = result.data;

  // Only fetched for a signed-in reader; 404 from this endpoint simply means not saved.
  const entry = user ? await fetchPrivate<LibraryEntry>(`/api/v1/me/library/${slug}`) : null;

  const content = (
    <article className="grid gap-[var(--space-8)] lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-[var(--space-12)]">
      <div className="mx-auto w-[180px] sm:w-[220px] lg:mx-0 lg:w-full">
        {/* The only cover on the page and above the fold, so it loads eagerly. It is
            also the only place the title is not adjacent, so it carries real alt text. */}
        <BookCover
          coverKey={book.coverKey}
          title={book.title}
          authors={book.authors}
          size="large"
          priority
        />
      </div>

      <div>
        <h1 className="text-[clamp(1.875rem,4.4vw,3rem)] leading-[1.1]">{book.title}</h1>

        {book.authors.length > 0 && (
          <p className="mt-[var(--space-3)] font-serif text-[1.25rem] text-[var(--ink-70)]">
            {book.authors.join(", ")}
          </p>
        )}

        <dl className="mt-[var(--space-5)] flex flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-2)]
                       text-[0.875rem] text-[var(--ink-60)]">
          {book.publishedYear && (
            <div className="flex gap-[var(--space-2)]">
              <dt className="sr-only">First published</dt>
              <dd>{book.publishedYear}</dd>
            </div>
          )}
          {book.pageCount && (
            <div className="flex gap-[var(--space-2)]">
              <dt className="sr-only">Length</dt>
              <dd>{book.pageCount} pages</dd>
            </div>
          )}
          {book.isbn13 && (
            <div className="flex gap-[var(--space-2)]">
              <dt className="sr-only">ISBN</dt>
              <dd>ISBN {book.isbn13}</dd>
            </div>
          )}
        </dl>

        <div className="mt-[var(--space-6)]">
          <SaveControl
            slug={slug}
            initialEntry={entry}
            isAuthenticated={Boolean(user)}
            autoSave={save === "1"}
          />
        </div>

        {book.genres.length > 0 && (
          <ul className="mt-[var(--space-8)] flex list-none flex-wrap gap-[var(--space-2)] p-0">
            {book.genres.map((genre) => (
              <li key={genre.slug}>
                <Link
                  href={`/discover?genre=${genre.slug}`}
                  className="inline-flex min-h-[36px] items-center rounded-[var(--radius-input)]
                             border border-[var(--border)] px-[var(--space-3)]
                             text-[0.8125rem] text-[var(--ink-70)] no-underline
                             transition-colors duration-[var(--motion-fast)]
                             hover:border-[var(--border-strong)] hover:bg-[var(--paper)]"
                >
                  {genre.name}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-[var(--space-8)] border-t border-[var(--border)] pt-[var(--space-6)]">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--ink-60)]">
            About this book
          </h2>
          {book.description ? (
            <div className="mt-[var(--space-4)] max-w-[68ch] whitespace-pre-line text-[1.0625rem]
                            leading-[1.7] text-[var(--ink)]">
              {book.description}
            </div>
          ) : (
            /*
              A real empty state. Roughly a fifth of the catalogue has no description in
              Open Library, and writing one would be inventing content about a real book.
            */
            <p className="mt-[var(--space-4)] max-w-[56ch] leading-relaxed text-[var(--ink-60)]">
              No description is available for this edition. The catalogue comes from Open
              Library, which does not have one for every book.
            </p>
          )}
        </section>
      </div>
    </article>
  );

  return user ? (
    <AppShell user={user}>{content}</AppShell>
  ) : (
    <PublicShell>{content}</PublicShell>
  );
}
