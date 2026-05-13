import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, ShieldCheck, RotateCw } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dropsToXrp, xrpToDrops } from "@/lib/xrpl";
import { placeCoinFlip, getActiveSeedHash, rotateSeed } from "@/lib/games.functions";
import { getMyVault } from "@/lib/wallet.functions";

export const Route = createFileRoute("/games/coinflip")({
  head: () => ({ meta: [{ title: "Coin flip — RippleVault" }, { name: "description", content: "Provably fair XRP coin flip — 2× payout, 1% house edge." }] }),
  component: CoinFlip,
});

type Result = Awaited<ReturnType<typeof placeCoinFlip>>;

function CoinFlip() {
  const placeFn = useServerFn(placeCoinFlip);
  const seedFn = useServerFn(getActiveSeedHash);
  const rotateFn = useServerFn(rotateSeed);
  const vaultFn = useServerFn(getMyVault);
  const qc = useQueryClient();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [balanceDrops, setBalanceDrops] = useState(0);
  const [bet, setBet] = useState(1); // XRP
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const [clientSeed, setClientSeed] = useState(() => Math.random().toString(36).slice(2, 10));
  const [seedHash, setSeedHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Extract<Result, { ok: true }> | null>(null);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setAuthed(!!data.session);
      if (data.session) {
        const v = await vaultFn();
        setBalanceDrops(v.drops);
        const s = await seedFn();
        setSeedHash(s.seed_hash);
      }
    });
  }, [seedFn, vaultFn]);

  async function flip() {
    if (!authed) {
      toast.error("Connect your vault to play");
      return;
    }
    const wager = xrpToDrops(bet);
    if (wager > balanceDrops) {
      toast.error("Insufficient balance — deposit XRP first");
      return;
    }
    setBusy(true);
    setFlipping(true);
    try {
      const res = await placeFn({ data: { side, wager_drops: wager, client_seed: clientSeed } });
      // Animate for ~1.4s before reveal
      await new Promise((r) => setTimeout(r, 1400));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLast(res);
      setBalanceDrops(res.new_balance_drops);
      qc.invalidateQueries({ queryKey: ["vault"] });
      if (res.win) toast.success(`You won ${dropsToXrp(res.payout_drops)} XRP`);
      else toast(`House wins — landed on ${res.result_side}`);
    } catch (e: any) {
      toast.error(e.message ?? "Bet failed");
    } finally {
      setBusy(false);
      setFlipping(false);
    }
  }

  async function rotate() {
    const r = await rotateFn();
    setSeedHash(r.new_seed_hash);
    if (r.revealed) toast.success("Previous seed revealed — verify any past bet");
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Toaster theme="dark" />
      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_360px]">
        {/* GAME */}
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Game · 1% house edge</p>
          <h1 className="mt-2 font-display text-5xl font-bold">Coin Flip</h1>
          <p className="mt-3 max-w-lg text-muted-foreground">Pick a side, set your stake, and double your XRP. RNG is committed before you bet and revealable after.</p>

          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 p-12">
            <div className="relative h-48 w-48 [perspective:800px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={(last?.nonce ?? -1) + (flipping ? "-flipping" : "-rest")}
                  initial={flipping ? { rotateY: 0 } : { scale: 0.6, opacity: 0 }}
                  animate={
                    flipping
                      ? { rotateY: 1800 }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={flipping ? { duration: 1.4, ease: "easeOut" } : { duration: 0.3 }}
                  className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold [transform-style:preserve-3d]"
                >
                  <Coins className="h-20 w-20" />
                  <span className="absolute bottom-3 font-display text-sm font-bold uppercase">
                    {flipping ? "…" : last ? last.result_side : side}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {last && !flipping && (
              <p className={`mt-6 font-display text-2xl font-bold ${last.win ? "text-gradient-gold" : "text-muted-foreground"}`}>
                {last.win ? `+${dropsToXrp(last.payout_drops - xrpToDrops(bet))} XRP` : `−${bet} XRP`}
              </p>
            )}

            <div className="mt-8 flex gap-3">
              {(["heads", "tails"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`rounded-md border px-6 py-2.5 text-sm font-semibold uppercase tracking-wider transition ${
                    side === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-6 w-full max-w-sm">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Wager (XRP)</label>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={bet}
                  onChange={(e) => setBet(Math.max(0.1, Number(e.target.value)))}
                  className="flex-1 rounded-md border border-border bg-input px-4 py-2.5 text-sm font-mono outline-none focus:border-primary"
                />
                {[1, 5, 25].map((n) => (
                  <button key={n} onClick={() => setBet(n)} className="rounded-md border border-border px-3 text-xs hover:bg-card">{n}×</button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Balance: {dropsToXrp(balanceDrops)} XRP</p>
            </div>

            <button
              onClick={flip}
              disabled={busy || authed === false}
              className="mt-8 w-full max-w-sm rounded-md bg-gradient-gold py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-gold transition hover:opacity-90 disabled:opacity-60"
            >
              {authed === false ? "Sign in to play" : busy ? "Flipping…" : `Flip for ${bet} XRP`}
            </button>
          </div>
        </section>

        {/* SIDEBAR — provably fair */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-accent" /> Provably fair</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Server seed is committed via SHA-256 hash <em>before</em> your bet. Reveal it any time to verify past rolls.
            </p>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <p className="uppercase tracking-wider text-muted-foreground">Server seed hash</p>
                <p className="mt-1 truncate font-mono">{seedHash ?? "—"}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-muted-foreground">Client seed</p>
                <input
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-input px-2 py-1 font-mono text-xs"
                />
              </div>
            </div>
            <button onClick={rotate} className="mt-4 inline-flex items-center gap-2 text-xs text-accent hover:underline">
              <RotateCw className="h-3 w-3" /> Reveal & rotate seed
            </button>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Verification</p>
            <p className="mt-2">After rotating, compute <code className="text-primary">SHA256(revealed_seed)</code> and confirm it matches the published hash. Then HMAC-SHA256(seed, <code>{`{client_seed}:{nonce}`}</code>) → take first 8 hex chars / 2³² → roll &lt; 0.495 means heads wins.</p>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}