"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, type ApiUser } from "@/lib/api";

/**
 * Account menu.
 *
 * Profile is not a top-level destination — it lives here, alongside account actions.
 * Built on a native button with explicit keyboard handling rather than hover, because
 * a hover-only menu is unusable by keyboard and on touch.
 */
export function AvatarMenu({ user }: { user: ApiUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        // Focus must come back to where it was, or a keyboard user is stranded.
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function logOut() {
    setLoggingOut(true);
    try {
      await api.logOut();
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  const initial = (user.displayName || user.username).charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-[44px] min-w-[44px] items-center gap-[var(--space-2)]
                   rounded-[var(--radius-input)] px-[var(--space-2)]
                   transition-colors duration-[var(--motion-fast)] hover:bg-[var(--wash)]"
      >
        {/* Inverts with the surface: ink on ivory, ivory on forest. */}
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full
                     bg-[var(--fg)] text-sm font-medium text-[var(--surface)]"
        >
          {initial}
        </span>
        <span className="sr-only">Account menu for {user.displayName}</span>
      </button>

      {open && (
        <div
          role="menu"
          // The menu is its own light surface whatever the header is painted on.
          data-surface="ivory"
          className="absolute right-0 z-10 mt-[var(--space-2)] w-56
                     rounded-[var(--radius-card)] border border-[var(--border-strong)]
                     bg-[var(--ivory)] py-[var(--space-2)] shadow-sm"
        >
          <div className="border-b border-[var(--border)] px-[var(--space-4)] pb-[var(--space-3)]">
            <p className="font-serif text-base text-[var(--ink)]">{user.displayName}</p>
            <p className="text-sm text-[var(--ink-60)]">@{user.username}</p>
            {user.demo && (
              <p className="mt-[var(--space-2)] text-xs uppercase tracking-[0.12em] text-[var(--burgundy)]">
                Demo account
              </p>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={logOut}
            disabled={loggingOut}
            className="mt-[var(--space-2)] flex min-h-[44px] w-full items-center
                       px-[var(--space-4)] text-left text-[var(--ink)]
                       transition-colors duration-[var(--motion-fast)]
                       hover:bg-[var(--paper)] disabled:opacity-60"
          >
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
