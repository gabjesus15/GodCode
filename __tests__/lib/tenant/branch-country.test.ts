import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

import { branchBusinessHoursUpdate, branchCountryResolver } from "@/lib/tenant/branch-country";
import { emptyBusinessHoursWeek, type BusinessHours } from "@/lib/tenant/business-hours";

function client(country: string | null) {
	return makeAdminMock({ tables: { companies: [{ data: { country }, error: null }] } });
}

describe("país de la sucursal", () => {
	it("usa el de la sucursal sin consultar el negocio", async () => {
		const admin = client("CL");
		const resolve = branchCountryResolver(admin as unknown as SupabaseClient, { branchCountry: "VE", companyId: "acme" });
		await expect(resolve()).resolves.toBe("VE");
		expect(admin.fromCalls).toEqual([]);
	});

	it("sin país propio usa el del negocio y lo consulta una sola vez", async () => {
		const admin = client("Venezuela");
		const resolve = branchCountryResolver(admin as unknown as SupabaseClient, { branchCountry: null, companyId: "acme" });
		await expect(resolve()).resolves.toBe("Venezuela");
		await expect(resolve()).resolves.toBe("Venezuela");
		expect(admin.fromCalls).toEqual(["companies"]);
	});

	it("sin país en ninguno de los dos devuelve null", async () => {
		const resolve = branchCountryResolver(client(null) as unknown as SupabaseClient, { branchCountry: "", companyId: "acme" });
		await expect(resolve()).resolves.toBeNull();
	});
});

describe("horario listo para guardar", () => {
	const week = (() => {
		const value = emptyBusinessHoursWeek();
		value[1] = [{ open: "09:00", close: "19:00" }];
		value[2] = [{ open: "09:00", close: "19:00" }];
		return value;
	})();

	it("con días fija la zona del país y el texto que muestra la tienda", async () => {
		const hours: BusinessHours = { enabled: true, timezone: "Europe/Madrid", week };
		const update = await branchBusinessHoursUpdate(hours, async () => "Venezuela");
		expect(update.business_hours?.timezone).toBe("America/Caracas");
		expect(update.schedule).toBe("Lun y Mar: 09:00 a 19:00");
	});

	it("sin días lo borra y ni consulta el país", async () => {
		const resolveCountry = vi.fn(async () => "CL");
		await expect(branchBusinessHoursUpdate(null, resolveCountry)).resolves.toEqual({ business_hours: null });
		await expect(
			branchBusinessHoursUpdate({ enabled: false, timezone: null, week: emptyBusinessHoursWeek() }, resolveCountry),
		).resolves.toEqual({ business_hours: null });
		expect(resolveCountry).not.toHaveBeenCalled();
	});
});
