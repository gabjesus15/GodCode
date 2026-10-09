import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

/** Como llega detrás de Coolify: la app escucha en 0.0.0.0:3000 y el host público va reenviado. */
function proxiedForm(fields: Record<string, string>, origin: string | null = "https://www.godcode.me") {
	const body = new URLSearchParams(fields);
	const headers: Record<string, string> = {
		"content-type": "application/x-www-form-urlencoded",
		host: "0.0.0.0:3000",
		"x-forwarded-host": "www.godcode.me",
		"x-forwarded-proto": "https",
	};
	if (origin) headers.origin = origin;
	return new NextRequest("http://0.0.0.0:3000/login/confirmar", { method: "POST", body, headers });
}

beforeEach(() => {
	verifyOtp.mockReset();
	vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.godcode.me");
});

afterEach(() => {
	vi.unstubAllEnvs();
});

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

	it("sin Origin no canjea nada", async () => {
		const res = await POST(form({ token_hash: "abc", type: "recovery" }, null));
		expect(res.headers.get("location")).toBe("https://www.godcode.me/login?error=enlace");
		expect(verifyOtp).not.toHaveBeenCalled();
	});
});

describe("/login/confirmar detrás del proxy", () => {
	it("el GET redirige al dominio público, no a 0.0.0.0:3000", async () => {
		const res = await GET(
			new NextRequest("http://0.0.0.0:3000/login/confirmar?token_hash=abc&type=recovery", {
				headers: { host: "0.0.0.0:3000", "x-forwarded-host": "www.godcode.me" },
			}),
		);
		expect(res.headers.get("location")).toBe("https://www.godcode.me/login/activar?token_hash=abc&type=recovery");
	});

	it("el botón de nuestra página canjea el token aunque `host` sea el interno", async () => {
		verifyOtp.mockResolvedValue({ error: null });
		const res = await POST(proxiedForm({ token_hash: "abc", type: "recovery" }));
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toBe("https://www.godcode.me/login/nueva-clave");
		expect(verifyOtp).toHaveBeenCalledTimes(1);
	});

	it("los rechazos y el enlace vencido también van al dominio público", async () => {
		const foreign = await POST(proxiedForm({ token_hash: "abc", type: "recovery" }, "https://evil.example"));
		expect(foreign.headers.get("location")).toBe("https://www.godcode.me/login?error=enlace");
		expect(verifyOtp).not.toHaveBeenCalled();

		verifyOtp.mockResolvedValue({ error: { message: "expired" } });
		const expired = await POST(proxiedForm({ token_hash: "abc", type: "recovery" }));
		expect(expired.headers.get("location")).toBe("https://www.godcode.me/login/recuperar?vencido=1");
	});
});
