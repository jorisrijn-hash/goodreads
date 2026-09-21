import type { NextConfig } from "next";

/**
 * Covers are served by our own API as pre-generated 160/320/640px derivatives, cached
 * immutably, and rendered with a plain <img srcset>. Next's image optimiser is therefore
 * not in the path and needs no remotePatterns — see the note in BookCover for why.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
