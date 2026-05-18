import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash, createHmac } from "crypto";

export const Route = createFileRoute("/api/verify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const tx = (url.searchParams.get("tx") || "").trim();
        if (!tx || tx.length < 6 || tx.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(tx)) {
          return new Response("Invalid hash", { status: 400 });
        }

        const { data: bet } = await supabaseAdmin
          .from("bets")
          .select("id, game, wager_drops, payout_drops, outcome, client_seed, nonce, seed_id, created_at")
          .eq("id", tx)
          .maybeSingle();

        if (!bet) return new Response("Not found", { status: 404 });

        let server_seed = "";
        let server_seed_hash = "";
        if (bet.seed_id) {
          const { data: seed } = await supabaseAdmin
            .from("server_seeds")
            .select("seed, seed_hash, revealed_at")
            .eq("id", bet.seed_id)
            .maybeSingle();
          server_seed_hash = seed?.seed_hash ?? "";
          // Only reveal raw seed once rotated (revealed_at set)
          server_seed = seed?.revealed_at ? (seed.seed ?? "") : "(not yet revealed — rotate seed to reveal)";
        }

        const outcome = (bet.outcome as { picked?: string; result_side?: string; win?: boolean } | null) ?? {};
        let combined_hash = "";
        let roll = 0;
        if (server_seed && server_seed.startsWith("(") === false) {
          combined_hash = createHmac("sha256", server_seed)
            .update(`${bet.client_seed}:${bet.nonce}`)
            .digest("hex");
          roll = parseInt(combined_hash.slice(0, 13), 16) / 0x10000000000000;
        } else {
          // Still expose the commitment hash even if not revealed
          combined_hash = "(pending reveal)";
        }

        return Response.json({
          tx_hash: bet.id,
          game: bet.game,
          server_seed,
          server_seed_hash,
          client_seed: bet.client_seed,
          nonce: bet.nonce,
          combined_hash,
          roll,
          picked: outcome.picked ?? "",
          result_side: outcome.result_side ?? "",
          win: !!outcome.win,
          wager_drops: Number(bet.wager_drops),
          payout_drops: Number(bet.payout_drops),
          created_at: bet.created_at,
        });
      },
    },
  },
});