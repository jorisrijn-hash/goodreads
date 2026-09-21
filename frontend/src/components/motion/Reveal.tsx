"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Settles its content into place the first time it scrolls into view. Once — a page
 * that re-animates as you scroll back up is performing rather than being read.
 *
 * Deliberately not built on Motion. A one-shot fade-and-rise needs an
 * IntersectionObserver and a CSS transition; Motion's runtime for the same effect
 * measured 12–44 kB of extra JavaScript per page. Motion is kept for what CSS cannot do
 * well — orchestrated sequences, layout transitions, pointer-driven depth. The timing
 * here uses the same tokens (--motion-enter, --ease-settle, 20px travel), so the two
 * are indistinguishable to a reader.
 *
 * Without JavaScript, or with reduced motion, content is simply there: see globals.css.
 */
export function Reveal({
  children,
  delay = 0,
  as: Component = "div",
  className,
}: {
  children: ReactNode;
  /** Seconds, matching the Motion tokens in lib/motion.ts. */
  delay?: number;
  as?: "div" | "section" | "li";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.15,
        // Everything above the viewport counts as seen. Without this, a section the
        // page jumps straight past (End key, a fast fling, an anchor link) goes from
        // "below" to "above" without ever intersecting, and stays invisible when the
        // reader scrolls back up.
        rootMargin: "100000px 0px 0px 0px",
      },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      // A union of intrinsic elements makes the ref type awkward; all three are HTMLElement.
      ref={ref as never}
      data-reveal=""
      data-shown={shown ? "" : undefined}
      className={className}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Component>
  );
}
