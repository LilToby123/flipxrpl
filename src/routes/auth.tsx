import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { isLikelyXrplAddress } from "@/lib/xrpl";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — RippleVault" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/wallet" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!isLikelyXrplAddress(address)) {
          toast.error("Enter a valid XRPL address (starts with r…)");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/wallet`,
            data: { xrpl_address: address },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/wallet" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Toaster theme="dark" />
      <main className="mx-auto flex max-w-md flex-col px-6 py-20">
        <h1 className="font-display text-4xl font-bold">
          {mode === "signup" ? "Open your vault" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Tell us your XRPL address — withdrawals default to it."
            : "Sign in to your RippleVault account."}
        </p>

        <form onSubmit={submit} className="mt-10 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">XRPL address</label>
              <input
                type="text"
                required
                placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
                className="mt-2 w-full rounded-md border border-border bg-input px-4 py-3 font-mono text-sm outline-none focus:border-primary"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Paste your r-address from Xaman, GemWallet or Crossmark.
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-md bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Working…" : mode === "signup" ? "Create vault" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>

        <Link to="/" className="mt-10 text-center text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
      </main>
      <SiteFooter />
    </div>
  );
}