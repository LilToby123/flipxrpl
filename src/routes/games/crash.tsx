import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";

export const Route = createFileRoute("/games/crash")({
  head: () => ({ meta: [{ title: "Crash — RippleVault" }, { name: "description", content: "Cash out before the multiplier crashes." }] }),
  component: () => (
    <PageShell eyebrow="Game" title="Crash" description="The multiplier rises from 1.00× and crashes at a provably-fair point. Cash out in time.">
      <ComingSoon />
    </PageShell>
  ),
});
