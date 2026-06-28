import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockHeadersGet = vi.fn();

vi.mock("next/headers", () => ({
	headers: async () => ({
		get: mockHeadersGet,
	}),
}));

vi.mock("@/utils/supabase/server", () => ({
	createSupabaseServerClient: async () => ({
		auth: { getUser: mockGetUser },
	}),
}));

vi.mock("@/lib/super-admin/account-access", () => ({
	getCustomerMembership: vi.fn(),
}));

import { getTicketAuthContext } from "@/lib/api/ticket-auth";

describe("getTicketAuthContext", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeadersGet.mockImplementation((key: string) => {
			if (key === "x-tenant-slug") return "tenant-a";
			if (key === "host") return "tenant-a.godcode.me";
			return null;
		});
		mockGetUser.mockResolvedValue({
			data: { user: { email: "staff@example.com" } },
			error: null,
		});
	});

	it("scopes tenant user to company matching x-tenant-slug", async () => {
		const client = {
			from: (table: string) => {
				if (table === "users") {
					return {
						select: () => ({
							ilike: async () => ({
								data: [
									{ company_id: "company-a", role: "admin" },
									{ company_id: "company-b", role: "admin" },
								],
							}),
						}),
					};
				}
				if (table === "companies") {
					return {
						select: () => ({
							eq: () => ({
								maybeSingle: async () => ({ data: { id: "company-a" } }),
							}),
						}),
					};
				}
				throw new Error(`unexpected table ${table}`);
			},
		};

		const ctx = await getTicketAuthContext(client as never);
		expect(ctx).toEqual({ companyId: "company-a", email: "staff@example.com" });
	});
});
