import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { adminStats, adminWithdrawProfit, adminSnapshot } from "@/lib/admin.functions";
import { dropsToXrp, xrpToDrops } from "@/lib/xrpl";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ShieldAlert, TrendingUp, Wallet as WalletIcon, Camera } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — FlipXRPL" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const statsFn = useServerFn(adminStats);
  const withdrawFn = useServerFn(adminWithdrawProfit);
  const snapshotFn = useServerFn(adminSnapshot);

  const stats = useMutation({
    mutationFn: () => statsFn({ data: { password: pw } }),
    onSuccess: () => setAuthed(true),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const withdraw = useMutation({
    mutationFn: (amountXrp: number) =>
      withdrawFn({ data: { password: pw, drops: xrpToDrops(amountXrp) } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`Profit withdrawn: ${res.tx_hash.slice(0, 12)}…`);
        stats.mutate();
      } else toast.error(res.error);
    },
  });

  const snapshot = useMutation({
    mutationFn: () => snapshotFn({ data: { password: pw } }),
    onSuccess: () => {
      toast.success("Snapshot recorded");
      stats.mutate();
    },
  });

  if (!authed) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <Toaster theme="dark" />
        <main className="mx-auto max-w-md px-4 py-20">
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-accent" />
            <h1 className="mt-3 font-display text-2xl font-bold">Admin access</h1>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Admin password"
              className="mt-6 w-full rounded-md border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && pw && stats.mutate()}
            />
            <button
              onClick={() => stats.mutate()}
              disabled={!pw || stats.isPending}
              className="mt-3 w-full rounded-md bg-gradient-gold py-3 text-sm font-bold text-primary-foreground shadow-gold disabled:opacity-60"
            >
              {stats.isPending ? "Verifying…" : "Sign in"}
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const data = stats.data;
  if (!data || !("ok" in data) || !data.ok) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted-foreground">Loading…</main>
      </div>
    );
  }

  const lowTreasury = data.onChainDrops > 0 && data.onChainDrops < 500_000_000;
  const pnlEntries = Object.entries(data.pnlByDay).sort(([a], [b]) => a.localeCompare(b));
  const maxAbs = Math.max(1, ...pnlEntries.map(([, v]) => Math.abs(v)));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Toaster theme="dark" />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">{data.network}</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Admin dashboard</h1>
          </div>
          <button
            onClick={() => snapshot.mutate()}
            disabled={snapshot.isPending}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-card/80"
          >
            <Camera className="h-4 w-4" /> {snapshot.isPending ? "Snapshotting…" : "Snapshot treasury"}
          </button>
        </div>

        {lowTreasury && (
          <div className="mt-6 rounded-xl border border-destructive bg-destructive/10 p-4 text-sm">
            ⚠️ Treasury below 500 XRP — top up the house wallet.
          </div>
        )}
        {data.onChainError && (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-xs text-muted-foreground">
            On-chain fetch error: {data.onChainError}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="On-chain treasury" value={`${dropsToXrp(data.onChainDrops)} XRP`} icon={<WalletIcon className="h-4 w-4" />} />
          <Stat label="User liabilities" value={`${dropsToXrp(data.liabilitiesDrops)} XRP`} />
          <Stat label="House profit (all-time)" value={`${dropsToXrp(data.houseProfitDrops)} XRP`} accent />
          <Stat label="Total wagered" value={`${dropsToXrp(data.wageredDrops)} XRP`} icon={<TrendingUp className="h-4 w-4" />} />
        </div>

        {/* P&L bar chart */}
        <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
          <h2 className="font-display text-lg font-semibold">P&L last 7 days</h2>
          {pnlEntries.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No bets yet.</p>
          ) : (
            <div className="mt-6 flex items-end justify-between gap-2 h-40">
              {pnlEntries.map(([day, v]) => {
                const h = (Math.abs(v) / maxAbs) * 100;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-mono">{dropsToXrp(v)}</div>
                    <div
                      className={`w-full rounded-t ${v >= 0 ? "bg-gradient-gold" : "bg-destructive/70"}`}
                      style={{ height: `${h}%` }}
                    />
                    <div className="text-[10px] text-muted-foreground">{day.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Profit withdraw */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Withdraw profit</h2>
            <p className="mt-1 text-xs text-muted-foreground">Sends from house wallet to {data.payoutAddress || "(payout address not set)"}.</p>
            <ProfitWithdraw onWithdraw={(xrp) => withdraw.mutate(xrp)} pending={withdraw.isPending} />
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Recent withdrawals</h2>
            {data.recentWithdrawals.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-xs">
                {data.recentWithdrawals.map((w, i) => (
                  <li key={i} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="font-mono truncate">{w.to_address.slice(0, 10)}…</span>
                    <span>{dropsToXrp(Number(w.drops))} XRP</span>
                    <span className={w.status === "sent" ? "text-primary" : w.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{w.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, accent, icon }: { label: string; value: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${accent ? "text-gradient-gold" : ""}`}>{value}</div>
    </div>
  );
}

function ProfitWithdraw({ onWithdraw, pending }: { onWithdraw: (xrp: number) => void; pending: boolean }) {
  const [amt, setAmt] = useState(10);
  return (
    <div className="mt-4 space-y-3">
      <input
        type="number"
        min={1}
        step={1}
        value={amt}
        onChange={(e) => setAmt(Math.max(1, Number(e.target.value)))}
        className="w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-primary"
      />
      <button
        onClick={() => onWithdraw(amt)}
        disabled={pending}
        className="w-full rounded-md bg-gradient-gold py-2.5 text-sm font-bold text-primary-foreground shadow-gold disabled:opacity-60"
      >
        {pending ? "Sending…" : `Withdraw ${amt} XRP`}
      </button>
    </div>
  );
}