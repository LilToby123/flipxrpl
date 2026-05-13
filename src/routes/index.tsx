import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Coins, Dices, TrendingUp, Ticket, Wallet, ShieldCheck, Sparkles, Search, Send, Link2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/")({
  component: Index,
});

const games = [
  { to: "/games/coinflip", icon: Coins, name: "Coin Flip", desc: "50/50 — double or nothing", edge: "1% edge" },
  { to: "/games/dice", icon: Dices, name: "Dice", desc: "Pick under/over, payouts up to 99×", edge: "1% edge" },
  { to: "/games/crash", icon: TrendingUp, name: "Crash", desc: "Cash out before the rocket crashes", edge: "1% edge" },
  { to: "/games/lottery", icon: Ticket, name: "Lottery", desc: "Hourly draw — winner takes the pot", edge: "5% rake" },
] as const;

const tools = [
  { to: "/tools/explorer", icon: Search, name: "Explorer", desc: "Look up any XRPL address, balance, recent transactions and trust lines." },
  { to: "/tools/send", icon: Send, name: "Send XRP", desc: "Sign a payment with Xaman — destination tag and memo supported." },
  { to: "/tools/trustlines", icon: Link2, name: "Trust Lines", desc: "Add or remove IOU trust lines from your wallet." },
] as const;

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,oklch(0.82_0.16_85_/_0.15)_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-gold bg-card/40 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Provably fair · Live on XRPL
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mx-auto mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.05] sm:text-6xl md:text-7xl"
          >
            Play XRP. <span className="text-gradient-gold">Win XRP.</span>
            <br />Settled on the ledger.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Deposit XRP from any wallet, play four provably-fair games, and use a full
            on-chain XRPL toolkit — explorer, send, trust lines — all in one place.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/auth" className="rounded-md bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground shadow-gold transition hover:opacity-90">
              Connect Xaman to play
            </Link>
            <Link to="/games/coinflip" className="rounded-md border border-border bg-card/60 px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-card">
              Try a coin flip
            </Link>
          </motion.div>

          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6 text-left">
            {[
              { k: "1%", v: "House edge" },
              { k: "<4s", v: "XRPL settlement" },
              { k: "100%", v: "Auditable RNG" },
            ].map((s) => (
              <div key={s.v} className="rounded-lg border border-border/60 bg-card/40 p-5">
                <div className="font-display text-3xl font-bold text-gradient-gold">{s.k}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GAMES */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">The floor</p>
            <h2 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Four games. One vault.</h2>
          </div>
          <Link to="/games/coinflip" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground md:inline">
            Browse all →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((g, i) => (
            <motion.div
              key={g.to}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <Link
                to={g.to}
                className="group relative block h-full overflow-hidden rounded-xl border border-border/60 bg-card p-6 transition hover:border-gold hover:shadow-gold"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-gold shadow-gold">
                  <g.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-2xl font-semibold">{g.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{g.desc}</p>
                <div className="mt-6 flex items-center justify-between text-xs">
                  <span className="rounded-full border border-border/80 px-2.5 py-1 text-muted-foreground">{g.edge}</span>
                  <span className="font-semibold text-primary transition group-hover:translate-x-1">Play →</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TOOLS */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-10">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">XRPL tools</p>
            <h2 className="mt-2 font-display text-4xl font-bold">More than a casino.</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              The same wallet you bet with can explore the ledger, send payments and manage trust lines.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {tools.map((t) => (
              <Link key={t.to} to={t.to} className="group flex flex-col rounded-xl border border-border/60 bg-background/40 p-6 transition hover:border-accent">
                <t.icon className="mb-4 h-6 w-6 text-accent" />
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{t.desc}</p>
                <span className="mt-4 text-sm font-medium text-accent transition group-hover:translate-x-1">Open →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">How it works</p>
          <h2 className="mt-2 font-display text-4xl font-bold">From wallet to win in three steps.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Wallet, t: "Connect Xaman", d: "Sign a free message with the Xaman app — no password, no email. Your XRPL address is your identity." },
            { icon: Coins, t: "Deposit XRP", d: "Send XRP to the vault address with your unique destination tag. Credited automatically once the ledger confirms." },
            { icon: ShieldCheck, t: "Play & withdraw", d: "Every round commits a server-seed hash before you bet, and reveals the seed after. Withdraw to any address, anytime." },
          ].map((s, i) => (
            <div key={s.t} className="relative rounded-xl border border-border/60 bg-card p-6">
              <div className="absolute -top-3 left-6 rounded-full bg-gradient-gold px-3 py-0.5 text-xs font-bold text-primary-foreground">
                Step {i + 1}
              </div>
              <s.icon className="mt-2 h-7 w-7 text-primary" />
              <h3 className="mt-4 font-display text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="overflow-hidden rounded-2xl border border-gold bg-gradient-hero p-12 text-center shadow-glow">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">Your seat at the table is open.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Connect your Xaman wallet and start playing in under 30 seconds.
          </p>
          <Link to="/auth" className="mt-8 inline-flex rounded-md bg-gradient-gold px-8 py-3 text-sm font-semibold text-primary-foreground shadow-gold transition hover:opacity-90">
            Connect Xaman
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
