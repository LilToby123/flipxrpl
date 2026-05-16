import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, ShieldCheck, RotateCw, Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ActivityFeed } from "@/components/activity-feed";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dropsToXrp, xrpToDrops } from "@/lib/xrpl";
import { placeCoinFlip, getActiveSeedHash, rotateSeed } from "@/lib/games.functions";
import { getMyVault } from "@/lib/wallet.functions";

export const Route = createFileRoute("/games/coinflip")({
  head: () => ({ meta: [
    { title: "Coin Flip — RippleFlip" },
    { name: "description", content: "Provably fair XRP coin flip — 2× payout, 1% house edge. Try demo mode free." },
  ] }),
  component: CoinFlip;
});
