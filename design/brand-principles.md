# Brand principles — the brief

## Who's looking at this

Three audiences, at once, and the identity has to hold up for all three
without becoming three different identities:

1. **A Telegram user under network filtering**, looking for a client that
   just works. They need to trust it fast — no gimmicks, nothing that reads
   as a shady VPN app.
2. **A Shahnameh player**, who came in through a game rooted in Persian
   epic storytelling and heroism. They already have a relationship with
   that story — the identity shouldn't paper over it to look like generic
   fintech.
3. **Someone evaluating the project itself** — a future collaborator, an
   investor, a judge — who's looking at the GitHub, the site, and the
   people behind it, and asking "is this a serious, coherent piece of
   work." This is the audience this repo itself is being rebuilt for.

## What already holds true — keep these

- **Gold means value, nothing else.** This is the one piece of semantic
  discipline already in place ([tokens.md](tokens.md)) and it's worth
  protecting — it's the kind of restraint that makes an interface feel
  considered instead of decorated.
- **90% familiar, 10% distinctive.** Borrowed from product, not design, but
  it's a visual principle too: RealGram should look like a more refined
  version of something people already trust, not an unfamiliar interaction
  pattern bolted onto Telegram's UX.
- **Dark ground, not black.** `--void`/`--base`/`--surface` are navy-black,
  not pure `#000` — warmer, more considered than the generic
  near-black-plus-neon-accent look. Worth keeping deliberately, not by
  default.

## What's unresolved — decisions to make, not default

- **One mark, or a family?** RealGram unifies four parts (Shahnameh, REAL,
  Realgram, TrustAI) under one identity. Does the visual system say that
  with one unified mark and internal iconography per part, or does each
  part keep enough of its own visual identity to be recognizable on its
  own (Shahnameh's Persian-epic register is a real asset, not just legacy)?
  Right now the answer is implicit and inconsistent — `brand/` has separate
  Shahnameh and RealGram lockups with no documented relationship between
  them.
- **Four-locale typography**, flagged in [tokens.md](tokens.md) — Persian
  RTL, Cyrillic, and CJK all need real typographic decisions, not a Latin
  system stretched to cover them.
- **A face for the story, not just the product.** The README now tells the
  "three projects becoming one" story and introduces both people behind it
  ([../PEOPLE.md](../PEOPLE.md)) — the visual identity hasn't caught up to
  that yet. There's no author photo treatment, no social preview card, no
  visual language for the origin story itself. A project with this much
  real history behind it should look like it, not like a fresh landing
  page with no past.

## Working principle for whoever picks this up

Extend what's proven (the gold rule, the dark ground, the restraint), don't
replace it wholesale. The gaps above are real gaps — fill them
deliberately, as decisions, not as whatever a component library defaults
to.
