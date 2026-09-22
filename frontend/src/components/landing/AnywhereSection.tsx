import Link from "next/link";
import type { BookDetail } from "@/lib/api";
import { CoverPrint } from "../CoverPrint";
import { DemoButton } from "../DemoButton";
import { Reveal } from "../motion/Reveal";
import { SectionLabel } from "../SectionHeader";
import { Leaf } from "./Leaf";
import { PointerDepth } from "./PointerDepth";
import { SectionEdge } from "./SectionEdge";

/**
 * 05 Read anywhere: the same product in a phone's browser.
 *
 * There is no native app, so nothing here looks like an app-store download. The phone
 * shows a real screenshot of the site on a phone (scripts/prepare-product-shots.mjs),
 * and the code beside it simply opens the site. The phone rises out of the burgundy
 * chapter above, across the stitched edge.
 */
export function AnywhereSection({ book }: { book: { book: BookDetail; ratio: number } | null }) {
  return (
    <section id="anywhere" data-surface="ivory" aria-labelledby="anywhere-heading" className="chapter [--edge-h:88px] lg:min-h-[92svh]">
      <SectionEdge shape="wave" fill="var(--ivory)" />
      <Leaf shadow width="22rem" rotate={-30} className="left-[44%] top-[34%] hidden lg:block" style={{ ["--sx" as string]: "10px", ["--sy" as string]: "-8px", ["--sd" as string]: "30s" }} />

      <div className="page-frame relative grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-12)] pb-[var(--space-16)] pt-[var(--space-16)] lg:min-h-[92svh] lg:grid-cols-12 lg:items-center lg:gap-x-[var(--space-8)] lg:pt-[4rem]">
        <Reveal className="lg:col-span-5">
          <SectionLabel number="05" label="Read anywhere" />
          <h2 id="anywhere-heading" className="mt-[var(--space-6)] font-serif text-[clamp(2.75rem,4.8vw,4.5rem)] font-[380] leading-[1] tracking-[-0.03em]">
            Read anywhere.
          </h2>
          <p className="mt-[var(--space-5)] max-w-[36ch] text-[1rem] leading-[1.65] text-[var(--fg-muted)]">
            Works in your browser. Your library, on your phone, with nothing to install.
          </p>
          <div className="mt-[var(--space-8)] flex flex-wrap items-start gap-[var(--space-3)]">
            <Link href="/signup" className="action action--primary">
              Create an account <span aria-hidden="true" className="action__arrow">→</span>
            </Link>
            <DemoButton label="Explore the demo account" size="large" />
          </div>

          <div className="mt-[var(--space-10)] flex items-center gap-[var(--space-5)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG */}
            <img src="/product/qr-site.svg" alt="QR code that opens goodreads-rose.vercel.app" width={96} height={96} className="h-[96px] w-[96px] bg-[var(--ivory)] p-[6px] shadow-[0_0_0_1px_var(--rule)]" />
            <p className="m-0">
              <span className="type-label block text-[var(--fg)]">Scan to open on your phone</span>
              <span className="mt-[var(--space-1)] block text-[0.8125rem] text-[var(--fg-subtle)]">goodreads-rose.vercel.app</span>
            </p>
          </div>
        </Reveal>

        <div className="relative lg:col-span-6 lg:col-start-7">
          <PointerDepth className="relative mx-auto h-[34rem] w-full max-w-[34rem] lg:-mt-[22rem] lg:h-[50rem]">
            {book && (
              <div aria-hidden="true" className="absolute bottom-[10%] right-[2%] rotate-[9deg] [translate:calc(var(--px)*-3px)_calc(var(--py)*-2px)]">
                <CoverPrint slug={book.book.slug} title={book.book.title} authors={book.book.authors} coverKey={book.book.coverKey} width="clamp(8rem, 13vw, 12rem)" ratio={book.ratio} sizes="12rem" link={false} />
              </div>
            )}
            <p aria-hidden="true" className="hand absolute left-[2%] top-[34%] rotate-[-6deg] text-[1.625rem] text-[var(--ink-70)]">Mobile web <span className="inline-block rotate-[-15deg]">→</span></p>
            {/* The phone crosses up into the chapter above. */}
            <div className="crossing left-1/2 top-0 [translate:calc(-50%+var(--px)*6px)_calc(var(--py)*4px)]">
              <div className="phone rotate-[5deg]" style={{ ["--phone-w" as string]: "min(18.5rem, 64vw)" }}>
                <div className="phone__screen">
                  <span className="phone__island" />
                  <div className="demo__status-bar absolute inset-x-0 top-0 z-[4] flex h-[34px] items-center justify-between px-[22px] pt-[4px] text-[10px] font-semibold"><span>9:41</span><span>●●●</span></div>
                  <picture className="absolute inset-x-0 bottom-0 top-[34px] block">
                    <source type="image/avif" srcSet="/product/mobile-book-390.avif 390w, /product/mobile-book-700.avif 700w" sizes="18.5rem" />
                    <img className="shot" src="/product/mobile-book-390.webp" srcSet="/product/mobile-book-390.webp 390w, /product/mobile-book-700.webp 700w" sizes="18.5rem" alt="The Dune page of this site on a phone: the cover, title, author and a Want to Read button" loading="lazy" width={390} height={844} />
                  </picture>
                </div>
              </div>
            </div>
            <Leaf width="10rem" rotate={115} className="bottom-[14%] right-[-6%]" breeze={{ x: 2, y: 2, r: 0.8, d: 20, delay: 2 }} />
          </PointerDepth>
        </div>
      </div>
    </section>
  );
}
