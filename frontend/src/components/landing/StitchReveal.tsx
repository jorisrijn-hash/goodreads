"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Marks its SVG child shown the first time it comes into view, so the stitch draws
 * across once (CSS does the drawing). Without JavaScript the stitch is simply there.
 */
export function StitchReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    // Watch the edge's fill, beside it: the stitch itself starts fully clipped, and an
    // element with no visible area never counts as intersecting.
    const target = ref.current?.previousElementSibling;
    if (!svg || !target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { svg.setAttribute("data-shown", ""); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} className="contents">{children}</span>;
}
