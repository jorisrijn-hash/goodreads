import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { WakingPage } from "@/components/WakingPage";
import { WakingUp } from "@/components/WakingUp";
import { LibraryView } from "@/components/library/LibraryView";
import { parseShelf, parseSort } from "@/components/library/filter";
import type { LibraryEntry, LibrarySummary } from "@/lib/api";
import { fetchPrivate, fetchPrivateResult } from "@/lib/server-api";
import { getSession } from "@/lib/session";

export const metadata = { title: "My Library" };
export const dynamic = "force-dynamic";

/**
 * The reader's library: every book they have saved, by reading state.
 *
 * The whole library is loaded once (one list and the summary counts), and the shelf,
 * search and order are applied to it in the browser, so moving between them is instant.
 * The URL still carries all three, and the server renders the same view from it, so
 * links, refreshes and a browser without JavaScript all get the right page.
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>;
}) {
  const session = await getSession();
  // Not knowing is not the same as signed out: sending a signed-in reader to the login
  // page because the API is waking up would be wrong, so wait instead.
  if (session.kind === "unavailable") return <WakingPage what="your library" />;
  if (session.kind === "signed-out") redirect("/login?returnTo=%2Flibrary");
  const user = session.user;

  const params = await searchParams;
  const [library, summary] = await Promise.all([
    fetchPrivateResult<LibraryEntry[]>("/api/v1/me/library"),
    fetchPrivate<LibrarySummary>("/api/v1/me/library/summary"),
  ]);
  const total = summary?.total ?? (library.kind === "ok" ? library.data.length : 0);

  return (
    <AppShell user={user}>
      <header className="library-head">
        <h1 className="library-head__title">My Library</h1>
        <p className="m-0 mt-[var(--space-2)] text-[1rem] text-[var(--fg-muted)]">
          Your saved books, in one place.
          {total > 0 && <span className="tabular-nums"> {total.toLocaleString("en")} {total === 1 ? "book" : "books"}.</span>}
        </p>
      </header>

      {library.kind === "ok" ? (
        <LibraryView
          entries={library.data}
          summary={summary}
          initial={{ shelf: parseShelf(params.status), query: params.q ?? "", sort: parseSort(params.sort) }}
        />
      ) : (
        <div className="mt-[var(--space-10)]">
          <WakingUp what="your library" />
        </div>
      )}
    </AppShell>
  );
}
