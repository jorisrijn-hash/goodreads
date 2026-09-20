import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection — a user-experience guard, not a security boundary.
 *
 * This only checks whether a session cookie is *present*. It cannot tell whether that
 * cookie is valid: the session lives in PostgreSQL and only Spring can judge it. Its
 * job is to send someone without any session to the sign-in page, carrying where they
 * were headed, instead of rendering a page that will immediately redirect.
 *
 * The real enforcement is elsewhere and unaffected by this file:
 *   - Spring Security denies every /api/v1/me/** request without a valid session;
 *   - each protected page re-checks with the API during server rendering.
 *
 * A forged cookie gets past this and then fails both of those.
 */
const SESSION_COOKIE = "GRSESSION";
const PROTECTED = ["/home"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  // Preserve intent. The target is built from the request's own pathname rather than
  // anything user-supplied, and is re-validated by safeReturnTo before it is used.
  const login = new URL("/login", request.url);
  login.searchParams.set("returnTo", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/home/:path*"],
};
