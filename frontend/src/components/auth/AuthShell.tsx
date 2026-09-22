"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, ViewTransition, type ReactNode } from "react";
import { warmUp, type AuthKind } from "@/lib/auth-flow";
import { BrandLockup } from "../Brand";
import { AuthScene } from "./AuthScene";

type Leave = (kind: AuthKind, href: string) => void;
const LeaveContext = createContext<Leave>(() => {});

/** Called by a form once authentication has succeeded: plays the exit and navigates. */
export function useLeave(): Leave {
  return useContext(LeaveContext);
}

/**
 * The sign-in and sign-up screens: a book scene on the left, the form on the right.
 *
 * This is the shared layout of both routes, so moving between them keeps the page and the
 * scene in place: only the form panel changes (a short cross-fade, where the browser
 * supports view transitions), and the books rearrange from "return to your reading" to
 * "start your library".
 *
 * On success it does not wait and then jump. Navigation to the destination starts at
 * once, and while it loads the page closes like a spread: the form settles, the books
 * draw in, and an ivory layer (the colour of the page that follows) crosses from the
 * split to cover the scene. If the next page takes longer than that, the layer says so.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const variant = pathname.startsWith("/signup") ? "signup" : "login";
  const [leaving, setLeaving] = useState<AuthKind | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Fetch the token and, on a sleeping host, start waking it while the reader types.
    warmUp().catch(() => {});
    // The staged entrance is for arriving, not for moving between the two forms.
    const t = setTimeout(() => setEntered(true), 700);
    return () => clearTimeout(t);
  }, []);

  const leave = useCallback<Leave>((kind, href) => {
    setLeaving(kind);
    router.push(href);
  }, [router]);

  return (
    <LeaveContext.Provider value={leave}>
      <div
        className="auth-shell"
        data-variant={variant}
        data-entered={entered || undefined}
        data-leaving={leaving ?? undefined}
      >
        <AuthScene />

        <main id="main" className="auth-panel">
          <div className="auth-panel__inner">
            {/* The "g" and the label, never the wordmark alone beside a password field. */}
            <Link href="/" className="auth-in auth-in--1 inline-flex self-start no-underline" aria-label="goodreads, independent redesign, home">
              <BrandLockup mark="g" />
            </Link>

            <ViewTransition key={variant} enter="auth-panel-in" exit="auth-panel-out" default="none">
              <div className="auth-panel__body">{children}</div>
            </ViewTransition>

          </div>
        </main>

        <div className="auth-veil" aria-hidden="true">
          <span className="auth-veil__edge" />
          <span className="auth-veil__label type-label">Opening your library…</span>
        </div>
      </div>
    </LeaveContext.Provider>
  );
}
