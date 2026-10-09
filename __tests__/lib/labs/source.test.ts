import { describe, expect, it } from "vitest";

import { isInstagramVisit } from "@/lib/labs/source";

describe("isInstagramVisit", () => {
	it("reconoce el utm_source de Instagram del enlace de la bio", () => {
		expect(isInstagramVisit({ search: "?utm_source=instagram&utm_medium=bio", referrer: "" })).toBe(true);
		expect(isInstagramVisit({ search: "?utm_source=IG", referrer: "" })).toBe(true);
		expect(isInstagramVisit({ search: "?utm_source=google", referrer: "" })).toBe(false);
		expect(isInstagramVisit({ search: "", referrer: "" })).toBe(false);
	});

	it("reconoce la referencia que deja el navegador de la app", () => {
		expect(isInstagramVisit({ search: "", referrer: "https://l.instagram.com/?u=https%3A%2F%2Fgodcode.me" })).toBe(true);
		expect(isInstagramVisit({ search: "", referrer: "https://www.instagram.com/" })).toBe(true);
		expect(isInstagramVisit({ search: "", referrer: "https://notinstagram.com/" })).toBe(false);
		expect(isInstagramVisit({ search: "", referrer: "no es una url" })).toBe(false);
	});
});
