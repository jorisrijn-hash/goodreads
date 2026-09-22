import Link from "next/link";
import { PHOTOGRAPHS } from "@/content/photography";
import { BrandLockup } from "./Brand";

/**
 * The colophon: one quiet line of identity, links and the disclaimer, then the credits
 * for every photograph the product shows (one per photographer).
 */
export function SiteFooter() {
  const credits = PHOTOGRAPHS.filter((p, i, all) => all.findIndex((q) => q.photographer === p.photographer) === i);
  return (
    <footer data-surface="ivory" className="mt-auto border-t border-[var(--rule)]">
      <div className="page-frame flex flex-col gap-[var(--space-5)] py-[var(--space-8)] lg:flex-row lg:items-center lg:justify-between">
        <BrandLockup lazy />
        <nav aria-label="Footer">
          <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-2)] p-0 text-[0.8125rem]">
            <li><Link href="/#about" className="link-rule text-[var(--fg-muted)]">About</Link></li>
            <li><Link href="/discover" className="link-rule text-[var(--fg-muted)]">Discover</Link></li>
            <li><a href="https://openlibrary.org" className="link-rule text-[var(--fg-muted)]">Data: Open Library (CC0)</a></li>
            <li><a href="https://github.com/jorisrijn-hash/goodreads" className="link-rule text-[var(--fg-muted)]">Source code</a></li>
          </ul>
        </nav>
        <p className="m-0 text-[0.75rem] text-[var(--fg-subtle)]">Not affiliated with Goodreads or Amazon.</p>
      </div>
      <div className="page-frame border-t border-[var(--rule)] py-[var(--space-4)]">
        <p className="m-0 text-[0.75rem] text-[var(--fg-subtle)]">
          Photography:{" "}
          {credits.map((photo, i) => (
            <span key={photo.id}>
              {i > 0 && ", "}
              <a href={photo.sourceUrl} className="link-rule">{photo.photographer}</a> ({photo.licence})
            </span>
          ))}
          .
        </p>
      </div>
    </footer>
  );
}
