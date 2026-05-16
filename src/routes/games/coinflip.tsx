import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, ShieldCheck, RotateCw, Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ActivityFeed } from "@/components/activity-feed";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dropsToXrp, xrpToDrops } from "@/lib/xrpl";
import { placeCoinFlip, getActiveSeedHash, rotateSeed } from "@/lib/games.functions";
import { getMyVault } from "@/lib/wallet.functions";

export const Route = createFileRoute("/games/coinflip")({
  head: () => ({
    meta: [
      { title: "Coin Flip — RippleFlip" },
      { name: "description", content: "Provably fair XRP coin flip — 2× payout, 1% house edge. Try demo mode free." },
    ],
  }),
  component: CoinFlip,
});

type ServerResult = Awaited<ReturnType<typeof placeCoinFlip>>;
type FlipResult = {
  win: boolean;
  result_side: "heads" | "tails";
  payout_drops: number;
  wager_drops: number;
  demo: boolean;
};

const DEMO_KEY = "rf_demo_balance";
const DEMO_START = 100_000_000; // 100 XRP play-money

function CoinFlip() {
  const placeFn = useServerFn(placeCoinFlip);
  const seedFn = useServerFn(getActiveSeedHash);
  const rotateFn = useServerFn(rotateSeed);
  const vaultFn = useServerFn(getMyVault);
  const qc = useQueryClient();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [demoMode, setDemoMode] = useState(true); // start in demo so anyone can try
  const [realDrops, setRealDrops] = useState(0);
  const [demoDrops, setDemoDrops] = useState(DEMO_START);
  const [bet, setBet] = useState(1); // XRP
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const [clientSeed, setClientSeed] = useState(() => Math.random().toString(36).slice(2, 10));
  const [seedHash, setSeedHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<FlipResult | null>(null);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? Number(localStorage.getItem(DEMO_KEY)) : 0;
    if (saved > 0) setDemoDrops(saved);
    supabase.auth.getSession().then(async ({ data }) => {
      const isAuthed = !!data.session;
      setAuthed(isAuthed);
      if (isAuthed) {
        setDemoMode(false); // signed-in players default to real
        const v = await vaultFn();
        setRealDrops(v.drops);
        const s = await seedFn();
        setSeedHash(s.seed_hash);
      }
    });
  }, [seedFn, vaultFn]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(DEMO_KEY, String(demoDrops));
  }, [demoDrops]);

  const balanceDrops = demoMode ? demoDrops : realDrops;

  function flipDemo() {
    const wager = xrpToDrops(bet);
    if (wager > demoDrops) {
      toast.error("Demo balance too low — reset it below");
      return;
    }
    setBusy(true);
    setFlipping(true);
    // 1% edge mirrors the real engine
    const roll = Math.random();
    const win = side === "heads" ? roll < 0.495 : roll >= 0.505;
    const result_side: "heads" | "tails" = roll < 0.5 ? "heads" : "tails";
    setTimeout(() => {
      const payout = win ? wager * 2 : 0;
      setDemoDrops((d) => d - wager + payout);
      setLast({ win, result_side, payout_drops: payout, wager_drops: wager, demo: true });
      setBusy(false);
      setFlipping(false);
      if (win) toast.success(`Demo win — +${dropsToXrp(payout - wager)} XRP`);
      else toast(`Demo loss — landed on ${result_side}`);
    }, 1400);
  }

  async function flipReal() {
    if (!authed) {
      toast.error("Connect your vault to play with real XRP");
      return;
    }
    const wager = xrpToDrops(bet);
    if (wager > realDrops) {
      toast.error("Insufficient balance — deposit XRP first");
      return;
    }
    setBusy(true);
    setFlipping(true);
    try {
      const res: ServerResult = await placeFn({ data: { side, wager_drops: wager, client_seed: clientSeed } });
      await new Promise((r) => setTimeout(r, 1400));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLast({
        win: res.win,
        result_side: res.result_side as "heads" | "tails",
        payout_drops: res.payout_drops,
        wager_drops: wager,
        demo: false,
      });
      setRealDrops(res.new_balance_drops);
      qc.invalidateQueries({ queryKey: ["vault"] });
      if (res.win) toast.success(`You won ${dropsToXrp(res.payout_drops - wager)} XRP`);
      else toast(`House wins — landed on ${res.result_side}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bet failed";
      toast.error(msg);
    } finally {
      setBusy(false);
      setFlipping(false);
    }
  }

  function flip() {
    if (demoMode) flipDemo();
    else flipReal();
  }

  async function rotate() {
    if (!authed) return;
    const r = await rotateFn();
    setSeedHash(r.new_seed_hash);
    if (r.revealed) toast.success("Previous seed revealed — verify any past bet");
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Toaster theme="dark" />
      <main className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1fr_360px]">
        {/* GAME */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">Game · 1% house edge</p>
              <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Coin Flip</h1>
            </div>
            <div className="inline-flex rounded-md border border-border bg-card/40 p-1 text-xs font-semibold">
              <button
                onClick={() => setDemoMode(true)}
                className={`rounded px-3 py-1.5 transition ${demoMode ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              >
                <Sparkles className="mr-1 inline h-3 w-3" /> Demo
              </button>
              <button
                onClick={() => {
                  if (!authed) {
                    toast.error("Sign in to play with real XRP");
                    return;
                  }
                  setDemoMode(false);
                }}
                className={`rounded px-3 py-1.5 transition ${!demoMode ? "bg-gradient-gold text-primary-foreground" : "text-muted-foreground"}`}
              >
                Real XRP
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 p-10">
            <div className="relative h-44 w-44 [perspective:800px] sm:h-48 sm:w-48">
              <AnimatePresence mode="wait">
                <motion.div
                  key={(last?.result_side ?? "rest") + (flipping ? "-flipping" : "")}
                  initial={flipping ? { rotateY: 0 } : { scale: 0.6, opacity: 0 }}
                  animate={flipping ? { rotateY: 1800 } : { scale: 1, opacity: 1 }}
                  transition={flipping ? { duration: 1.4, ease: "easeOut" } : { duration: 0.3 }}
                  className="flex h-full w-full items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold [transform-style:preserve-3d]"
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
                {last.win
                  ? `+${dropsToXrp(last.payout_drops - last.wager_drops)} XRP`
                  : `−${dropsToXrp(last.wager_drops)} XRP`}
                {last.demo && <span className="ml-2 text-xs uppercase tracking-wider text-accent">demo</span>}
              </p>
            )}

            <div className="mt-6 flex gap-3">
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
                  <button key={n} onClick={() => setBet(n)} className="rounded-md border border-border px-3 text-xs hover:bg-card">{n}</button>
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{demoMode ? "Demo balance" : "Balance"}: {dropsToXrp(balanceDrops)} XRP</span>
                {demoMode && (
                  <button onClick={() => setDemoDrops(DEMO_START)} className="text-accent hover:underline">Reset demo</button>
                )}
              </div>
            </div>

            <button
              onClick={flip}
              disabled={busy}
              className="mt-7 w-full max-w-sm rounded-md bg-gradient-gold py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-gold transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Flipping…" : `Flip for ${bet} XRP${demoMode ? " (demo)" : ""}`}
            </button>
          </div>
        </section>

        {/* SIDEBAR — live activity + provably fair */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Live activity</h3>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                realtime
              </span>
            </div>
            <ActivityFeed limit={12} compact />
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-accent" /> Provably fair</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Server seed is committed via SHA-256 hash before your bet. Reveal it any time to verify.
            </p>
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <p className="uppercase tracking-wider text-muted-foreground">Server seed hash</p>
                <p className="mt-1 truncate font-mono">{seedHash ?? (authed ? "—" : "Sign in to see")}</p>
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
            {authed && (
              <button onClick={rotate} className="mt-3 inline-flex items-center gap-2 text-xs text-accent hover:underline">
                <RotateCw className="h-3 w-3" /> Reveal & rotate seed
              </button>
            )}
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
