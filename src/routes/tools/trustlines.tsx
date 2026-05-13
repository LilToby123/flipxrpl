import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";

export const Route = createFileRoute("/tools/trustlines")({
  head: () => ({ meta: [{ title: "Trust Lines — RippleVault" }] }),
  component: () => (
    <PageShell eyebrow="Tool" title="Trust lines" description="View, add and remove issued-currency trust lines for your wallet.">
      <ComingSoon />
    </PageShell>
  ),
});
