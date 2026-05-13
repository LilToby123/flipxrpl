import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyVault = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: balance }] = await Promise.all([
      supabase.from("profiles").select("xrpl_address, destination_tag, display_name").eq("id", userId).maybeSingle(),
      supabase.from("balances").select("drops").eq("user_id", userId).maybeSingle(),
    ]);
    return {
      profile: profile ?? null,
      drops: balance?.drops ? Number(balance.drops) : 0,
      houseAddress: process.env.HOUSE_WALLET_ADDRESS ?? "rHouseWalletAddressNotConfiguredYet",
      network: process.env.XRPL_NETWORK?.includes("altnet") ? "Testnet" : "Mainnet",
    };
  });
