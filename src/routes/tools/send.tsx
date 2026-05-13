import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";

export const Route = createFileRoute("/tools/send")({
  head: () => ({ meta: [{ title: "Send XRP — RippleVault" }] }),
  component: () => (
    <PageShell eyebrow="Tool" title="Send XRP" description="Compose a Payment, sign with Xaman, and broadcast to the XRPL.">
      <ComingSoon />
    </PageShell>
  ),
});
