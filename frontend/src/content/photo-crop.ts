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
): { left: number; top: number; width: number; height: number } {
  const { width: W, height: H } = native;
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), max));
  if (W / H > ratio) {
    // Wider than wanted: keep the full height, slide a window across to the focal point.
    const width = Math.round(H * ratio);
    return { left: clamp(focal.x * W - width / 2, W - width), top: 0, width, height: H };
  }
  const height = Math.round(W / ratio);
  return { left: 0, top: clamp(focal.y * H - height / 2, H - height), width: W, height };
}
