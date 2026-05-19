import { createFileRoute } from "@tanstack/react-router";
import { createXamanSignIn } from "@/lib/xaman.server";

export const Route = createFileRoute("/api/xaman/signin")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const payload = await createXamanSignIn();
          return Response.json(payload);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Xaman error";
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});