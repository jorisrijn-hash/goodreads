/**
 * Browser-side access to the Spring API.
 *
 * Every request carries cookies, and every state-changing one carries the CSRF token
 * that Spring issued. Nothing here decides anything: it forwards to the backend and
 * surfaces what comes back. Authentication rules live in Spring.
 */
/**
 * Where the Spring API lives.
 *
 * The localhost fallback applies in development only. In a production build an unset
 * variable is a configuration error, and failing loudly is far better than silently
 * asking the visitor's own machine for an API that is not there.
 *
 * This is a URL, not a secret, so NEXT_PUBLIC_ is appropriate. Database credentials and
 * anything else the backend holds must never be exposed this way.
 */
function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:8080";
  return "";
}

export const API_BASE = resolveApiBase();

export class ApiNotConfiguredError extends Error {
  constructor() {
    super(
      "NEXT_PUBLIC_API_URL is not set, so there is no API to talk to. " +
        "Set it to the deployed Spring backend.",
    );
  }
}

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
  if (!API_BASE) throw new ApiNotConfiguredError();

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
  startedAt: string | null;
  finishedAt: string | null;
  savedAt: string;
  updatedAt: string;
};

export type LibrarySummary = {
  total: number;
  wantToRead: number;
  currentlyReading: number;
  read: number;
  didNotFinish: number;
};

/** Builds a cover URL. The API returns a key; widths are the three we generate. */
export function coverUrl(
  coverKey: string | null | undefined,
  width: 160 | 320 | 640,
): string | null {
  if (!coverKey || !API_BASE) return null;
  return `${API_BASE}/covers/${coverKey}-${width}.jpg`;
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
};

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
