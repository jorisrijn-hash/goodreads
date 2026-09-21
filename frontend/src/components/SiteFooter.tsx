import Link from "next/link";
import { PHOTOGRAPHS } from "@/content/photography";
import { BrandLockup } from "./Brand";

/**
 * The colophon.
 *
 * Where a printed book puts the facts about itself: what this is, where its data comes
 * from, and who made the pictures. Forest, so every page ends on a dark band instead of
 * trailing off into more ivory.
 */
export function SiteFooter() {
  return (
    <footer data-surface="forest" className="mt-auto">
      <div className="page-frame grid gap-y-[var(--space-10)] py-[var(--space-16)] lg:grid-cols-12 lg:gap-x-[var(--space-8)]">
        <div className="lg:col-span-5">
          <BrandLockup tone="ivory" height={34} lazy />
          <p className="mt-[var(--space-5)] max-w-[40ch] text-[0.9375rem] leading-relaxed text-[var(--fg-muted)]">
            An independent redesign and engineering case study. Not affiliated with
            Goodreads or Amazon, and no Goodreads data is used.
          </p>
        </div>

        <nav aria-label="Footer" className="lg:col-span-2 lg:col-start-7">
          <h2 className="type-label text-[var(--fg-subtle)]">Product</h2>
          <ul className="mt-[var(--space-4)] flex list-none flex-col gap-[var(--space-2)] p-0 text-[0.9375rem]">
            <li><FooterLink href="/discover">Discover</FooterLink></li>
            <li><FooterLink href="/library">My Library</FooterLink></li>
            <li><FooterLink href="/login">Sign in</FooterLink></li>
          </ul>
        </nav>

        <div className="lg:col-span-4">
          <h2 className="type-label text-[var(--fg-subtle)]">Sources</h2>
          <dl className="mt-[var(--space-4)] grid gap-y-[var(--space-3)] text-[0.9375rem]">
            <div>
              <dt className="text-[var(--fg-subtle)]">Catalogue and covers</dt>
              <dd className="m-0">
                <FooterLink href="https://openlibrary.org">Open Library</FooterLink>
                <span className="text-[var(--fg-muted)]"> (data CC0)</span>
              </dd>
            </div>
            {PHOTOGRAPHS.length > 0 && (
              <div>
                <dt className="text-[var(--fg-subtle)]">Photography</dt>
                {/* One credit per photograph, however many crops of it are used. */}
                {PHOTOGRAPHS.filter((p, i, all) => all.findIndex((q) => q.sourceUrl === p.sourceUrl) === i).map((photo) => (
                  <dd key={photo.id} className="m-0">
                    <FooterLink href={photo.sourceUrl}>{photo.photographer}</FooterLink>
                    <span className="text-[var(--fg-muted)]"> ({photo.licence})</span>
                  </dd>
                ))}
              </div>
            )}
            <div>
              <dt className="text-[var(--fg-subtle)]">Source code</dt>
              <dd className="m-0">
                <FooterLink href="https://github.com/jorisrijn-hash/goodreads">GitHub</FooterLink>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className =
    "text-[var(--fg)] underline decoration-[var(--rule-strong)] underline-offset-4 " +
    "transition-colors duration-[var(--motion-fast)] hover:decoration-[var(--fg)]";
  return href.startsWith("/") ? (
    <Link href={href} className={className}>{children}</Link>
  ) : (
    <a href={href} className={className}>{children}</a>
  );
}
