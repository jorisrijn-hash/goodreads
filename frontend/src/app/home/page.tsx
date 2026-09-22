import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { HomeGreeting } from "@/components/Greeting";
import { WakingPage } from "@/components/WakingPage";
import { WakingUp } from "@/components/WakingUp";
import { CatalogueBookRow, PersonalBookRow } from "@/components/home/BookRows";
import { CurrentlyReadingFeature, NothingInProgress } from "@/components/home/CurrentlyReadingFeature";
import { deriveHome } from "@/components/home/derive";
import { LibraryLedger } from "@/components/home/LibraryLedger";
import type { BookPage, LibraryEntry, LibrarySummary } from "@/lib/api";
import { fetchPrivate, fetchPrivateResult, fetchPublic } from "@/lib/server-api";
import { getSession } from "@/lib/session";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

/**
 * The reader's home: a quiet reading page, not a dashboard.
 *
 * The book in progress leads; the shelves' counts sit beside it; the reader's recently
 * saved books follow, then a quieter row from the public catalogue. Everything personal
 * comes from the reader's own rows: one library list for the books, and the summary for
 * the counts, so they match the library's tabs exactly. There is no friend activity,
 * recommendation, streak or progress here, because none of those exist yet.
 */
export default async function HomePage() {
  const session = await getSession();
  // Not knowing is not the same as signed out: sending a signed-in reader to the login
  // page because the API is waking up would be wrong, so wait instead.
  if (session.kind === "unavailable") return <WakingPage what="your library" />;
  if (session.kind === "signed-out") redirect("/login?returnTo=%2Fhome");
  const user = session.user;

  const [library, summary, published] = await Promise.all([
    fetchPrivateResult<LibraryEntry[]>("/api/v1/me/library"),
    fetchPrivate<LibrarySummary>("/api/v1/me/library/summary"),
    // Public and the same for everyone, so cached; it only changes when the ingest runs.
    fetchPublic<BookPage>("/api/v1/books?sort=NEWEST&size=6", 3600),
  ]);

  const entries = library.kind === "ok" ? library.data : [];
  const { featured, alsoReading, picks, recentlySaved } = deriveHome(entries);
  const libraryEmpty = library.kind === "ok" && entries.length === 0 && (summary?.total ?? 0) === 0;

  return (
    <AppShell user={user}>
      <div className="home">
        <HomeGreeting name={user.displayName} />

        <div className="home-top">
          {library.kind === "unavailable" ? (
            <WakingUp what="your library" />
          ) : featured ? (
            <CurrentlyReadingFeature entry={featured} alsoReading={alsoReading} />
          ) : (
            <NothingInProgress wantToRead={picks} libraryEmpty={libraryEmpty} />
          )}
          <LibraryLedger summary={summary} />
        </div>

        <PersonalBookRow entries={recentlySaved} />
        <CatalogueBookRow books={published?.items ?? []} />
      </div>
    </AppShell>
  );
}
