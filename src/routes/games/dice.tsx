import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";

export const Route = createFileRoute("/games/dice")({
  head: () => ({ meta: [{ title: "Dice — RippleVault" }, { name: "description", content: "Roll under or over. Payouts up to 99×." }] }),
  component: () => (
    <PageShell eyebrow="Game" title="Dice" description="Pick a number from 2 to 98. Roll under or over. Payout = 99 / win-chance.">
      <ComingSoon />
    </PageShell>
  ),
});
