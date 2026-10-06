import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
vi.mock("@/utils/supabase/server", () => ({
	createSupabaseServerClient: async () => ({ auth: { verifyOtp: (...args: unknown[]) => verifyOtp(...args), signOut: async () => ({}) } }),
}));

import { GET, POST } from "@/app/(auth)/login/confirmar/route";

function form(fields: Record<string, string>, origin: string | null = "https://www.godcode.me") {
	const body = new URLSearchParams(fields);
	const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded", host: "www.godcode.me" };
	if (origin) headers.origin = origin;
	return new NextRequest("https://www.godcode.me/login/confirmar", { method: "POST", body, headers });
}

beforeEach(() => verifyOtp.mockReset());

describe("/login/confirmar", () => {
	it("abrir el enlace no gasta el token: lleva a la página con el botón", async () => {
		const res = await GET(new NextRequest("https://www.godcode.me/login/confirmar?token_hash=abc&type=recovery"));
		expect(res.headers.get("location")).toBe("https://www.godcode.me/login/activar?token_hash=abc&type=recovery");
		expect(verifyOtp).not.toHaveBeenCalled();
	});

	it("el botón canjea el token y manda a elegir la contraseña", async () => {
		verifyOtp.mockResolvedValue({ error: null });
		const res = await POST(form({ token_hash: "abc", type: "recovery" }));
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toBe("https://www.godcode.me/login/nueva-clave");
		expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc" });
	});

	it("un enlace vencido lleva directo a pedir otro", async () => {
		verifyOtp.mockResolvedValue({ error: { message: "expired" } });
		const res = await POST(form({ token_hash: "abc", type: "recovery" }));
		expect(res.headers.get("location")).toBe("https://www.godcode.me/login/recuperar?vencido=1");
	});

	it("un formulario de otro sitio no canjea nada", async () => {
		const res = await POST(form({ token_hash: "abc", type: "recovery" }, "https://evil.example"));
		expect(res.headers.get("location")).toBe("https://www.godcode.me/login?error=enlace");
		expect(verifyOtp).not.toHaveBeenCalled();
	});
});
