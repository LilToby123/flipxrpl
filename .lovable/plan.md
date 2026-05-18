# FlipXRPL — Phased Implementation Plan

You've asked for 15 substantial features. Shipping them all in one pass would produce ~30+ new files, a new auth system, a real-money payment loop, and an admin panel — too much to land safely in a single turn without breaking what already works. Here's how I'll stage it. **Please confirm or edit before I start.**

## A few decisions I need from you first

1. **Xaman API credentials** — Xaman wallet sign-in (#3) and on-chain bet signing (#8) require `XUMM_API_KEY` and `XUMM_API_SECRET` from https://apps.xumm.dev. Without these, I can scaffold the UI but the buttons won't work. OK to request these secrets?
2. **Bet signing on-chain (#8)** — Signing *every* coin flip on-chain via Xaman means each bet pops the Xaman app, costs ~10 drops in XRPL fees, and takes 4–5 seconds to confirm. That kills UX for a fast game. Standard pattern is: sign-in once with Xaman (proves wallet ownership), then bets debit the internal balance. Withdrawals are on-chain. **Confirm**: per-bet Xaman signing, or one-time sign-in + balance-based betting?
3. **Admin "personal wallet" (#9)** — what XRPL r-address should profit withdrawals go to? And the admin password — pick one now or I'll generate one and store it as a secret.
4. **Edge Function vs server function (#5)** — you wrote "Supabase Edge Function." This stack uses TanStack server functions instead (same security model, house seed stays server-side). OK to use that?
5. **Mainnet vs testnet** — real XRP movement on mainnet is irreversible. I strongly recommend we wire everything on **testnet first**, verify deposits/withdrawals end-to-end, then flip to mainnet. Agreed?

## Phased rollout

### Phase 1 — Foundation (this turn, after you approve)
- Item 1: Rebrand RippleFlip → FlipXRPL everywhere
- Item 4: Forgot-password link + `/reset-password` route
- Item 7: Demo mode polish (10 XRP cap, exact 100 reset, watermark)
- Item 14: Quick-bet buttons (1/5/25/50/100, 2x, ½)
- Item 15: Mobile responsiveness pass (390/430px)
- Item 10: Public `/verify` page (already partially scaffolded)
- Item 11: Confirm Live Flips realtime works on homepage

### Phase 2 — Xaman + on-chain money (next turn)
- Item 2: Confirm XRPL deps + network connectivity
- Item 3: Xaman sign-in flow (`/api/xaman/signin` + polling) — assumes secrets added
- Item 5: Deposit poller (cron-style server fn) + withdrawal server fn
- Item 6: Server-side bet limits (1 XRP min, 100 XRP max, 10% of treasury cap)
- Item 8: RLS tightening + 1-bet-per-5s rate limit (per #2 decision above)

### Phase 3 — Growth features (turn after)
- Item 9: `/admin/<secret>` dashboard with treasury, P&L chart, profit withdraw
- Item 12: `/leaderboard` (top wins / wagered / profit)
- Item 13: Referral system (unique link, 0.1% of referee's bets, dashboard widget)

## Technical notes (skip if non-technical)

- Deposit polling on a Worker runtime needs a scheduled trigger — I'll use a `/api/public/cron/poll-deposits` route hit by pg_cron every 30s, with HMAC signature verification.
- Rate limiting: per the platform guidelines we don't have first-class rate limit primitives; I'll implement a lightweight `last_bet_at` check in the bets server fn (ad-hoc, acceptable for this use case).
- Referral payouts come from the house edge (1%), so 0.1% to referrer leaves 0.9% house — math works.
- Admin password will be bcrypt-hashed and stored as a secret; admin route uses a session cookie after password check.

---

**Reply with answers to the 5 questions above and I'll start Phase 1 immediately.** If you want a different ordering, say so.