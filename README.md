# FlipXRPL — Provably Fair Coin Flip Gaming on the XRP Ledger

Flip a coin. Double your XRP. 50/50 odds, 1% house edge, under 4s on-chain settlement, 100% auditable.

[flipxrpl.xyz](https://flipxrpl.xyz) — [@FlipXRPL](https://twitter.com/FlipXRPL) on X.

## Features

- **Provably Fair** — server-seed and client-seed HMAC randomness
- **Lightning Fast** — under 4 second settlement
- **Ultra-Low Fees** — 0.00001 XRP per transaction
- **Non-Custodial** — Xaman (XUMM) integration, no seed phrases on platform
- **1% House Edge** — lowest in crypto gaming
- **Full Auditability** — every bet on-chain
- **Demo Mode** — no wallet needed
- **Referral System** — 0.1% commission from house edge

## Tech Stack

React 19 · TanStack Start · Vite · TanStack Router · Tailwind CSS · shadcn/ui · Radix · Framer Motion · Supabase PostgreSQL with RLS · xrpl 4.6.0 · XUMM SDK · Zod · Cloudflare Pages via `wrangler.jsonc`.

## Quick Start

```bash
git clone https://github.com/LilToby123/flipxrpl.git
cd flipxrpl
bun install
cp .env.example .env.local
bun run dev
```

## Environment Variables

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `XUMM_API_KEY`
- `XUMM_API_SECRET`
- `ADMIN_PASSWORD`

## Roadmap

- **Phase 1 (complete)** — demo mode, provably fair, live feed, leaderboard, verify page
- **Phase 2 (in progress)** — Xaman login, real XRP deposits and withdrawals, admin dashboard
- **Phase 3 (planned)** — referral system, additional games, mobile PWA
