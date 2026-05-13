import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";

export const Route = createFileRoute("/games/lottery")({
  head: () => ({ meta: [{ title: "Lottery — RippleVault" }, { name: "description", content: "Hourly XRP lottery — winner takes the pot." }] }),
  component: () => (
    <PageShell eyebrow="Game" title="Hourly Lottery" description="Buy a ticket. Every hour one ticket wins the entire pot, minus a 5% rake.">
      <ComingSoon />
    </PageShell>
  ),
});
