"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Tracks which step the reader has scrolled to, and nothing more.
 *
 * Native scroll throughout: no pinning library, no hijacking. Each step is observed
 * against a band across the middle of the viewport; the step in that band is the active
 * one. The canvas beside the steps reads the active step from data-state and CSS moves
 * its parts; the rail beside the steps fills to match. Read-only by construction: the
 * canvas is a drawing, and this component never fetches.
 */
export function StepSequence({ canvas, steps }: { canvas: ReactNode; steps: ReactNode[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const progress = steps.length > 1 ? active / (steps.length - 1) : 1;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-12 lg:gap-x-[var(--space-10)]">
      {/* Desktop: one canvas, held in view while the steps pass beside it. */}
      <div className="hidden lg:col-span-7 lg:block">
        <div className="sticky top-[11vh] h-[78vh]" data-state={active} aria-hidden="true">
          {canvas}
        </div>
      </div>

      <div className="relative lg:col-span-5" style={{ ["--progress" as string]: progress }}>
        <span aria-hidden="true" className="steps-rail hidden lg:block" />
        <ol className="m-0 list-none p-0">
          {steps.map((step, i) => (
            <li
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              data-step={i}
              data-active={active === i ? "" : undefined}
              className="step flex flex-col justify-center py-[var(--space-10)] lg:min-h-[78vh] lg:py-0 lg:pl-[var(--space-10)]"
            >
              {step}
              {/* Phones: the same canvas, held in this step's state, since nothing can stay pinned. */}
              <div className="mt-[var(--space-8)] lg:hidden" data-state={i} aria-hidden="true">
                {canvas}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
