/**
 * Browser-side access to the Spring API.
 *
 * Every request carries cookies, and every state-changing one carries the CSRF token
 * that Spring issued. Nothing here decides anything: it forwards to the backend and
 * surfaces what comes back. Authentication rules live in Spring.
 */
/**
 * The API is same-origin from the browser's point of view.
 *
 * Requests go to `/api/v1/…` on whatever origin the app is served from, and Next.js
 * rewrites them to the Spring host (see next.config.ts). Nothing here needs to know
 * where the backend actually is, and no API host is exposed to the browser at all —
 * which is what keeps the session cookie first-party.
 */
export const API_BASE = "";

export type ApiUser = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  demo: boolean;
};

/** RFC 9457 problem response, as produced by the backend's ApiErrorHandler. */
export type ApiProblem = {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  errors?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(problem: ApiProblem) {
    super(problem.detail ?? problem.title ?? "Something went wrong.");
    this.status = problem.status;
    this.fieldErrors = problem.errors ?? {};
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Spring issues the CSRF cookie lazily, so on a first visit the very first
 * state-changing request — usually logging in — would have no token to send.
 */
async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCookie("XSRF-TOKEN");
  if (existing) return existing;
  await fetch(`${API_BASE}/api/v1/csrf`, { credentials: "include" });
  return readCookie("XSRF-TOKEN");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T | null> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (method !== "GET") {
    const token = await ensureCsrfToken();
    if (token) headers["X-XSRF-TOKEN"] = token;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(
      payload ?? { status: response.status, detail: "Something went wrong." },
    );
  }
  return payload as T;
}

// ------------------------------------------------------------------ catalogue --

export type Book = {
  slug: string;
  title: string;
  authors: string[];
  publishedYear: number | null;
  pageCount: number | null;
  genres: string[];
  coverKey: string | null;
};

export type BookDetail = Omit<Book, "genres"> & {
  description: string | null;
  language: string | null;
  isbn13: string | null;
  genres: { slug: string; name: string }[];
};

export type BookPage = {
  items: Book[];
  page: number;
  size: number;
  total: number;
  hasMore: boolean;
  /** Set when a fallback recovered the query, so the UI can say "showing results for". */
  correctedFrom: string | null;
};

export type Genre = { slug: string; name: string; bookCount: number };

/** GET /api/v1/catalogue/stats — the size of the catalogue, nothing else. */
export type CatalogueStats = { books: number; authors: number; genres: number };

export type ReadingStatus = "WANT_TO_READ" | "CURRENTLY_READING" | "READ" | "DNF";

export type SaveReason =
  | "RECOMMENDED"
  | "SAW_ONLINE"
  | "SCHOOL_OR_WORK"
  | "AUTHOR_INTEREST"
  | "OTHER";

export type LibraryEntry = {
  book: Book;
  status: ReadingStatus;
  saveReason: SaveReason | null;
  saveNote: string | null;
  /** Where the reader is in the reading they are on now; null before any is recorded. */
  currentPage: number | null;
  progressPercent: number | null;
  progressUpdatedAt: string | null;
  /**
   * These describe the current reading, not the first one ever: starting a finished book
   * again moves startedAt and clears finishedAt. The journal holds the history.
   */
  startedAt: string | null;
  finishedAt: string | null;
  savedAt: string;
  updatedAt: string;
};

/** One recorded position. Append-only: a correction is a new entry, never an edit. */
export type ProgressUpdate = {
  id: number;
  page: number | null;
  percent: number | null;
  note: string | null;
  at: string;
};

/**
 * The result of recording progress. `progressUpdate` is null when nothing changed (the
 * same page with no note), so the UI can tell "saved" from "nothing to save".
 */
export type ProgressResult = { libraryItem: LibraryEntry; progressUpdate: ProgressUpdate | null };

export type ReadingEventType =
  | "SAVED"
  | "STARTED"
  | "FINISHED"
  | "ABANDONED"
  | "RESUMED"
  | "RESTARTED"
  | "STATUS_CHANGED";

/**
 * One line of the reader's journal: either a status event or a recorded position.
 *
 * The wording belongs to the client, because the event alone does not carry the meaning:
 * FINISHED reads as "Finished Dune" after reading it, and "Added Dune as Read" when a
 * reader logs a book they finished years ago. That is what `fromStatus` is for.
 */
export type JournalEntry = {
  id: string;
  kind: "EVENT" | "PROGRESS";
  at: string;
  book: Book;
  event: ReadingEventType | null;
  fromStatus: ReadingStatus | null;
  toStatus: ReadingStatus | null;
  page: number | null;
  pageCount: number | null;
  percent: number | null;
  note: string | null;
};

/** A page of the journal, newest first. `nextCursor` is null on the last page. */
export type JournalPage = { items: JournalEntry[]; nextCursor: string | null };

export type LibrarySummary = {
  total: number;
  wantToRead: number;
  currentlyReading: number;
  read: number;
  didNotFinish: number;
};

/**
 * Builds a cover URL.
 *
 * <p>The single place cover URLs are constructed anywhere in the application. The API
 * returns a storage key; the widths are the three the ingest generates.
 *
 * <p>Always same-origin and relative. Where the bytes physically live — the API's disk
 * in development, Supabase Storage in production, something else later — is decided by
 * one rewrite in next.config.ts and is invisible here. Nothing in the frontend, and no
 * value in the database, knows the storage provider.
 */
export function coverUrl(
  coverKey: string | null | undefined,
  width: 160 | 320 | 640,
): string | null {
  if (!coverKey) return null;
  return `/covers/${coverKey}-${width}.jpg`;
}

function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  signUp: (input: { email: string; username: string; password: string }) =>
    request<ApiUser>("POST", "/api/v1/users", input),

  logIn: (input: { email: string; password: string }) =>
    request<ApiUser>("POST", "/api/v1/auth/session", input),

  enterDemo: () => request<ApiUser>("POST", "/api/v1/auth/demo-session"),

  logOut: () => request<void>("DELETE", "/api/v1/auth/session"),

  me: () => request<ApiUser>("GET", "/api/v1/me"),

  // --- catalogue (public) ---
  books: (params: {
    q?: string;
    genre?: string;
    minPages?: number;
    maxPages?: number;
    sort?: string;
    page?: number;
    size?: number;
  }) => request<BookPage>("GET", `/api/v1/books${query(params)}`),

  book: (slug: string) => request<BookDetail>("GET", `/api/v1/books/${slug}`),

  genres: () => request<Genre[]>("GET", "/api/v1/genres"),

  // --- personal library (authenticated) ---
  library: (params: { status?: string; q?: string } = {}) =>
    request<LibraryEntry[]>("GET", `/api/v1/me/library${query(params)}`),

  librarySummary: () => request<LibrarySummary>("GET", "/api/v1/me/library/summary"),

  libraryEntry: (slug: string) =>
    request<LibraryEntry>("GET", `/api/v1/me/library/${slug}`),

  saveBook: (slug: string, body?: {
    status?: ReadingStatus;
    saveReason?: SaveReason;
    saveNote?: string;
  }) => request<LibraryEntry>("PUT", `/api/v1/me/library/${slug}`, body ?? {}),

  updateLibraryEntry: (slug: string, body: {
    status?: ReadingStatus;
    saveReason?: SaveReason | null;
    saveNote?: string | null;
  }) => request<LibraryEntry>("PATCH", `/api/v1/me/library/${slug}`, body),

  removeBook: (slug: string) =>
    request<void>("DELETE", `/api/v1/me/library/${slug}`),

  /**
   * Records where the reader has got to. Send the page for a book whose length the
   * catalogue knows (the server derives the percentage), otherwise the percentage.
   * Only while a book is Currently Reading; the same page with no note changes nothing.
   */
  recordProgress: (slug: string, body: { page?: number; percent?: number; note?: string }) =>
    request<ProgressResult>("POST", `/api/v1/me/library/${slug}/progress`, body),

  /** The reader's own journal, newest first; `book` narrows it to one book's history. */
  journal: (params: { before?: string; limit?: number; book?: string } = {}) =>
    request<JournalPage>("GET", `/api/v1/me/journal${query(params)}`),
};

/** The product's note limit, the same number the API and the schema enforce. */
export const MAX_PROGRESS_NOTE = 1000;

/** The labels readers see. The API's values are deliberately not shown as-is. */
export const STATUS_LABEL: Record<ReadingStatus, string> = {
  WANT_TO_READ: "Want to Read",
  CURRENTLY_READING: "Currently Reading",
  READ: "Read",
  DNF: "Did Not Finish",
};

export const SAVE_REASON_LABEL: Record<SaveReason, string> = {
  RECOMMENDED: "Someone recommended it",
  SAW_ONLINE: "Saw it online",
  SCHOOL_OR_WORK: "For school or work",
  AUTHOR_INTEREST: "I follow the author",
  OTHER: "Something else",
};
