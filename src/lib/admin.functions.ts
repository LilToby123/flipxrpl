import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isLikelyXrplAddress } from "./xrpl";

function checkPassword(pw: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("Admin password not configured");
  if (pw !== expected) throw new Error("Invalid admin password");
}

export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    checkPassword(data.password);

    const [{ data: bets }, { data: balances }, { data: snapshots }, { data: withdrawals }] =
      await Promise.all([
        supabaseAdmin.from("bets").select("wager_drops, payout_drops, created_at").eq("game", "coinflip"),
        supabaseAdmin.from("balances").select("drops"),
        supabaseAdmin
          .from("house_treasury_snapshots")
          .select("drops, liabilities_drops, created_at")
          .order("created_at", { ascending: false })
          .limit(30),
        supabaseAdmin
          .from("withdrawals")
          .select("drops, status, created_at, to_address, tx_hash")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    const wagered = (bets ?? []).reduce((s, b) => s + Number(b.wager_drops), 0);
    const paid = (bets ?? []).reduce((s, b) => s + Number(b.payout_drops), 0);
    const houseProfitDrops = wagered - paid;
    const liabilitiesDrops = (balances ?? []).reduce((s, b) => s + Number(b.drops), 0);

    // Live house wallet on-chain balance
    let onChainDrops = 0;
    let onChainError: string | null = null;
    try {
      const network = process.env.XRPL_NETWORK ?? "wss://xrplcluster.com";
      const address = process.env.HOUSE_WALLET_ADDRESS;
      if (address) {
        const { Client } = await import("xrpl");
        const client = new Client(network);
        await client.connect();
        try {
          const info = await client.request({ command: "account_info", account: address, ledger_index: "validated" });
          onChainDrops = Number((info.result.account_data as { Balance?: string }).Balance ?? 0);
        } finally {
          await client.disconnect();
        }
      }
    } catch (e) {
      onChainError = e instanceof Error ? e.message : String(e);
    }

    // Last 7 days P&L
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = (bets ?? []).filter((b) => new Date(b.created_at).getTime() >= cutoff);
    const byDay: Record<string, number> = {};
    for (const b of recent) {
      const d = new Date(b.created_at).toISOString().slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + (Number(b.wager_drops) - Number(b.payout_drops));
    }

    return {
      ok: true as const,
      wageredDrops: wagered,
      paidDrops: paid,
      houseProfitDrops,
      liabilitiesDrops,
      onChainDrops,
      onChainError,
      payoutAddress: process.env.ADMIN_PAYOUT_ADDRESS ?? "",
      houseAddress: process.env.HOUSE_WALLET_ADDRESS ?? "",
      network: process.env.XRPL_NETWORK?.includes("altnet") ? "Testnet" : "Mainnet",
      betCount: bets?.length ?? 0,
      snapshots: snapshots ?? [],
      pnlByDay: byDay,
      recentWithdrawals: withdrawals ?? [],
    };
  });

export const adminWithdrawProfit = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string().min(1),
        drops: z.number().int().min(1_000_000),
        to_address: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const dest = data.to_address?.trim() || process.env.ADMIN_PAYOUT_ADDRESS;
    if (!dest || !isLikelyXrplAddress(dest)) {
      return { ok: false as const, error: "Invalid payout address" };
    }
    const seed = process.env.HOUSE_WALLET_SEED;
    const network = process.env.XRPL_NETWORK ?? "wss://xrplcluster.com";
    if (!seed) return { ok: false as const, error: "House wallet not configured" };

    try {
      const { Client, Wallet } = await import("xrpl");
      const client = new Client(network);
      await client.connect();
      try {
        const wallet = Wallet.fromSeed(seed);
        const tx = {
          TransactionType: "Payment" as const,
          Account: wallet.classicAddress,
          Destination: dest,
          Amount: String(data.drops),
        };
        const prepared = await client.autofill(tx as never);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);
        const meta = result.result.meta as { TransactionResult?: string } | undefined;
        const ok = meta?.TransactionResult === "tesSUCCESS";
        if (!ok) return { ok: false as const, error: `On-chain: ${meta?.TransactionResult}` };
        return { ok: true as const, tx_hash: result.result.hash };
      } finally {
        await client.disconnect();
      }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Unknown" };
    }
  });

export const adminSnapshot = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const network = process.env.XRPL_NETWORK ?? "wss://xrplcluster.com";
    const address = process.env.HOUSE_WALLET_ADDRESS;
    if (!address) return { ok: false as const, error: "House wallet address not set" };
    const { Client } = await import("xrpl");
    const client = new Client(network);
    await client.connect();
    try {
      const info = await client.request({ command: "account_info", account: address, ledger_index: "validated" });
      const drops = Number((info.result.account_data as { Balance?: string }).Balance ?? 0);
      const { data: balances } = await supabaseAdmin.from("balances").select("drops");
      const liab = (balances ?? []).reduce((s, b) => s + Number(b.drops), 0);
      await supabaseAdmin.from("house_treasury_snapshots").insert({ drops, liabilities_drops: liab });
      return { ok: true as const, drops, liabilities: liab };
    } finally {
      await client.disconnect();
    }
  });