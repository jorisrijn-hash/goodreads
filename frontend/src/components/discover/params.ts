/**
 * Discover's URL state: what the page shows is entirely described by its query string,
 * so every control is a plain link or GET form and works without JavaScript.
 *
 * Everything here maps onto parameters the API already accepts; nothing is filtered or
 * sorted in the browser.
 */
export type DiscoverParams = {
  q?: string;
  genre?: string;
  minPages?: string;
  maxPages?: string;
  sort?: string;
  page?: string;
};

const KEYS = ["q", "genre", "minPages", "maxPages", "sort", "page"] as const;

/** Page size of the catalogue grid: 6 rows of 4, 8 of 3, 12 of 2. */
export const PAGE_SIZE = 24;

/**
 * Length bands. Bounds are inclusive in the API (page_count >= min, <= max), so the bands
 * are half-open by construction: 200–600 stops at 599 and 600+ starts at 600.
 */
export const LENGTHS = [
  { id: "any", label: "Any", minPages: undefined, maxPages: undefined },
  { id: "short", label: "Under 200", minPages: undefined, maxPages: "199" },
  { id: "medium", label: "200–600", minPages: "200", maxPages: "599" },
  { id: "long", label: "600+", minPages: "600", maxPages: undefined },
] as const;

/** Only orders the API supports. Relevance exists only while there is a query. */
export const SORTS = [
  { id: "RELEVANCE", label: "Relevance" },
  { id: "NEWEST", label: "Newest" },
  { id: "OLDEST", label: "Oldest" },
  { id: "SHORTEST", label: "Shortest" },
  { id: "LONGEST", label: "Longest" },
  { id: "TITLE", label: "Title A–Z" },
] as const;

export type SortId = (typeof SORTS)[number]["id"];

/** Keeps only the known, non-empty parameters, trimmed. */
export function clean(params: Record<string, string | string[] | undefined>): DiscoverParams {
  const out: DiscoverParams = {};
  for (const key of KEYS) {
    const raw = params[key];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) out[key] = value;
  }
  return out;
}

/**
 * The order in effect. Without a query the catalogue reads newest first; with one, by
 * relevance. An explicit sort wins, except Relevance without a query, which the API would
 * treat as its internal id order.
 */
export function effectiveSort(params: DiscoverParams): SortId {
  const requested = SORTS.find((s) => s.id === params.sort?.toUpperCase())?.id;
  if (requested && !(requested === "RELEVANCE" && !params.q)) return requested;
  return params.q ? "RELEVANCE" : "NEWEST";
}

/** The sort options that make sense for this state. */
export function sortOptions(params: DiscoverParams) {
  return SORTS.filter((s) => s.id !== "RELEVANCE" || params.q);
}

/** Which length band the page/min/max parameters correspond to, if any. */
export function activeLength(params: DiscoverParams) {
  return LENGTHS.find((l) => l.minPages === params.minPages && l.maxPages === params.maxPages);
}

/**
 * A /discover URL from the current state plus changes. Any change resets pagination,
 * since page 3 of one result set means nothing in another. A sort equal to the default
 * for the state is left out, so there is one URL per view.
 */
export function discoverHref(
  params: DiscoverParams,
  changes: Partial<Record<keyof DiscoverParams, string | undefined>> = {},
): string {
  const next: DiscoverParams = { ...params, page: undefined, ...changes };
  if (next.sort && next.sort.toUpperCase() === (next.q ? "RELEVANCE" : "NEWEST")) {
    next.sort = undefined;
  }
  const query = new URLSearchParams();
  for (const key of KEYS) {
    const value = next[key];
    if (value && !(key === "page" && value === "0")) query.set(key, value);
  }
  const string = query.toString();
  return string ? `/discover?${string}` : "/discover";
}

/** The API request for the grid. */
export function apiQuery(params: DiscoverParams, page: number): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.genre) query.set("genre", params.genre);
  if (params.minPages) query.set("minPages", params.minPages);
  if (params.maxPages) query.set("maxPages", params.maxPages);
  query.set("sort", effectiveSort(params));
  query.set("page", String(page));
  query.set("size", String(PAGE_SIZE));
  return `/api/v1/books?${query.toString()}`;
}

/** A short human label for a page range that may not match a band (an older link). */
export function lengthLabel(params: DiscoverParams): string | null {
  const band = activeLength(params);
  if (band && band.id !== "any") return `${band.label} pages`;
  const { minPages: min, maxPages: max } = params;
  if (min && max) return `${min}–${max} pages`;
  if (max) return `Up to ${max} pages`;
  if (min) return `${min}+ pages`;
  return null;
}
