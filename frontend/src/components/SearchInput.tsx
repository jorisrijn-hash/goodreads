"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

/**
 * The search field for Discover.
 *
 * Submits a real form so it works before JavaScript loads and so the query lives in the
 * URL — searches stay shareable, linkable and survive a refresh.
 */
export function SearchInput({
  autoFocus = false,
  tone = "light",
}: {
  autoFocus?: boolean;
  /** "dark" for a forest section: the field and button invert rather than glow. */
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the field in step when navigation changes the query (back button, a genre link).
  // Adjusted during render rather than in an effect, so there is no frame showing the
  // stale query.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setValue(urlQuery);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) {
      next.set("q", value.trim());
    } else {
      next.delete("q");
    }
    next.delete("page");
    router.push(`/discover?${next.toString()}`);
  }

  return (
    <form role="search" onSubmit={submit} action="/discover" className="w-full">
      <label htmlFor="discover-search" className="sr-only">
        Search books, authors or ISBN
      </label>
      <div className="flex gap-[var(--space-2)]">
        <input
          id="discover-search"
          ref={inputRef}
          name="q"
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => setValue(event.target.value)}
          // Short enough to survive a phone-width field; the full wording is the label.
          placeholder="Title, author or ISBN"
          className={`min-h-[52px] w-full rounded-[var(--radius-input)] border px-[var(--space-4)]
                      text-base transition-colors duration-[var(--motion-fast)]
                      ${tone === "dark"
                        ? "border-[var(--rule-strong)] bg-[rgba(244,240,231,0.06)] text-[var(--ivory)] placeholder:text-[#a6aaa1] focus:border-[var(--ivory)] focus:bg-[rgba(244,240,231,0.1)]"
                        : "border-[var(--border-strong)] bg-white/60 text-[var(--ink)] placeholder:text-[var(--ink-60)] focus:border-[var(--forest)] focus:bg-white/90"}`}
        />
        <button
          type="submit"
          className={`inline-flex min-h-[52px] items-center whitespace-nowrap
                      rounded-[var(--radius-input)] px-[var(--space-6)] text-base font-medium
                      transition-colors duration-[var(--motion-fast)]
                      ${tone === "dark"
                        ? "bg-[var(--ivory)] text-[var(--forest)] hover:bg-[var(--paper)]"
                        : "bg-[var(--forest)] text-[var(--ivory)] hover:bg-[var(--forest-hover)]"}`}
        >
          Search
        </button>
      </div>
    </form>
  );
}
