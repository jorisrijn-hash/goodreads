import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CoverObject } from "@/components/CoverObject";
import { PublicShell } from "@/components/PublicShell";
import { SaveControl } from "@/components/SaveControl";
import { WakingPage } from "@/components/WakingPage";
import { BookFacts } from "@/components/book/BookFacts";
import { RelatedRail, type Related } from "@/components/book/RelatedRail";
import type { Book, BookDetail, BookPage, LibraryEntry } from "@/lib/api";
import { cleanDescription, paragraphs, splitLede } from "@/lib/description";
import { fetchPrivate, fetchPublic, fetchPublicResult } from "@/lib/server-api";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await fetchPublic<BookDetail>(`/api/v1/books/${slug}`, 3600);
  if (!book) return { title: "Book" };
  return {
    title: `${book.title}${book.authors[0] ? ` — ${book.authors[0]}` : ""}`,
    description: cleanDescription(book.description)?.slice(0, 160) ?? undefined,
  };
}

/**
 * Book Detail, presented like a product page: the book is the product.
 *
 * First the book itself: the cover on a display field (at a size its file keeps sharp),
 * the title, author, the reader's own control, the plain facts and the opening of the
 * description, with a narrow rail of related books beside it. Then, on a quieter band,
 * the rest of the description and the edition's facts. No photography: the book is the
 * strongest object on the page, and the page is a product page, not a campaign.
 *
 * Public, so a book can be linked and shared; the reader's own relationship with it is
 * layered on when there is a session. Nothing here is a rating, a review or progress.
 *
 * Links on this page do not prefetch. Each points at a dynamic page (Discover, another
 * book) whose render costs several API calls, and prefetching all of them on sight made
 * one view of this page cost dozens of calls to a free-tier API.
 */
export default async function BookPageRoute({
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

  const [entry, related] = await Promise.all([
    // Only for a signed-in reader; 404 from this endpoint simply means not saved.
    user ? fetchPrivate<LibraryEntry>(`/api/v1/me/library/${slug}`) : null,
    relatedBooks(book),
  ]);

  const description = cleanDescription(book.description);
  const { lede, rest } = description ? splitLede(description) : { lede: "", rest: "" };
  const facts = [book.publishedYear, book.pageCount ? `${book.pageCount.toLocaleString("en")} pages` : null].filter(Boolean);
  const kicker = book.genres[0];

  const content = (
    <article className="book">
      <div className="book__cover">
        {/* The one cover above the fold: loaded first, and the only place the book is
            not named right beside it, so it carries real alt text. */}
        {/* sizes aims at the 1.6x density target, not a 3x phone's full density: on a phone
            the cover is drawn ~170px wide, so a 320px file is already sharp there. */}
        <CoverObject book={book} sizes="(min-width: 1024px) 320px, 24vw" surface fill={0.6} priority decorative={false} className="book__field" />
      </div>

      <div className="book__intro">
        {kicker && (
          <Link prefetch={false} href={`/discover?genre=${kicker.slug}`} className="type-label text-[0.6875rem] text-[var(--fg-subtle)] no-underline hover:text-[var(--fg)]">
            {kicker.name}
          </Link>
        )}
        {/* dir="auto": some catalogue titles are not in a left-to-right script. */}
        <h1 dir="auto" className="book__title">{book.title}</h1>
        {book.authors.length > 0 && (
          <p className="m-0 mt-[var(--space-3)] font-serif text-[1.25rem] text-[var(--fg-muted)]">
            {book.authors.map((author, i) => (
              <span key={author}>
                {i > 0 && ", "}
                <Link prefetch={false} href={`/discover?q=${encodeURIComponent(author)}`} className="no-underline hover:underline hover:underline-offset-4">{author}</Link>
              </span>
            ))}
          </p>
        )}

        <div className="mt-[var(--space-6)]">
          <SaveControl slug={slug} initialEntry={entry} isAuthenticated={Boolean(user)} autoSave={save === "1"} />
        </div>

        {facts.length > 0 && (
          <p className="m-0 mt-[var(--space-6)] border-t border-[var(--rule)] pt-[var(--space-4)] text-[0.875rem] tabular-nums text-[var(--fg-muted)]">
            {facts.join(" · ")}
          </p>
        )}

        {lede ? (
          <p dir="auto" className="book__lede">
            {lede}
            {rest && (
              <>
                {" "}
                <a href="#about" className="book__more">Continue reading <span aria-hidden="true">↓</span></a>
              </>
            )}
          </p>
        ) : (
          /* A real empty state: roughly a fifth of the catalogue has no description in
             Open Library, and writing one would be inventing content about a real book. */
          <p className="book__lede text-[var(--fg-muted)]">
            No description is available for this edition. The catalogue comes from Open Library, which does not have one for every book.
          </p>
        )}
      </div>

      <div className="book__rail">
        <RelatedRail related={related} />
      </div>

      {/* After the book: the rest of its description in the same column as the opening,
          and the edition's facts under the cover, like a product's specification. */}
      <div className="book__lower">
        {rest && (
          <section id="about" aria-labelledby="about-heading" className="book__about">
            <h2 id="about-heading" className="type-label m-0 text-[var(--fg-subtle)]">About this book</h2>
            {paragraphs(rest).map((para, i) => (
              <p key={i} dir="auto" className="book__prose">{para}</p>
            ))}
          </section>
        )}
        <div className="book__facts">
          <BookFacts book={book} />
        </div>
      </div>
    </article>
  );

  return user ? <AppShell user={user}>{content}</AppShell> : <PublicShell>{content}</PublicShell>;
}

/**
 * Up to four related books from real, deterministic queries. There is no author filter in
 * the API, so the author is searched by name and only exact author matches are kept.
 * Titles already shown (the book itself, other editions of one title) appear once.
 */
async function relatedBooks(book: BookDetail): Promise<Related | null> {
  const seen = new Set([norm(book.title)]);
  const pick = (items: Book[]) =>
    items.filter((b) => {
      if (b.slug === book.slug || seen.has(norm(b.title))) return false;
      seen.add(norm(b.title));
      return true;
    }).slice(0, 4);

  const author = book.authors[0];
  if (author) {
    const page = await fetchPublic<BookPage>(`/api/v1/books?q=${encodeURIComponent(author)}&size=24`, 3600);
    const byAuthor = (page?.items ?? []).filter((b) => b.authors.some((a) => norm(a) === norm(author)));
    const books = pick(byAuthor);
    if (books.length >= 2) {
      return { label: `More by ${author}`, href: `/discover?q=${encodeURIComponent(author)}`, more: `Search ${author}`, books };
    }
    books.forEach((b) => seen.delete(norm(b.title)));
  }

  const genre = book.genres[0];
  if (!genre) return null;
  const page = await fetchPublic<BookPage>(`/api/v1/books?genre=${genre.slug}&size=12`, 3600);
  const books = pick(page?.items ?? []);
  return books.length ? { label: `More in ${genre.name}`, href: `/discover?genre=${genre.slug}`, more: `All ${genre.name}`, books } : null;
}

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
