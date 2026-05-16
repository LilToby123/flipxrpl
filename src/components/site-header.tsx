import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-gold shadow-gold">
            <Coins className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Ripple<span className="text-gradient-gold">Flip</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link to="/games/coinflip" className="text-muted-foreground transition hover:text-foreground" activeProps={{ className: "text-foreground" }}>Play</Link>
          <Link to="/wallet" className="text-muted-foreground transition hover:text-foreground" activeProps={{ className: "text-foreground" }}>Wallet</Link>
        </nav>
        <Link
          to="/auth"
          className="inline-flex items-center justify-center rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-gold transition hover:opacity-90"
        >
          Connect
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} RippleFlip. Provably fair coin flip on the XRP Ledger.</p>
        <p className="text-xs">18+ only. Play responsibly. Built on XRPL.</p>
      </div>
    </footer>
  );
}
