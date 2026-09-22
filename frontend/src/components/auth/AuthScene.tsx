import { LANDING_COVERS } from "@/content/landing-covers";
import { Leaf } from "../landing/Leaf";
import { PointerDepth } from "../landing/PointerDepth";

/**
 * The same five real books in both scenes. Each has a position per scene (in CSS, keyed
 * on the shell's data-variant), so moving between the two forms rearranges them instead
 * of swapping pictures. `depth` scales the pointer response; `inward` is the direction
 * each moves when the page closes on success.
 */
const BOOKS = [
  { slug: "dune-ol893414w", title: "Dune", depth: 1, inward: 1 },
  { slug: "the-secret-history-ol4321141w", title: "The Secret History", depth: 0.7, inward: -1 },
  { slug: "never-let-me-go-ol59038w", title: "Never Let Me Go", depth: 0.45, inward: -1 },
  { slug: "tomorrow-and-tomorrow-and-tomorrow-ol26004554w", title: "Tomorrow, and Tomorrow, and Tomorrow", depth: 0.85, inward: 1 },
  { slug: "educated-ol18139176w", title: "Educated", depth: 0.55, inward: 1 },
] as const;

/**
 * Decorative: real catalogue covers (the landing's full-resolution files, served
 * statically, so the scene appears even while the API is still waking), a paper
 * surface, one slow leaf shadow and a few factual labels. Nothing here is clickable and
 * nothing claims to be anyone's data. Which arrangement shows is set by the shell's
 * data-variant.
 */
export function AuthScene() {
  return (
    <PointerDepth className="auth-scene">
      <div aria-hidden="true" className="auth-scene__frame">
        <span className="auth-scene__fragment" />
        <span className="auth-scene__block" />
        <span className="auth-scene__shelf" />
        {/* Fetched early where it shows (it is the largest image there), and not at all on
            phones, where it is hidden and would only compete with the text and font. */}
        <Leaf shadow width="30rem" rotate={-28} className="auth-scene__leaf" priority media="(min-width: 768px)" />

        {BOOKS.map((book, i) => {
          const cover = LANDING_COVERS.find((c) => c.slug === book.slug)!;
          return (
            <span
              key={book.slug}
              className={`auth-book auth-book--${i}`}
              style={{ ["--d" as string]: book.depth, ["--in" as string]: book.inward, ["--r" as string]: cover.ratio }}
            >
              <span className="auth-book__depth">
                <span className="auth-book__lift">
                  <picture>
                    <source type="image/avif" srcSet={cover.widths.map((w) => `/covers-hq/${book.slug}-${w}.avif ${w}w`).join(", ")} sizes="(min-width: 768px) 18vw, 22vw" />
                    <img
                      src={`/covers-hq/${book.slug}-320.webp`}
                      srcSet={cover.widths.map((w) => `/covers-hq/${book.slug}-${w}.webp ${w}w`).join(", ")}
                      sizes="(min-width: 768px) 18vw, 22vw"
                      width={320}
                      height={Math.round(320 / cover.ratio)}
                      alt=""
                      decoding="async"
                      fetchPriority={i === 0 ? "auto" : "low"}
                    />
                  </picture>
                </span>
              </span>
            </span>
          );
        })}

        <p className="auth-scene__label type-label">
          <span className="auth-scene__label-login">Return to your reading</span>
          <span className="auth-scene__label-signup">Start your library</span>
        </p>
        <p className="auth-scene__caption">
          <span className="auth-scene__caption-login">Your library <span>·</span> Saved books <span>·</span> Reading status</span>
          <span className="auth-scene__caption-signup">A new library starts empty.</span>
        </p>
      </div>
    </PointerDepth>
  );
}
