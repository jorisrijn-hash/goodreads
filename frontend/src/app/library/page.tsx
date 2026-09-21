import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { EmptyState } from "@/components/EmptyState";
import { WakingUp } from "@/components/WakingUp";
import { LibrarySearch } from "@/components/LibrarySearch";
import { STATUS_LABEL, type LibraryEntry, type LibrarySummary, type ReadingStatus } from "@/lib/api";
import { fetchPrivate } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { WakingPage } from "@/components/WakingPage";

export const metadata = { title: "My Library" };
export const dynamic = "force-dynamic";

const TABS: { key: ReadingStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "WANT_TO_READ", label: "Want to Read" },
  { key: "CURRENTLY_READING", label: "Currently Reading" },
  { key: "READ", label: "Read" },
  { key: "DNF", label: "Did Not Finish" },
];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await getSession();
  // Not knowing is not the same as signed out: sending a signed-in reader to the login
  // page because the API is waking up would be wrong, so wait instead.
  if (session.kind === "unavailable") return <WakingPage what="your library" />;
  if (session.kind === "signed-out") redirect("/login?returnTo=%2Flibrary");
  const user = session.user;

  const { status, q } = await searchParams;
  const active = TABS.some(tab => tab.key === status) ? (status as ReadingStatus) : "ALL";

  const [entries, summary] = await Promise.all([
    fetchPrivate<LibraryEntry[]>(
      `/api/v1/me/library?${new URLSearchParams({
        ...(active !== "ALL" ? { status: active } : {}),
        ...(q ? { q } : {}),
      })}`,
    ),
    fetchPrivate<LibrarySummary>("/api/v1/me/library/summary"),
  ]);

  const countFor = (key: ReadingStatus | "ALL") => {
    if (!summary) return null;
    switch (key) {
      case "ALL": return summary.total;
      case "WANT_TO_READ": return summary.wantToRead;
      case "CURRENTLY_READING": return summary.currentlyReading;
      case "READ": return summary.read;
      case "DNF": return summary.didNotFinish;
    }
  };

  const href = (key: ReadingStatus | "ALL") => {
    const params = new URLSearchParams();
    if (key !== "ALL") params.set("status", key);
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/library?${qs}` : "/library";
  };

  return (
    <AppShell user={user}>
      <header className="flex flex-wrap items-baseline justify-between gap-[var(--space-4)]">
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight">My Library</h1>
        {summary && summary.total > 0 && (
          <p className="text-[0.875rem] text-[var(--ink-60)]">
            {summary.total.toLocaleString()} {summary.total === 1 ? "book" : "books"}
          </p>
        )}
      </header>

      {/*
        Reading state, presented as state. These are not shelves and are deliberately not
        styled as tags: a book is in exactly one of them at a time.
      */}
      <nav aria-label="Reading status" className="mt-[var(--space-6)] border-b border-[var(--border)]">
        <ul className="-mb-px flex list-none gap-[var(--space-1)] overflow-x-auto p-0">
          {TABS.map(tab => {
            const isActive = active === tab.key;
            const count = countFor(tab.key);
            return (
              <li key={tab.key}>
                <Link
                  href={href(tab.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2
                              px-[var(--space-3)] text-[0.9375rem] no-underline transition-colors
                              duration-[var(--motion-fast)] ${
                    isActive
                      ? "border-[var(--forest)] text-[var(--ink)]"
                      : "border-transparent text-[var(--ink-60)] hover:text-[var(--ink)]"
                  }`}
                >
                  {tab.label}
                  {count !== null && count > 0 && (
                    <span className="ml-[var(--space-2)] text-[0.8125rem] text-[var(--ink-60)]">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {summary && summary.total > 0 && (
        <div className="mt-[var(--space-6)] max-w-[420px]">
          <LibrarySearch initialQuery={q ?? ""} status={active === "ALL" ? undefined : active} />
        </div>
      )}

      <div className="mt-[var(--space-8)]">
        {!entries ? (
          <WakingUp what="your library" />
        ) : entries.length === 0 ? (
          q ? (
            <EmptyState
              title="Nothing matched"
              body={`No book in your library matches “${q}”.`}
              action={{ href: href(active), label: "Clear search" }}
            />
          ) : active === "ALL" ? (
            <EmptyState
              title="Your library is empty"
              body="Books you save will collect here — what you want to read, what you are reading now, and everything you have finished."
              action={{ href: "/discover", label: "Discover books" }}
            />
          ) : (
            <EmptyState
              title={`Nothing in ${STATUS_LABEL[active as ReadingStatus]}`}
              body="Books move between reading states as you go. Nothing is here yet."
              action={{ href: "/discover", label: "Discover books" }}
            />
          )
        ) : (
          <ul className="grid list-none grid-cols-2 gap-x-[var(--space-5)] gap-y-[var(--space-8)]
                         p-0 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {entries.map((entry, index) => (
              <li key={entry.book.slug}>
                <BookCard book={entry.book} priority={index < 6} />
                {/* Only shown on the All tab, where books of different states mix. */}
                {active === "ALL" && (
                  <p className="mt-[var(--space-1)] text-[0.75rem] uppercase tracking-[0.1em]
                                text-[var(--ink-60)]">
                    {STATUS_LABEL[entry.status]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
