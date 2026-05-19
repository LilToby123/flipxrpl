
# FlipXRPL — Full Build Plan

Massive scope. I'll ship this in 3 phases so each phase is verifiable in preview before moving to the next. All work is additive to what's already built.

## Phase 1 — Foundation: Rebrand, XRPL deps, Xaman sign-in, deposit polling, real withdrawals

1. **Rebrand RippleFlip → FlipXRPL** everywhere (titles, headers, footer, meta tags, sitemap, auth page, wallet page, coinflip page).
2. **Install `xrpl` package** and verify mainnet WebSocket connection (`wss://xrplcluster.com`). Default `XRPL_NETWORK` to mainnet, keep testnet override.
3. **Xaman sign-in** (Option A):
   - `POST /api/xaman/signin` — creates Xumm payload (SignIn), returns QR + UUID.
   - `GET /api/xaman/status/:uuid` — polls until signed, returns XRPL address.
   - New `/login-xaman` flow on `/auth` page (tab: Email / Xaman). On success, mints a Supabase session via service-role `signInWithPassword` against an auto-provisioned `<address>@xaman.flipxrpl` account so RLS keeps working.
   - Existing email/password + forgot-password stays (Option B).
4. **Deposit poller**: `/api/public/cron/poll-deposits` server route (HMAC-protected via anon key). Pulls last 200 txs to house wallet via XRPL `account_tx`, matches `DestinationTag` → user, credits `balances.drops`, inserts into `deposits` (idempotent on `tx_hash`). Cron job via `pg_cron` + `pg_net` every 30s.
5. **Real withdrawals**: Wire existing `requestWithdraw` server fn to the live `xrpl` client (currently scaffolded). Atomic balance debit → submit Payment → record tx_hash; refund on failure. House seed read from `HOUSE_WALLET_SEED` env only.
6. **Bet limits (server-side)**: enforce MIN=1 XRP, MAX=100 XRP, MAX_PCT=10% of treasury. Demo MAX=10 XRP, reset = exactly 100 XRP. DEMO watermark badge always visible in demo mode.
7. **Rate limit**: 1 bet / 5s per user via lightweight `last_bet_at` column check.
8. **Quick-bet buttons**: 1 / 5 / 25 / 50 / 100, ½, 2× (already in place — verify clamps to limits).
9. **Mobile**: re-audit coinflip + landing at 390/430px. Bigger flip CTA, readable type.

## Phase 2 — Provable fairness page, Live Flips realtime, Leaderboard, SEO, favicon

1. **`/verify` page** — public page (UI already exists, polish): paste tx hash → calls `/api/verify` → renders server seed, client seed, nonce, HMAC computation, and roll math step-by-step.
2. **Live Flips realtime** on home + game page — confirm Supabase Realtime channel subscribes, shows shortened address, choice, wager, win/loss, with proper empty state.
3. **`/leaderboard`** — 3 sections (biggest single win, most wagered, most profit). Materialized view refreshed daily by `pg_cron`. Show shortened addresses only.
4. **SEO**: per-route `head()` with title/description/OG/Twitter tags. Description = "Provably fair XRP coin flip — 50/50 odds, 1% house edge, settled on the XRP Ledger in seconds."
5. **Favicon**: generate a gold-coin SVG/PNG, wire in `__root.tsx`.
6. **Loading spinners, error boundaries, empty states** across all pages.

## Phase 3 — Admin dashboard + Referrals

1. **`/admin`** — gated by `ADMIN_PASSWORD` env (POST password → server-issued signed cookie). Shows:
   - Treasury XRP balance (live from XRPL).
   - Bet count, total won, total lost.
   - P&L line chart over time (Recharts) from `bets` aggregation.
   - "Withdraw profits to my wallet" button → sends to `ADMIN_PAYOUT_ADDRESS`.
   - Red alert if treasury < 500 XRP.
2. **Referrals**:
   - `profiles.referral_code` (unique), `profiles.referred_by` (uuid nullable).
   - `?ref=CODE` on `/auth` stored in localStorage → attached at signup.
   - On every settled bet, credit 0.1% of wager to referrer's balance (from house edge — house edge is 1%, so this comes out of margin).
   - Dashboard widget on `/wallet` shows referral link + total earnings.

## Technical details

- **Xaman secrets** (`XUMM_API_KEY`, `XUMM_API_SECRET`) ✅ stored
- **Admin secrets** (`ADMIN_PASSWORD`, `ADMIN_PAYOUT_ADDRESS`) ✅ stored
- House wallet secrets (`HOUSE_WALLET_ADDRESS`, `HOUSE_WALLET_SEED`) ✅ already stored
- Note: `xrpl` package uses native crypto — should work on Cloudflare Workers with `nodejs_compat` (already enabled). If runtime errors appear in workerd, I'll swap to direct WebSocket calls for read-paths and confirm signing path.
- All bet processing stays in `createServerFn` with `requireSupabaseAuth`. House key never client-side.
- Migrations: add `referral_code`, `referred_by`, `last_bet_at` to `profiles`; add `referral_earnings_drops` column on `balances`; create `house_treasury_snapshots` table for P&L history; create leaderboard materialized view.

## What I will NOT do
- I will not implement per-bet Xaman signing (kills UX — every bet would need QR scan). Instead, Xaman sign-in establishes session, then bets are server-authorized against the signed-in wallet. This is the standard on every XRPL gaming site. If you specifically want per-bet Xaman signing, say so and I'll wire it instead.
- I will not switch to mainnet by default until you confirm the house wallet on mainnet is funded. The plan defaults to mainnet per your request, but I strongly recommend keeping `XRPL_NETWORK=wss://s.altnet.rippletest.net:51233` for the first end-to-end test, then flipping.

Approve and I'll start Phase 1.
