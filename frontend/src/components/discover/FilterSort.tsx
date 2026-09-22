import Link from "next/link";
import type { Genre } from "@/lib/api";
import {
  activeLength, discoverHref, effectiveSort, LENGTHS, lengthLabel, SORTS, sortOptions,
  type DiscoverParams,
} from "./params";

/**
 * "Filter & sort": one ruled line with the count opposite, and a native disclosure for
 * the controls. Every option is a link to the URL it produces, so the panel works with
 * JavaScript off, and the current choice is marked with aria-current as well as a rule.
 *
 * Active choices are repeated underneath as labels, each of which removes itself.
 */
export function FilterSort({
  params,
  total,
  genres,
}: {
  params: DiscoverParams;
  /** Null while the catalogue could not be reached. */
  total: number | null;
  genres: Genre[];
}) {
  const length = activeLength(params);
  const sort = effectiveSort(params);
  const genreName = genres.find((g) => g.slug === params.genre)?.name ?? params.genre;
  const rangeLabel = lengthLabel(params);
  const explicitSort = params.sort && sort !== (params.q ? "RELEVANCE" : "NEWEST");

  const labels = [
    params.q && { text: `“${params.q}”`, name: `search “${params.q}”`, href: discoverHref(params, { q: undefined }) },
    params.genre && { text: genreName, name: `genre ${genreName}`, href: discoverHref(params, { genre: undefined }) },
    rangeLabel && { text: rangeLabel, name: `length ${rangeLabel}`, href: discoverHref(params, { minPages: undefined, maxPages: undefined }) },
    explicitSort && {
      text: `Sorted: ${SORTS.find((s) => s.id === sort)?.label}`,
      name: "the sort order",
      href: discoverHref(params, { sort: undefined }),
    },
  ].filter(Boolean) as { text: string; name: string; href: string }[];

  return (
    <div className="relative">
      {/* The count sits over the summary's rule, outside the button, so the button's
          name stays "Filter & sort". */}
      {total !== null && (
        <p className="type-label pointer-events-none absolute right-0 top-0 m-0 flex h-[52px] items-center text-[0.75rem] tabular-nums text-[var(--fg)]">
          {total.toLocaleString("en")} {total === 1 ? "book" : "books"}
        </p>
      )}
      <details className="filter-sort">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center border-b border-[var(--fg)]">
          <span className="type-label inline-flex items-center gap-[var(--space-2)] text-[0.75rem] text-[var(--fg)]">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2 4h12M4.5 8h7M7 12h2" />
            </svg>
            <span className="link-draw">Filter &amp; sort</span>
            <span aria-hidden="true" className="filter-sort__mark">+</span>
          </span>
        </summary>

        <div className="grid gap-[var(--space-8)] border-b border-[var(--rule)] py-[var(--space-6)] md:grid-cols-[auto_1fr] md:gap-x-[var(--space-16)]">
          <fieldset className="m-0 border-0 p-0">
            <legend className="type-label mb-[var(--space-3)] p-0 text-[0.6875rem] text-[var(--fg-subtle)]">Length</legend>
            <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-1)] p-0">
              {LENGTHS.map((option) => (
                <li key={option.id}>
                  <Link
                    href={discoverHref(params, { minPages: option.minPages, maxPages: option.maxPages })}
                    aria-current={length?.id === option.id ? "true" : undefined}
                    className="option-link"
                  >
                    {option.label}
                    {option.id !== "any" && <span className="sr-only"> pages</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </fieldset>
          <fieldset className="m-0 border-0 p-0">
            <legend className="type-label mb-[var(--space-3)] p-0 text-[0.6875rem] text-[var(--fg-subtle)]">Sort</legend>
            <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-1)] p-0">
              {sortOptions(params).map((option) => (
                <li key={option.id}>
                  <Link
                    href={discoverHref(params, { sort: option.id })}
                    aria-current={sort === option.id ? "true" : undefined}
                    className="option-link"
                  >
                    {option.label}
                  </Link>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
      </details>

      {labels.length > 0 && (
        <ul aria-label="Active filters" className="m-0 mt-[var(--space-3)] flex list-none flex-wrap items-center gap-[var(--space-2)] p-0">
          {labels.map((label) => (
            <li key={label.href}>
              <Link href={label.href} aria-label={`Remove ${label.name}`} className="filter-label">
                <span className="max-w-[16rem] truncate">{label.text}</span>
                <span aria-hidden="true">×</span>
              </Link>
            </li>
          ))}
          {labels.length > 1 && (
            <li>
              <Link href="/discover" className="ml-[var(--space-2)] inline-flex min-h-[32px] items-center text-[0.8125rem] text-[var(--fg-muted)] underline underline-offset-4">
                Clear all
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
