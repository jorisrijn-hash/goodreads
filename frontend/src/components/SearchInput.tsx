"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/**
 * The search field for Discover.
 *
 * Submits a real form so it works before JavaScript loads and so the query lives in the
 * URL — searches stay shareable, linkable and survive a refresh.
 *
 * The page hands in its current parameters rather than this reading them with
 * useSearchParams: that hook needs a Suspense boundary, and streamed Suspense content
 * stays hidden without JavaScript, which left no-JS readers with no search field at all.
 * The other filters ride along as hidden fields, so a search keeps them either way.
 */
export function SearchInput({
  params = {},
  autoFocus = false,
  tone = "light",
}: {
  /** The page's current query parameters. */
  params?: Record<string, string | undefined>;
  autoFocus?: boolean;
  /** "dark" for a forest section: the field and button invert rather than glow. */
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const urlQuery = params.q ?? "";
  const kept = Object.entries(params).filter(([key, value]) => value && key !== "q" && key !== "page") as [string, string][];
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
    const next = new URLSearchParams(kept);
    if (value.trim()) {
      next.set("q", value.trim());
    } else {
      next.delete("q");
    }
    router.push(`/discover?${next.toString()}`);
  }

  return (
    <form role="search" onSubmit={submit} action="/discover" className="w-full">
      {kept.map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <label htmlFor="discover-search" className="sr-only">
        Search books, authors or ISBN
      </label>
      {/* Field and action as one hard-edged unit, the catalogue's utility rather than a
          campaign search. */}
      <div className="relative flex">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
             className={`pointer-events-none absolute left-[var(--space-4)] top-1/2 -translate-y-1/2 ${tone === "dark" ? "text-[#a6aaa1]" : "text-[var(--fg-subtle)]"}`}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
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
          className={`min-h-[56px] w-full min-w-0 rounded-none border border-r-0 pl-[calc(var(--space-4)+26px)] pr-[var(--space-4)]
                      text-base transition-colors duration-[var(--motion-fast)]
                      ${tone === "dark"
                        ? "border-[var(--rule-strong)] bg-[rgba(244,240,231,0.06)] text-[var(--ivory)] placeholder:text-[#a6aaa1] focus:border-[var(--ivory)] focus:bg-[rgba(244,240,231,0.1)]"
                        : "border-[var(--border-strong)] bg-[var(--ivory)] text-[var(--ink)] placeholder:text-[var(--ink-60)] focus:border-[var(--forest)] focus:bg-white/70"}`}
        />
        <button
          type="submit"
          className={`inline-flex min-h-[56px] shrink-0 items-center whitespace-nowrap
                      rounded-none px-[var(--space-6)] text-[0.9375rem] font-medium
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
