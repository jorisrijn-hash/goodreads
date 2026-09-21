/**
 * Motion rules, in one place.
 *
 * Editorial and physical: things settle into place, they do not bounce or float. These
 * are the only values components should use, so the whole product moves the same way.
 */

/** Seconds, because that is what Motion takes. */
export const DURATION = {
  /** Hover, press, small state changes. */
  ui: 0.16,
  /** Section and element entrances. */
  enter: 0.56,
  /** The slowest thing on a page — a hero settling. */
  settle: 0.64,
} as const;

/** Mirrors --ease-settle in globals.css. */
export const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;
/** Mirrors --ease. */
export const EASE = [0.22, 0.61, 0.36, 1] as const;

/** Delay between siblings in a staggered entrance. */
export const STAGGER = 0.06;

/** How far an entering element travels, in pixels. */
export const TRAVEL = 20;

/** Upper bounds for pointer-driven effects. */
export const PARALLAX_MAX = 8;
export const TILT_MAX_DEG = 1.5;
