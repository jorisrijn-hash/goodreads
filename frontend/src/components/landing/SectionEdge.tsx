/**
 * The shaped top edge of a chapter, and the red stitch that runs along it.
 *
 * Two SVGs: the fill, in the chapter's own colour, rises into the chapter above; the
 * stitch is drawn on its own layer above anything that crosses the boundary, so the
 * line always reads as "the next chapter starts here". Both stretch to the page width;
 * the stitch keeps its dot spacing because its stroke does not scale.
 */
const SHAPES = {
  // gentle waves, each a little different so the page does not repeat itself
  wave: { fill: "M0,52 C240,20 480,74 760,46 C1020,20 1240,64 1440,34 L1440,88 L0,88 Z", stitch: "M0,58 C240,26 480,80 760,52 C1020,26 1240,70 1440,40" },
  swell: { fill: "M0,30 C300,70 620,72 900,44 C1120,22 1300,30 1440,52 L1440,88 L0,88 Z", stitch: "M0,36 C300,76 620,78 900,50 C1120,28 1300,36 1440,58" },
  tilt: { fill: "M0,64 C420,54 860,30 1440,18 L1440,88 L0,88 Z", stitch: "M0,70 C420,60 860,36 1440,24" },
} as const;

export function SectionEdge({ shape, fill }: { shape: keyof typeof SHAPES; fill: string }) {
  const s = SHAPES[shape];
  return (
    <>
      <svg className="edge" viewBox="0 0 1440 88" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={s.fill} fill={fill} />
      </svg>
      <svg className="edge edge--stitch" viewBox="0 0 1440 88" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={s.stitch} className="stitch" />
      </svg>
    </>
  );
}
