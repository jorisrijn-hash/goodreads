# 0002: Landing frozen; low-resolution Dune cover in the Read anywhere screenshot

**Status:** open. Revisit when /book/[slug] is redesigned.
**Found:** 2026-09-22, milestone 4.2 HQ audit.

## Landing freeze

The landing page (`/`) was approved at commit `19f4503` and is frozen. No further polish
or redesign, unless a later route redesign exposes a problem in a shared system
(tokens, surfaces, header, footer, shared components). Any change of that kind is made
in the shared system and verified against the landing, not tuned on the landing itself.

## Known limitation

The phone in "05 Read anywhere" shows `public/product/mobile-book-{600,900,1170}`: a
real screenshot of the book page, captured by `scripts/prepare-product-shots.mjs`. The
screenshot itself is sharp (x2.11 at 2x density), but the page it captured still renders
the catalogue's low-resolution Dune cover, so the cover inside the screenshot is soft.

## Fix

When /book/[slug] is redesigned (and serves a sharp cover), re-run
`scripts/prepare-product-shots.mjs` to regenerate the mobile product screenshot. Do not
retouch the screenshot or swap in an HQ cover by hand: it is labelled real product UI.
