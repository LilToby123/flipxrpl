import { createHmac, randomBytes, createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const MIN_BET = 1_000_000;     // 1 XRP
export const MAX_BET = 100_000_000;   // 100 XRP
export const RATE_LIMIT_MS = 5_000;   // 1 bet / 5s
export const TREASURY_BET_FRACTION = 0.10; // max 10% of house treasury per bet

export async function getOrCreateActiveSeed(userId: string) {
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

export function rollFloat(serverSeed: string, clientSeed: string, nonce: number): number {
  const h = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}`).digest("hex");
  return parseInt(h.slice(0, 8), 16) / 0x1_0000_0000;
}

export { supabaseAdmin };