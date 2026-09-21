import type { NextConfig } from "next";

/**
 * Where the Spring API actually lives.
 *
 * Server-only on purpose: this is never a NEXT_PUBLIC_ variable, because the browser
 * must not address the API host directly. It talks to this origin instead, and the
 * rewrites below forward those requests.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8080";

/**
 * Where cover bytes actually live, as a full base URL including any path prefix.
 *
 * A base *URL* rather than an origin, because object storage puts the bucket in the
 * path. Supabase public objects live at
 * `https://<ref>.supabase.co/storage/v1/object/public/book-covers`, which an
 * origin-only variable could not express.
 *
 * Changing storage provider is this one variable. The public path the browser sees
 * stays `/covers/<shard>/<id>-<width>.jpg`, so no application code, no database key and
 * no rendered URL moves with the bytes.
 *
 * Defaults to the API, which serves covers from disk in local development.
 */
const COVERS_BASE_URL = process.env.COVERS_BASE_URL ?? `${API_ORIGIN}/covers`;

/**
 * The API is proxied so that it is same-origin with the frontend.
 *
 * The browser calls `/api/v1/…` and `/covers/…` on the Vercel domain; Vercel forwards
 * them to Spring. That one decision removes a class of production-only auth failures:
 *
 *   - the session cookie is first-party, so no SameSite=None and no third-party cookie
 *     (which Safari and Chrome increasingly refuse outright);
 *   - the CSRF cookie is readable by our own JavaScript, because it is our own origin;
 *   - there is no CORS preflight on credentialed requests at all.
 *
 * This is infrastructure routing, not application logic. Next.js forwards bytes; it does
 * not authenticate, authorise or decide anything. Spring remains the backend.
 *
 * Local development uses exactly the same path, so what is tested is what ships.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${API_ORIGIN}/api/v1/:path*` },
      { source: "/covers/:path*", destination: `${COVERS_BASE_URL}/:path*` },
    ];
  },
};

export default nextConfig;
