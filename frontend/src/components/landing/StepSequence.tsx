"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Tracks which step the reader has scrolled to, and nothing more.
 *
 * Native scroll throughout: no pinning library, no hijacking. Each step block is observed
 * against a band across the middle of the viewport; the step inside that band is the
 * active one, and the sticky scene beside the steps shows it. Read-only by construction:
 * the scenes are drawings (see HowItWorksSection), and this component never fetches.
 */
export function StepSequence({
  steps,
  scenes,
}: {
  steps: ReactNode[];
  scenes: ReactNode[];
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.step));
          }
        }
      },
      // A thin band across the middle: exactly one step is in it at a time.
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-12 lg:gap-x-[var(--space-8)]">
      {/* Desktop: one scene, held in view while the steps pass. */}
      <div className="hidden lg:col-span-6 lg:block">
        <div className="sticky top-[14vh] flex h-[72vh] items-center justify-center">
          <div className="scene-stage" aria-hidden="true">
            {scenes.map((scene, i) => (
              <div key={i} className="scene" data-active={active === i ? "" : undefined} data-step={i}>
                {scene}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ol className="m-0 list-none p-0 lg:col-span-5 lg:col-start-8">
        {steps.map((step, i) => (
          <li
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            data-step={i}
            data-active={active === i ? "" : undefined}
            className="step flex flex-col justify-center py-[var(--space-12)] lg:min-h-[72vh] lg:py-0"
          >
            {step}
            {/* Phones: each step carries its own scene, since nothing can stay pinned. */}
            <div className="scene-stage scene-stage--inline mt-[var(--space-8)] lg:hidden" aria-hidden="true">
              <div className="scene" data-active="">{scenes[i]}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
