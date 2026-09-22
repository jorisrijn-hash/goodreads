/**
 * Where to cut a photograph for a given shape, from its native size and a focal point.
 *
 * Crops are described by intent (a ratio, and the point that must stay in frame) rather
 * than by pixel coordinates, so replacing a source photograph with another one only needs
 * its new size and focal point: every crop of it follows.
 *
 * Shared by the preparation script (Node strips the types) and the unit tests.
 */
export type Focal = { x: number; y: number };

export function cropRect(
  native: { width: number; height: number },
  ratio: number,
  focal: Focal,
  /** 1 = the largest crop of this ratio; 0.7 = 70% of that, tighter on the focal point. */
  scale = 1,
): { left: number; top: number; width: number; height: number } {
  const { width: W, height: H } = native;
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), max));
  // The largest window of this shape, then scaled down around the focal point.
  const full = W / H > ratio ? { width: H * ratio, height: H } : { width: W, height: W / ratio };
  const width = Math.round(full.width * Math.min(1, scale));
  const height = Math.round(full.height * Math.min(1, scale));
  return {
    left: clamp(focal.x * W - width / 2, W - width),
    top: clamp(focal.y * H - height / 2, H - height),
    width,
    height,
  };
}
