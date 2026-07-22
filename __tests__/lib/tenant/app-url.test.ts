import { afterEach, describe, expect, it } from "vitest";

import { buildAppUrl, getAppHostname, getAppUrl } from "@/lib/tenant/app-url";

describe("getAppUrl", () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("strips internal container port in production", () => {
		process.env = {
			...originalEnv,
			NODE_ENV: "production",
			NEXT_PUBLIC_APP_URL: "https://www.godcode.me:3000",
		};

		expect(getAppUrl()).toBe("https://www.godcode.me");
		expect(getAppHostname()).toBe("www.godcode.me");
	});

	it("buildAppUrl never includes :3000 in production", () => {
		process.env = {
			...originalEnv,
			NODE_ENV: "production",
			NEXT_PUBLIC_APP_URL: "https://www.godcode.me:3000",
		};

		expect(buildAppUrl("/", "?utm=1")).toBe("https://www.godcode.me/?utm=1");
	});
});
