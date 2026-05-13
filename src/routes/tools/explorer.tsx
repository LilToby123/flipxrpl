import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";

export const Route = createFileRoute("/tools/explorer")({
  head: () => ({ meta: [{ title: "XRPL Explorer — RippleVault" }] }),
  component: () => (
    <PageShell eyebrow="Tool" title="Address explorer" description="Inspect any XRPL r-address: balance, recent transactions, trust lines.">
      <ComingSoon />
    </PageShell>
  ),
});
