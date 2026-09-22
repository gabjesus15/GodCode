import { describe, expect, it } from "vitest";

import {
	joinAddressLine,
	joinStreetAndNumber,
	splitStreetAndNumber,
} from "@/components/tenant/cart/utils/street-number";

describe("splitStreetAndNumber", () => {
	it("splits the trailing number from the street", () => {
		expect(splitStreetAndNumber("Av. Italia 1432")).toEqual({ street: "Av. Italia", number: "1432" });
		expect(splitStreetAndNumber("Los Leones 45B")).toEqual({ street: "Los Leones", number: "45B" });
	});

	it("ignores everything after the first comma", () => {
		expect(splitStreetAndNumber("Av. Italia 1432, depto 4")).toEqual({
			street: "Av. Italia",
			number: "1432",
		});
	});

	it("keeps the whole text as street when there is no number", () => {
		expect(splitStreetAndNumber("Pasaje sin numero")).toEqual({
			street: "Pasaje sin numero",
			number: "",
		});
		expect(splitStreetAndNumber("   ")).toEqual({ street: "", number: "" });
	});
});

describe("joinStreetAndNumber / joinAddressLine", () => {
	it("never leaves separators dangling", () => {
		expect(joinStreetAndNumber("Av. Italia", "1432")).toBe("Av. Italia 1432");
		expect(joinStreetAndNumber("Av. Italia ", "")).toBe("Av. Italia");
		expect(joinAddressLine("Av. Italia 1432", "Ñuñoa")).toBe("Av. Italia 1432, Ñuñoa");
		expect(joinAddressLine("Av. Italia 1432", " ")).toBe("Av. Italia 1432");
		expect(joinAddressLine("", "")).toBe("");
	});
});
