import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";

const LOG_PATH = join(process.cwd(), "debug-8331ef.log");

export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ ok: false }, { status: 404 });
	}
	try {
		const body = await req.json();
		appendFileSync(LOG_PATH, `${JSON.stringify({ ...body, timestamp: body.timestamp ?? Date.now() })}\n`, "utf8");
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ ok: false }, { status: 400 });
	}
}
