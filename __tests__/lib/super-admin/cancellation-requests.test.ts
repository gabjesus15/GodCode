import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: {} }));

import { parseCancellationReason } from "@/lib/super-admin/cancellation-requests";

describe("parseCancellationReason", () => {
	it("lee el motivo del ticket de cancelación", () => {
		expect(parseCancellationReason("Sigue online hasta: 11-10-2026\nMotivo: Cerramos el local")).toBe("Cerramos el local");
		expect(parseCancellationReason("Sigue online hasta: 11-10-2026\r\nMotivo:   Muy caro  ")).toBe("Muy caro");
	});

	it("sin motivo devuelve null", () => {
		expect(parseCancellationReason("Sigue online hasta: 11-10-2026\nMotivo: No indicado")).toBeNull();
		expect(parseCancellationReason(null)).toBeNull();
		expect(parseCancellationReason("otra cosa")).toBeNull();
	});
});
