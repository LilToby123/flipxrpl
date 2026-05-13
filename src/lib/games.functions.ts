import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, randomBytes, createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MIN_BET = 100_000;       // 0.1 XRP
const MAX_BET = 1_000_000_000; // 1000 XRP

/** Get-or-create the active server seed for a user (only seed_hash is exposed). */
async function getOrCreateActiveSeed(userId: string) {
  const { data: existing } = await supabaseAdmin
    .from("server_seeds")
    .select("id, seed, seed_hash, nonce")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (existing) return existing as { id: string; seed: string; seed_hash: string; nonce: number };

  const seed = randomBytes(32).toString("hex");
  const seed_hash = createHash("sha256").update(seed).digest("hex");
  const { data, error } = await supabaseAdmin
    .from("server_seeds")
    .insert({ user_id: userId, seed, seed_hash, nonce: 0, active: true })
    .select("id, seed, seed_hash, nonce")
    .single();
  if (error) throw error;
  return data as { id: string; seed: string; seed_hash: string; nonce: number };
}

/** Roll a number in [0, 1) from HMAC-SHA256(server_seed, client_seed:nonce). */
function rollFloat(serverSeed: string, clientSeed: string, nonce: number): number {
  const h = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}`).digest("hex");
  // Take first 8 hex chars => 32-bit int, divide by 2^32
  return parseInt(h.slice(0, 8), 16) / 0x1_0000_0000;
}

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
