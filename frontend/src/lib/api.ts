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

export const api = {
  signUp: (input: { email: string; username: string; password: string }) =>
    request<ApiUser>("POST", "/api/v1/users", input),

  logIn: (input: { email: string; password: string }) =>
    request<ApiUser>("POST", "/api/v1/auth/session", input),

  enterDemo: () => request<ApiUser>("POST", "/api/v1/auth/demo-session"),

  logOut: () => request<void>("DELETE", "/api/v1/auth/session"),

  me: () => request<ApiUser>("GET", "/api/v1/me"),
};
