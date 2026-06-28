import { NextRequest, NextResponse } from "next/server";

import { getMainDomainLlmsTxt } from "@/lib/landing/llms-txt";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const host = req.headers.get("host") ?? "";
	if (!isMainDomain(host)) {
		return new NextResponse("Not Found", {
			status: 404,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}

	const markdown = await getMainDomainLlmsTxt(true);

	return new NextResponse(markdown, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600, s-maxage=3600",
		},
	});
}
