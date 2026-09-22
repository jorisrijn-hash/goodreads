import type { CSSProperties } from "react";
import { Photograph } from "../Photograph";

/**
 * The cut-out leaf, placed and moved by a light draught (see .breeze). Decorative:
 * hidden from assistive technology and never interactive. `shadow` renders it as the
 * soft, drifting shadow it would cast instead.
 */
export function Leaf({
  className = "",
  style,
  width,
  rotate = 0,
  flip = false,
  shadow = false,
  breeze,
  priority = false,
}: {
  className?: string;
  style?: CSSProperties;
  width: string;
  rotate?: number;
  flip?: boolean;
  shadow?: boolean;
  /** Breeze parameters: translate x/y (px), rotation (deg), duration (s), delay (s). */
  breeze?: { x: number; y: number; r: number; d: number; delay?: number };
  /** For a leaf visible on arrival: fetched early, so it is not the last thing to paint. */
  priority?: boolean;
}) {
  const motion = breeze
    ? { ["--bx" as string]: `${breeze.x}px`, ["--by" as string]: `${breeze.y}px`, ["--br" as string]: `${breeze.r}deg`, ["--bd" as string]: `${breeze.d}s`, ["--bdelay" as string]: `${breeze.delay ?? 0}s` }
    : {};
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute ${shadow ? "leaf-shadow" : ""} ${className}`} style={{ width, ...style, ...(shadow ? {} : {}) }}>
      <div className={breeze && !shadow ? "breeze" : ""} style={motion}>
        <div style={{ transform: `rotate(${rotate}deg) scaleX(${flip ? -1 : 1})` }}>
          {/* A blurred shadow needs little resolution: the small file is plenty. */}
          <Photograph id="leaf-pair" decorative priority={priority} sizes={shadow ? "12rem" : `calc(${width} * 1.7)`} className="block" imgClassName="block h-auto w-full" />
        </div>
      </div>
    </div>
  );
}
