import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { STATUS_LABEL, type LibraryEntry, type LibrarySummary } from "@/lib/api";
import { fetchPrivate } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { WakingPage } from "@/components/WakingPage";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The reader's home.
 *
 * Everything on this page is derived from the reader's own rows. There is no friend
 * activity, no recommendation, no streak and no statistic we cannot compute — those need
 * backends that do not exist, and a card showing an invented number would be the only
 * dishonest thing here.
 */
export default async function HomePage() {
  const session = await getSession();
  // Not knowing is not the same as signed out: sending a signed-in reader to the login
  // page because the API is waking up would be wrong, so wait instead.
  if (session.kind === "unavailable") return <WakingPage what="your library" />;
  if (session.kind === "signed-out") redirect("/login?returnTo=%2Fhome");
  const user = session.user;

  const [reading, recent, summary] = await Promise.all([
    fetchPrivate<LibraryEntry[]>("/api/v1/me/library?status=CURRENTLY_READING"),
    fetchPrivate<LibraryEntry[]>("/api/v1/me/library"),
    fetchPrivate<LibrarySummary>("/api/v1/me/library/summary"),
  ]);

  const currentlyReading = reading ?? [];
  const recentlySaved = (recent ?? []).filter(e => e.status === "WANT_TO_READ").slice(0, 6);
  const isEmpty = !summary || summary.total === 0;

  return (
    <AppShell user={user}>
      <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--ink-60)]">
        {greeting()}
      </p>
      <h1 className="mt-[var(--space-2)] text-[clamp(1.875rem,5vw,2.75rem)]">
        {user.displayName}
      </h1>

      {isEmpty ? (
        <div className="mt-[var(--space-8)]">
          <EmptyState
            title="Your reading life starts here"
            body="Save a book and it appears in your library. Start reading it and it shows up here, where you left off."
            action={{ href: "/discover", label: "Discover books" }}
          />
        </div>
      ) : (
        <>
          <section className="mt-[var(--space-10)]">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--ink-60)]">
              Continue reading
            </h2>
            {currentlyReading.length === 0 ? (
              <p className="mt-[var(--space-4)] max-w-[52ch] leading-relaxed text-[var(--ink-70)]">
                Nothing in progress. When you start a book it will wait for you here.{" "}
                <Link href="/library?status=WANT_TO_READ" className="text-[var(--forest)] underline underline-offset-4">
                  Pick one from your list
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-[var(--space-5)] flex list-none flex-col gap-[var(--space-6)] p-0">
                {currentlyReading.slice(0, 3).map(entry => (
                  <li key={entry.book.slug}>
                    <Link
                      href={`/book/${entry.book.slug}`}
                      className="group flex gap-[var(--space-5)] no-underline"
                    >
                      <div className="w-[84px] shrink-0 sm:w-[104px]">
                        <BookCover
                          coverKey={entry.book.coverKey}
                          title={entry.book.title}
                          authors={entry.book.authors}
                          size="small"
                          decorative
                          priority
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-serif text-[1.375rem] leading-tight text-[var(--ink)]">
                          {entry.book.title}
                        </h3>
                        <p className="mt-[2px] text-[var(--ink-60)]">
                          {entry.book.authors.join(", ")}
                        </p>
                        {entry.book.pageCount && (
                          <p className="mt-[var(--space-3)] text-[0.875rem] text-[var(--ink-60)]">
                            {entry.book.pageCount} pages
                          </p>
                        )}
                        {/*
                          Page progress arrives with reading progress. Nothing invented
                          in the meantime.
                        */}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-[var(--space-12)]">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--ink-60)]">
              Your reading
            </h2>
            <dl className="mt-[var(--space-4)] flex flex-wrap gap-x-[var(--space-10)] gap-y-[var(--space-4)]">
              {([
                ["WANT_TO_READ", summary.wantToRead],
                ["CURRENTLY_READING", summary.currentlyReading],
                ["READ", summary.read],
                ["DNF", summary.didNotFinish],
              ] as const).map(([status, count]) => (
                <div key={status}>
                  <dt className="text-[0.8125rem] text-[var(--ink-60)]">
                    {STATUS_LABEL[status]}
                  </dt>
                  <dd className="font-serif text-[2rem] leading-none text-[var(--ink)]">
                    {count}
                  </dd>
                </div>
              ))}
            </dl>
            <Link
              href="/library"
              className="mt-[var(--space-5)] inline-block text-[0.9375rem] text-[var(--forest)]
                         underline underline-offset-4"
            >
              Open your library
            </Link>
          </section>

          {recentlySaved.length > 0 && (
            <section className="mt-[var(--space-12)]">
              <h2 className="text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--ink-60)]">
                Recently saved
              </h2>
              <ul className="mt-[var(--space-5)] grid list-none grid-cols-3 gap-[var(--space-5)]
                             p-0 sm:grid-cols-4 lg:grid-cols-6">
                {recentlySaved.map(entry => (
                  <li key={entry.book.slug}>
                    <BookCard book={entry.book} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
