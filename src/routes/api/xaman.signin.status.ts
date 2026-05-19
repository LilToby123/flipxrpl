import { createFileRoute } from "@tanstack/react-router";
import { checkXamanStatus, getOrCreateXrplUser } from "@/lib/xaman.server";

export const Route = createFileRoute("/api/xaman/signin/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const uuid = url.searchParams.get("uuid");
        if (!uuid) return new Response("Missing uuid", { status: 400 });

        try {
          const status = await checkXamanStatus(uuid);
          if (!status.signed) {
            return Response.json({ signed: false, expired: status.expired });
          }
          if (!status.address) {
            return Response.json({ signed: false, expired: true, error: "No address returned" });
          }
          const session = await getOrCreateXrplUser(status.address);
          return Response.json({
            signed: true,
            expired: false,
            address: status.address,
            email: session.email,
            token_hash: session.token_hash,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Xaman status error";
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});