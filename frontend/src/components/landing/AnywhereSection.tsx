import Link from "next/link";
import type { LandingCover } from "@/content/landing-covers";
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
export function AnywhereSection({ book }: { book: { book: BookDetail; ratio: number; hq?: LandingCover } | null }) {
  return (
    <section id="anywhere" data-surface="ivory" aria-labelledby="anywhere-heading" className="chapter [--edge-h:88px] lg:min-h-[92svh]">
      <SectionEdge shape="wave" />
      <div aria-hidden="true" className="daylight" style={{ ["--lx" as string]: "12px", ["--ly" as string]: "-6px", ["--ld" as string]: "30s" }} />
      <Leaf shadow width="34rem" rotate={-30} className="left-[34%] top-[22%] hidden lg:block" style={{ ["--sx" as string]: "16px", ["--sy" as string]: "-10px", ["--sd" as string]: "27s", ["--so" as string]: "0.13" }} />

      <div className="page-frame relative grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-12)] pb-[var(--space-16)] pt-[var(--space-16)] lg:min-h-[96svh] lg:grid-cols-12 lg:items-center lg:gap-x-[var(--space-8)] lg:pb-[7.5rem] lg:pt-[4rem]">
        <Reveal className="lg:col-span-5 lg:pt-[6rem]">
          <SectionLabel number="05" label="Read anywhere" />
          <h2 id="anywhere-heading" className="mt-[var(--space-6)] font-serif text-[clamp(3rem,5.4vw,5.25rem)] font-[380] leading-[1] tracking-[-0.03em]">
            Read anywhere.
          </h2>
          <p className="mt-[var(--space-6)] max-w-[34ch] text-[1.0625rem] leading-[1.65] text-[var(--fg-muted)]">
            Works in your browser. Your library, on your phone, with nothing to install.
          </p>
          <div className="mt-[var(--space-10)] flex flex-wrap items-start gap-[var(--space-3)]">
            <Link href="/signup" className="action action--primary">
              Create an account <span aria-hidden="true" className="action__arrow">→</span>
            </Link>
            <DemoButton label="Explore the demo account" size="large" />
          </div>

          <div className="mt-[var(--space-16)] flex items-center gap-[var(--space-5)] border-t border-[var(--rule)] pt-[var(--space-6)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG */}
            <img src="/product/qr-site.svg" alt="QR code that opens goodreads-rose.vercel.app" width={96} height={96} className="h-[96px] w-[96px] bg-[var(--ivory)] p-[6px] shadow-[0_0_0_1px_var(--rule)]" />
            <p className="m-0">
              <span className="type-label block text-[var(--fg)]">Scan to open on your phone</span>
              <span className="mt-[var(--space-1)] block text-[0.875rem] text-[var(--fg-muted)]">goodreads-rose.vercel.app</span>
            </p>
          </div>
        </Reveal>

        <div className="relative lg:col-span-6 lg:col-start-7">
          <PointerDepth className="relative mx-auto h-[36rem] w-full max-w-[40rem] lg:-mt-[17rem] lg:h-[57rem]">
            {book && (
              <div aria-hidden="true" className="absolute bottom-[12%] right-[0%] rotate-[9deg] [translate:calc(var(--px)*-3px)_calc(var(--py)*-2px)]">
                <CoverPrint slug={book.book.slug} title={book.book.title} authors={book.book.authors} coverKey={book.book.coverKey} width="clamp(9.5rem, 16vw, 15.5rem)" ratio={book.ratio} sizes="15.5rem" link={false} hq={book.hq} />
              </div>
            )}
            <p aria-hidden="true" className="hand absolute left-[-2%] top-[38%] rotate-[-6deg] text-[1.625rem] text-[var(--ink-70)]">Mobile web <span className="inline-block rotate-[-15deg]">→</span></p>
            {/* The phone crosses up into the chapter above. */}
            <div className="crossing left-1/2 top-0 [translate:calc(-50%+var(--px)*6px)_calc(var(--py)*4px)]">
              <div className="phone rotate-[5deg]" style={{ ["--phone-w" as string]: "min(24rem, 70vw)" }}>
                <div className="phone__screen">
                  <span className="phone__island" />
                  <div className="demo__status-bar absolute inset-x-0 top-0 z-[4] flex h-[34px] items-center justify-between px-[22px] pt-[4px] text-[10px] font-semibold"><span>9:41</span><span>●●●</span></div>
                  <picture className="absolute inset-x-0 bottom-0 top-[34px] block">
                    <source type="image/avif" srcSet="/product/mobile-book-600.avif 600w, /product/mobile-book-900.avif 900w, /product/mobile-book-1170.avif 1170w" sizes="24rem" />
                    <img className="shot" src="/product/mobile-book-600.webp" srcSet="/product/mobile-book-600.webp 600w, /product/mobile-book-900.webp 900w, /product/mobile-book-1170.webp 1170w" sizes="24rem" alt="The Dune page of this site on a phone: the cover, title, author and a Want to Read button" loading="lazy" width={390} height={844} />
                  </picture>
                </div>
              </div>
            </div>
            <Leaf width="12rem" rotate={115} className="bottom-[16%] right-[-8%]" breeze={{ x: 5, y: 3, r: 1.15, d: 23, delay: 2 }} />
          </PointerDepth>
        </div>
      </div>
    </section>
  );
}
