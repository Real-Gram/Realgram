# RealGram — Product Vision

## The promise

**"Open RealGram. Your Telegram works."**

RealGram is an independent, Telegram-compatible client. Log in with an
existing Telegram account and every chat, contact, group, channel, and piece
of media is there — inside RealGram. When direct Telegram access is blocked
or unstable, RealGram falls back to Realgram's connectivity layer so it keeps
working. The feeling we're building toward: *"Telegram is inside RealGram,
but RealGram connects more reliably and gives me more."*

## Design ratio

**90% familiar messaging behaviour, 10% distinctive RealGram experience.**
Anyone who already uses Telegram should understand RealGram immediately. The
10% is: resilient connectivity that "just works," a gold-accented reward
layer tied to REAL and Shahnameh, and a referral loop — never a redesign of
how messaging itself behaves.

## Four parts, one identity

RealGram exists to stop asking people to juggle four separate things.
Everything below resolves to the same **REAL-ID** — one identity, one
profile, one balance, no parallel accounts to keep in sync:

| Part | What it is | Role inside RealGram |
|---|---|---|
| **Shahnameh** | A Telegram-native game rooted in Persian epic storytelling | The Play/Earn engine — progression, clan, quiz-based skill checks |
| **REAL** | The token and reward ledger | The unit of value the whole loop earns and spends |
| **Realgram (Freedom)** | Xray-core connectivity, built for users under network filtering | The transport layer that keeps RealGram reachable when Telegram itself isn't |
| **TrustAI** | Verified referral and ambassador infrastructure | The attribution and trust layer behind RealGram's invite/referral loop — reused, not rebuilt |

## Non-goals (explicit)

- RealGram is **not** a Telegram clone marketed as, or implying it is, an
  official Telegram product. No Telegram branding, no "official" language.
- RealGram is **not** a full-device VPN by default — it reuses Realgram's
  existing connectivity as a local transport for RealGram's own traffic,
  not a second always-on VPN stack.
- RealGram does **not** run its own ad network — it reuses AdsGram, already
  integrated and paying out inside Shahnameh.
- RealGram does **not** rebuild Shahnameh or TrustAI — both are reused as
  they already exist, wired into one identity rather than duplicated.
- RealGram must **never** silently alter, store, or forward anything into
  Telegram's own message history or protocol that Telegram itself didn't
  send. Reward UI and RealGram-specific reactions are local-only or
  RealGram-backend-only — never injected into Telegram data.

## The loop this is building toward

```
Telegram utility (why someone opens the app)
    → RealGram daily use (resilient connection is the retention hook)
    → Shahnameh Play/Earn (existing game, reused, not rebuilt)
    → REAL / rewards (existing token + reward ledger)
    → Realgram connectivity value (REAL or ads redeem for data/priority)
    → user returns to RealGram
```

RealGram is the client surface that makes this loop visible and habitual,
instead of a background account link nobody notices.
