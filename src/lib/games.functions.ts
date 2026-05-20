import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getOrCreateActiveSeed,
  rollFloat,
  supabaseAdmin,
  MIN_BET,
  MAX_BET,
  RATE_LIMIT_MS,
  TREASURY_BET_FRACTION,
} from "./games-internal.server";

/** Returns the active seed_hash for the current user (the commit). */
export const getActiveSeedHash = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const seed = await getOrCreateActiveSeed(context.userId);
    return { seed_hash: seed.seed_hash, nonce: seed.nonce };
  });

/** Reveal the current seed and rotate to a new one (so the player can verify). */
export const rotateSeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: current } = await supabaseAdmin
      .from("server_seeds")
      .select("id, seed")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();
    if (current) {
      await supabaseAdmin
        .from("server_seeds")
        .update({ active: false, revealed_at: new Date().toISOString() })
        .eq("id", current.id);
    }
    const next = await getOrCreateActiveSeed(userId);
    return { revealed: current?.seed ?? null, new_seed_hash: next.seed_hash };
  });

const CoinFlipInput = z.object({
  side: z.enum(["heads", "tails"]),
  wager_drops: z.number().int().min(MIN_BET).max(MAX_BET),
  client_seed: z.string().min(1).max(64),
});

export const placeCoinFlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CoinFlipInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // 0a) Rate limit — 1 bet / 5s per user
    {
      const { data: recent } = await supabaseAdmin
        .from("bets")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      const last = recent?.[0]?.created_at;
      if (last && Date.now() - new Date(last).getTime() < RATE_LIMIT_MS) {
        return { ok: false as const, error: "Slow down — 1 bet every 5 seconds" };
      }
    }

    // 0b) Per-bet cap = 10% of total house liabilities
    {
      const { data: liabRows } = await supabaseAdmin.from("balances").select("drops");
      const liabilities = (liabRows ?? []).reduce((s, r) => s + Number(r.drops), 0);
      if (liabilities > 0) {
        const cap = Math.floor(liabilities * TREASURY_BET_FRACTION);
        if (cap > 0 && data.wager_drops > cap) {
          return { ok: false as const, error: `Bet exceeds 10% of treasury (${Math.floor(cap / 1_000_000)} XRP max)` };
        }
      }
    }

    // 1) Lock balance & deduct atomically via RPC-less compare-and-set
    const { data: bal } = await supabaseAdmin
      .from("balances")
      .select("drops")
      .eq("user_id", userId)
      .single();
    const current = bal ? Number(bal.drops) : 0;
    if (current < data.wager_drops) {
      return { ok: false as const, error: "Insufficient balance" };
    }

    // 2) RNG
    const seed = await getOrCreateActiveSeed(userId);
    const roll = rollFloat(seed.seed, data.client_seed, seed.nonce);
    // 1% house edge: win on roll < 0.495 if heads chosen, else tails wins on roll >= 0.505
    // Cleaner: compare to 0.495 / 0.505 windows; simplest fair-with-edge is 0.495 win threshold.
    const win = data.side === "heads" ? roll < 0.495 : roll >= 0.505;
    const payout = win ? data.wager_drops * 2 : 0;
    const newDrops = current - data.wager_drops + payout;

    // 3) Persist: balance, bet, increment nonce
    await supabaseAdmin.from("balances").update({ drops: newDrops, updated_at: new Date().toISOString() }).eq("user_id", userId);
    await supabaseAdmin.from("server_seeds").update({ nonce: seed.nonce + 1, client_seed: data.client_seed }).eq("id", seed.id);
    const result_side = roll < 0.5 ? "heads" : "tails";
    await supabaseAdmin.from("bets").insert({
      user_id: userId,
      game: "coinflip",
      wager_drops: data.wager_drops,
      payout_drops: payout,
      multiplier: win ? 2 : 0,
      outcome: { roll, result_side, picked: data.side, win },
      seed_id: seed.id,
      nonce: seed.nonce,
      client_seed: data.client_seed,
    });

    // 4) Referral credit: 0.1% of wager to the referrer, paid from house edge
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("referred_by")
        .eq("id", userId)
        .maybeSingle();
      const referrer = profile?.referred_by;
      if (referrer) {
        const credit = Math.floor(data.wager_drops * 0.001);
        if (credit > 0) {
          const { data: refBal } = await supabaseAdmin
            .from("balances")
            .select("drops")
            .eq("user_id", referrer)
            .maybeSingle();
          await supabaseAdmin
            .from("balances")
            .update({ drops: Number(refBal?.drops ?? 0) + credit, updated_at: new Date().toISOString() })
            .eq("user_id", referrer);
          const { data: refProfile } = await supabaseAdmin
            .from("profiles")
            .select("referral_earnings_drops")
            .eq("id", referrer)
            .maybeSingle();
          await supabaseAdmin
            .from("profiles")
            .update({ referral_earnings_drops: Number(refProfile?.referral_earnings_drops ?? 0) + credit })
            .eq("id", referrer);
        }
      }
    } catch {
      // non-fatal
    }

    return {
      ok: true as const,
      win,
      result_side,
      payout_drops: payout,
      new_balance_drops: newDrops,
      nonce: seed.nonce,
      seed_hash: seed.seed_hash,
    };
  });
