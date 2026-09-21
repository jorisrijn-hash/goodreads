"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Searches within the reader's own library, keeping the active status tab. */
export function LibrarySearch({
  initialQuery,
  status,
}: {
  initialQuery: string;
  status?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (value.trim()) params.set("q", value.trim());
    const qs = params.toString();
    router.push(qs ? `/library?${qs}` : "/library");
  }

  return (
    <form role="search" onSubmit={submit}>
      <label htmlFor="library-search" className="sr-only">Search your library</label>
      <input
        id="library-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search your library"
        className="min-h-[44px] w-full rounded-[var(--radius-input)] border
                   border-[var(--border-strong)] bg-white/60 px-[var(--space-3)]
                   text-base text-[var(--ink)] placeholder:text-[var(--ink-60)]
                   focus:border-[var(--forest)] focus:bg-white/90"
      />
    </form>
  );
}
