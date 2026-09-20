import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Home" };

/** Server-rendered per request: identity is never cached or guessed on the client. */
export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const user = await getCurrentUser();
  // The API is the authority. If it does not recognise the session, there is no
  // authenticated view to render.
  if (!user) redirect("/login?returnTo=%2Fhome");

  return (
    <AppShell user={user}>
      <div className="max-w-[46ch]">
        <p className="text-sm uppercase tracking-[0.12em] text-[var(--ink-60)]">
          {greeting()}
        </p>
        <h1 className="mt-[var(--space-2)] text-[clamp(2rem,6vw,3rem)]">
          {user.displayName}
        </h1>

        <p className="mt-[var(--space-6)] text-lg leading-relaxed text-[var(--ink-70)]">
          Your reading home is being built.
        </p>

        {/*
          Deliberately empty of product surface. Discover, My Library, the Reading
          Journal and reading statistics each need a backend that does not exist yet,
          and placeholder cards showing invented counts would misrepresent what works.
        */}
        <div className="mt-[var(--space-8)] border-l-2 border-[var(--border-strong)] pl-[var(--space-4)]">
          <p className="text-sm leading-relaxed text-[var(--ink-60)]">
            Signing in, sessions and accounts are working. Discovering books, saving them
            to a library, tracking progress and the reading journal arrive in later
            stages of this case study — they are left out here rather than mocked up.
          </p>
        </div>

        {user.demo && (
          <p className="mt-[var(--space-8)] text-sm text-[var(--ink-70)]">
            You are signed in to the demo account. It will hold a real reading history
            once the library and journal exist.
          </p>
        )}
      </div>
    </AppShell>
  );
}
