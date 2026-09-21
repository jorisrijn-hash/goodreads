import { PublicShell } from "./PublicShell";
import { WakingUp } from "./WakingUp";

/**
 * A whole page for when we could not even learn who the reader is.
 *
 * The app shell needs a user, and redirecting to login would be wrong — the reader may
 * well be signed in. So this uses the public frame and waits.
 */
export function WakingPage({ what }: { what?: string }) {
  return (
    <PublicShell>
      <WakingUp what={what} />
    </PublicShell>
  );
}
