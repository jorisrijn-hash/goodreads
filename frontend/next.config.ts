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
 * Where cover bytes live. Defaults to the API, which serves them from its own storage.
 *
 * Separate from API_ORIGIN so covers can move to object storage or a CDN by changing one
 * variable — the public path stays `/covers/<shard>/<id>-<width>.jpg`, so no application
 * code, no stored key and no rendered URL has to change.
 */
const COVERS_ORIGIN = process.env.COVERS_ORIGIN ?? API_ORIGIN;

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
      { source: "/covers/:path*", destination: `${COVERS_ORIGIN}/covers/:path*` },
    ];
  },
};

export default nextConfig;
