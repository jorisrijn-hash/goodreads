"use client";

import { useEffect, useState } from "react";

const CHAPTERS = [
  { id: "hero", label: "Home" },
  { id: "discover", label: "Discover" },
  { id: "library", label: "Your library" },
  { id: "how", label: "How it works" },
  { id: "anywhere", label: "Read anywhere" },
];

/**
 * The small numbered index at the right edge: which chapter you are in, and a way to
 * jump to another. Native anchors, so it works without JavaScript; the script only marks
 * the current chapter and inverts the ink over dark chapters.
 */
export function ChapterIndex() {
  const [active, setActive] = useState(0);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const els = CHAPTERS.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = els.indexOf(e.target as HTMLElement);
          setActive(i);
          const surface = (e.target as HTMLElement).dataset.surface;
          setDark(surface === "forest" || surface === "burgundy");
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Chapters"
      className={`chapter-index fixed right-[16px] top-[96px] z-50 hidden border-l border-current/40 pl-[10px] transition-colors duration-300 xl:block ${dark ? "text-[var(--ivory)]" : "text-[var(--ink)]"}`}
    >
      <ol className="m-0 list-none p-0">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <a href={`#${c.id}`} aria-current={active === i ? "true" : undefined} aria-label={`${String(i + 1).padStart(2, "0")} ${c.label}`}>
              {String(i + 1).padStart(2, "0")}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
