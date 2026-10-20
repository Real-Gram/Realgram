# Brand assets — inventory

What's in `../brand/` today, and what's genuinely missing.

## Exists

| File | What it is |
|---|---|
| `realgram.svg` | RealGram mark |
| `wordmark-realgram.svg` | RealGram wordmark |
| `lockup-realgram.svg` | RealGram mark + wordmark, combined |
| `shahnameh.svg` | Shahnameh mark |
| `wordmark-shahnameh.svg` | Shahnameh wordmark |
| `lockup-shahnameh.svg` | Shahnameh mark + wordmark, combined |
| `realtoken.png` | REAL token art |
| `covers/` | Blog post cover images (11 files) — content assets, not identity assets; listed here only so they're not mistaken for brand marks when this folder is browsed |

No mark or wordmark exists yet for **Realgram/Freedom** or **TrustAI** — the
other two of the four parts RealGram unifies (see
[brand-principles.md](brand-principles.md)). Right now only two of the four
have any visual identity at all.

## Missing — genuine gaps, not nice-to-haves

- **App icon set.** No documented iOS/Android icon variants (light/dark,
  adaptive icon layers, various sizes) anywhere in this repo.
- **Social preview image.** GitHub's own repo social-card image isn't set
  — sharing a link to this repo today falls back to GitHub's generic
  default, which undersells everything else in it.
- **Favicon is a single mark**, no maskable/adaptive variant, no explicit
  light/dark favicon pairing.
- **No motion or interaction language documented** — `app.js` has a
  scroll-reveal and a "cinematic dust canvas" effect already, but neither
  is written down anywhere as an intentional part of the identity; both
  read as ad hoc unless someone decides they're a real pattern.
- **No print/deck-ready lockup** — SVGs exist, but nothing sized or
  composed for a pitch deck, a README header, or a printed one-pager.

## Priority, if picking one thing to fix first

The social preview image — it's the single highest-leverage fix for how
this repo is perceived by someone who's never seen it before, and it
doesn't require resolving any of the open brand questions in
[brand-principles.md](brand-principles.md) first.
