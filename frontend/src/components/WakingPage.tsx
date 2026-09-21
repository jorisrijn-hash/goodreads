import { SiteHeader } from "./SiteHeader";
import { WakingUp } from "./WakingUp";

/**
 * A whole page for when we could not even learn who the reader is.
 *
 * The app shell needs a user, and redirecting to login would be wrong — the reader may
 * well be signed in. So this uses the public header and waits.
 */
export function WakingPage({ what }: { what?: string }) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-[1100px] px-[var(--space-5)] py-[var(--space-10)] sm:px-[var(--space-8)]">
        <WakingUp what={what} />
      </main>
    </div>
  );
}
