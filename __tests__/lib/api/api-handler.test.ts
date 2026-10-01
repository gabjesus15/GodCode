import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { withApiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/infra/logger";

const req = () => new NextRequest("http://localhost/api/tenant/staff", { method: "POST" });

describe("withApiHandler", () => {
	it("un error no previsto responde 500 genérico y deja el detalle en el log", async () => {
		const log = vi.spyOn(logger, "error").mockImplementation(() => undefined);
		const handler = withApiHandler(async () => {
			throw new Error('duplicate key value violates unique constraint "users_email_key"');
		});
		const res = await handler(req(), {});
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: "Error interno del servidor" });
		expect(log).toHaveBeenCalledWith(
			"api_unhandled_error",
			expect.objectContaining({ message: expect.stringContaining("users_email_key") }),
		);
		log.mockRestore();
	});

	it("un ApiError conserva su mensaje y su estado: son para mostrar", async () => {
		const handler = withApiHandler(async () => {
			throw new ApiError("Falta el correo", 422);
		});
		const res = await handler(req(), {});
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ error: "Falta el correo" });
	});
});
