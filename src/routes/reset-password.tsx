import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — FlipXRPL" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — please sign in");
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Toaster theme="dark" />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
            <KeyRound className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a new password for your FlipXRPL account.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-border/60 bg-card p-6">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
        <Link to="/auth" className="mt-6 text-center text-xs text-muted-foreground hover:text-foreground">← Back to sign in</Link>
      </main>
      <SiteFooter />
    </div>
  );
}