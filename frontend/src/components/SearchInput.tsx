"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * The search field for Discover.
 *
 * Submits a real form so it works before JavaScript loads and so the query lives in the
 * URL — searches stay shareable, linkable and survive a refresh.
 */
export function SearchInput({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the field in step when navigation changes the query (back button, a genre link).
  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

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
          placeholder="Search books, authors or ISBN"
          className="min-h-[52px] w-full rounded-[var(--radius-input)] border
                     border-[var(--border-strong)] bg-white/60 px-[var(--space-4)]
                     text-base text-[var(--ink)] transition-colors
                     duration-[var(--motion-fast)] placeholder:text-[var(--ink-60)]
                     focus:border-[var(--forest)] focus:bg-white/90"
        />
        <button
          type="submit"
          className="inline-flex min-h-[52px] items-center whitespace-nowrap
                     rounded-[var(--radius-input)] bg-[var(--forest)] px-[var(--space-6)]
                     text-base font-medium text-[var(--ivory)]
                     transition-colors duration-[var(--motion-fast)]
                     hover:bg-[var(--forest-hover)]"
        >
          Search
        </button>
      </div>
    </form>
  );
}
