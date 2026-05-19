import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Polls the XRPL house wallet for incoming Payments and credits user balances
 * based on the DestinationTag. Idempotent on tx_hash.
 *
 * Auth: Supabase anon key in `apikey` header (the standard pg_cron + pg_net pattern).
 */
export const Route = createFileRoute("/api/public/cron/poll-deposits")({
  server: {
    handlers: {
      POST: handler,
      GET: handler,
    },
  },
});

async function handler({ request }: { request: Request }) {
  const apikey =
    request.headers.get("apikey") ?? request.headers.get("x-api-key") ?? "";
  const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!expected || apikey !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const houseAddress = process.env.HOUSE_WALLET_ADDRESS;
  const network =
    process.env.XRPL_NETWORK ?? "wss://xrplcluster.com";
  if (!houseAddress) return new Response("House wallet not configured", { status: 500 });

  let credited = 0;
  let scanned = 0;
  try {
    const { Client } = await import("xrpl");
    const client = new Client(network);
    await client.connect();
    try {
      const resp = await client.request({
        command: "account_tx",
        account: houseAddress,
        limit: 200,
        ledger_index_min: -1,
        ledger_index_max: -1,
      });
      const txs = (resp.result.transactions ?? []) as Array<{
        tx?: Record<string, unknown>;
        tx_json?: Record<string, unknown>;
        meta?: { TransactionResult?: string; delivered_amount?: string };
        validated?: boolean;
      }>;

      for (const entry of txs) {
        const tx = (entry.tx_json ?? entry.tx) as Record<string, unknown> | undefined;
        if (!tx || !entry.validated) continue;
        if (tx.TransactionType !== "Payment") continue;
        if (tx.Destination !== houseAddress) continue;
        const meta = entry.meta;
        if (meta?.TransactionResult !== "tesSUCCESS") continue;

        const tag = tx.DestinationTag as number | undefined;
        if (typeof tag !== "number") continue;
        const hash = (tx.hash ?? (entry as { hash?: string }).hash) as string | undefined;
        if (!hash) continue;
        const delivered = meta.delivered_amount;
        if (typeof delivered !== "string") continue;
        const drops = Number(delivered);
        if (!Number.isFinite(drops) || drops <= 0) continue;
        const ledgerIndex = Number(tx.ledger_index ?? (entry as { ledger_index?: number }).ledger_index ?? 0);

        scanned += 1;

        // Idempotency check
        const { data: existing } = await supabaseAdmin
          .from("deposits")
          .select("id")
          .eq("tx_hash", hash)
          .maybeSingle();
        if (existing) continue;

        // Find user by destination tag
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("destination_tag", tag)
          .maybeSingle();
        if (!profile) continue;

        // Record deposit
        const { error: insErr } = await supabaseAdmin.from("deposits").insert({
          user_id: profile.id,
          tx_hash: hash,
          drops,
          ledger_index: ledgerIndex,
          network: network.includes("altnet") ? "testnet" : "mainnet",
        });
        if (insErr) continue;

        // Credit balance
        const { data: bal } = await supabaseAdmin
          .from("balances")
          .select("drops")
          .eq("user_id", profile.id)
          .single();
        const current = bal ? Number(bal.drops) : 0;
        await supabaseAdmin
          .from("balances")
          .update({ drops: current + drops, updated_at: new Date().toISOString() })
          .eq("user_id", profile.id);

        credited += 1;
      }
    } finally {
      await client.disconnect();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "XRPL error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return Response.json({ ok: true, scanned, credited });
}