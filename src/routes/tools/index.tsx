import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Search, Send, Link2 } from "lucide-react";

const tools = [
  { to: "/tools/explorer", icon: Search, name: "Address Explorer", desc: "Lookup balance, tx history and trust lines for any r-address." },
  { to: "/tools/send", icon: Send, name: "Send XRP", desc: "Sign a Payment with Xaman. Destination tag and memo supported." },
  { to: "/tools/trustlines", icon: Link2, name: "Trust Lines", desc: "Add or remove issued-currency trust lines." },
] as const;

export const Route = createFileRoute("/tools/")({
  head: () => ({ meta: [{ title: "XRPL Tools — RippleVault" }, { name: "description", content: "On-chain XRPL utilities: explorer, send, trust lines." }] }),
  component: () => (
    <PageShell eyebrow="Toolkit" title="XRPL tools" description="Useful utilities for everyday XRP Ledger interactions.">
      <div className="grid gap-5 md:grid-cols-3">
        {tools.map((t) => (
          <Link key={t.to} to={t.to} className="group rounded-xl border border-border/60 bg-card p-6 transition hover:border-accent">
            <t.icon className="mb-4 h-6 w-6 text-accent" />
            <h3 className="text-lg font-semibold">{t.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            <span className="mt-4 inline-block text-sm font-medium text-accent transition group-hover:translate-x-1">Open →</span>
          </Link>
        ))}
      </div>
    </PageShell>
  ),
});
