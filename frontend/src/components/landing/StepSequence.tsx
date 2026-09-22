"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The pinned "how it works" stage. Native scroll only: the chapter is three screens tall,
 * the stage sticks for its length, and three invisible markers (one per screen) tell it
 * which step the reader has reached. That is written to data-state and --progress on the
 * stage; CSS moves the phone canvas, highlights the step and fills the rail. Nothing here
 * fetches.
 */
export function StepSequence({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [active, setActive] = useState(0);
  const markers = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    markers.current.forEach((m) => m && observer.observe(m));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
        {[0, 1, 2].map((i) => (
          <div key={i} ref={(el) => { markers.current[i] = el; }} data-step={i} className="absolute left-0 h-[var(--pin)] w-px" style={{ top: `calc(var(--pin) * ${i})` }} />
        ))}
      </div>
      <div className={className} data-state={active} style={{ ["--progress" as string]: active / 2 }}>
        {children}
      </div>
    </>
  );
}
