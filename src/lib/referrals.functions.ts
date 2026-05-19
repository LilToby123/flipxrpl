import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("referral_code, referral_earnings_drops")
      .eq("id", userId)
      .maybeSingle();

    const { count: invitedCount } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", userId);

    return {
      code: me?.referral_code ?? "",
      earningsDrops: Number(me?.referral_earnings_drops ?? 0),
      invitedCount: invitedCount ?? 0,
    };
  });