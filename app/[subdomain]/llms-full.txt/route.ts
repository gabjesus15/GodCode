import { NextRequest } from "next/server";
import { getLlmsTxtData } from "@/lib/tenant/llms-txt";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await context.params;
  const markdown = await getLlmsTxtData(subdomain, true);

  if (!markdown) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
