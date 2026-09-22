"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Sets --px and --py (-1 to 1) on itself as the pointer moves over the page, so CSS can
 * give its children a few pixels of depth. A few lines instead of an animation runtime;
 * off for touch pointers and reduced motion, where the variables stay at zero.
 */
export function PointerDepth({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    function onMove(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = el!.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) return;
        el!.style.setProperty("--px", String(Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / (box.width / 2)))));
        el!.style.setProperty("--py", String(Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / (box.height / 2)))));
      });
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(frame); };
  }, []);

  return <div ref={ref} className={className} style={{ ["--px" as string]: 0, ["--py" as string]: 0 }}>{children}</div>;
}
