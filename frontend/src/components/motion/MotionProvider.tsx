"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// A function, not the object: Motion then fetches the features after hydration instead
// of shipping them in the first bundle. Measured at 29 kB gzip on every page when
// imported directly.
const loadFeatures = () => import("./features").then((module) => module.default);

/**
 * The single place Motion is configured. Mounted around the surfaces that use Motion,
 * not the whole app, so a page without orchestrated motion pays nothing for it.
 *
 * LazyMotion keeps the animation runtime off the critical path; `strict` makes a stray
 * full `motion.*` component an error rather than a silent 30 kB. Until the features
 * arrive, `m` components render in their initial state, which is why every entrance is
 * short and why Reveal has a <noscript> fallback.
 *
 * reducedMotion="user" follows the operating-system setting: transforms are dropped and
 * only opacity remains, which is the rule this product follows.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
