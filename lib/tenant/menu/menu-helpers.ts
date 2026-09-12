export const FIRE_ICON = "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif";

export function isPromocionesCategoryName(name: string | null | undefined): boolean {
	const normalized = String(name || "")
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
	return (
		normalized === "promociones" ||
		normalized === "promocion" ||
		normalized === "promos" ||
		normalized === "promo"
	);
}

export function resolveHomeCategoryId(
	specialProductsCount: number,
	visibleCategoryIds: string[],
): string | null {
	if (specialProductsCount > 0) return "special";
	return visibleCategoryIds[0] ?? null;
}

export function shouldShowBottomNav(cardStyle: string, navbarType: string): boolean {
	return cardStyle === "layout-food" || navbarType === "floating-bottom";
}

export type BranchSelectorPlacement = "navbar" | "bottom-nav";

/**
 * Donde vive el selector de sucursal.
 *
 * Ocupaba una linea fija bajo el nombre del local en el header. Con la barra
 * inferior a la vista baja alli, y el nombre se queda con la linea entera.
 *
 * La regla es excluyente a proposito: sale en un sitio o en el otro, nunca en
 * los dos ni en ninguno. Dos selectores para el mismo estado es un fallo de
 * interfaz; cero deja al cliente sin poder cambiar de local.
 */
export function resolveBranchSelectorPlacement(showBottomNav: boolean): BranchSelectorPlacement {
	return showBottomNav ? "bottom-nav" : "navbar";
}

export type MenuCartUiMode = "none" | "bottom-nav" | "float-with-modal" | "bottom-nav-only";

export function resolveMenuCartUiMode(input: {
	hasBranch: boolean;
	onlineOrderingEnabled: boolean | undefined;
	showBottomNav: boolean;
}): MenuCartUiMode {
	if (!input.hasBranch) return "none";
	if (input.onlineOrderingEnabled !== false) {
		return input.showBottomNav ? "bottom-nav" : "float-with-modal";
	}
	return input.showBottomNav ? "bottom-nav-only" : "none";
}

/**
 * Resuelve la sucursal activa del menú público.
 * - Respeta `?branch=` si es válida (y abierta, cuando hay cajas abiertas).
 * - Si no hay query y la elección es inequívoca (1 caja abierta, o 1 sucursal
 *   sin cajas abiertas), la auto-selecciona para habilitar el carrito.
 * - Si hay `?branch=` inválida/cerrada, no fuerza otra (el modal pide elegir).
 */
export function resolveSelectedMenuBranch<T extends { id: string }>(input: {
	branches: T[];
	openBranchIds: string[];
	requestedBranchId?: string | null;
}): T | null {
	const branches = Array.isArray(input.branches) ? input.branches : [];
	const openSet = new Set((input.openBranchIds ?? []).map(String).filter(Boolean));
	const hasOpen = openSet.size > 0;
	const requestedId = input.requestedBranchId ? String(input.requestedBranchId) : "";
	const requested = requestedId
		? branches.find((branch) => String(branch.id) === requestedId) ?? null
		: null;

	if (requestedId) {
		if (requested && (!hasOpen || openSet.has(String(requested.id)))) {
			return requested;
		}
		return null;
	}

	if (hasOpen && openSet.size === 1) {
		const onlyOpenId = [...openSet][0];
		return branches.find((branch) => String(branch.id) === onlyOpenId) ?? null;
	}

	if (!hasOpen && branches.length === 1) {
		return branches[0] ?? null;
	}

	return null;
}

export type BranchContactChannel = "whatsapp" | "instagram" | "location";

export type BranchContactSource = {
	id: string;
	whatsapp_url?: string | null;
	instagram_url?: string | null;
	map_url?: string | null;
};

export function branchHasContactChannel(
	branch: BranchContactSource,
	channel: BranchContactChannel,
): boolean {
	if (channel === "whatsapp") return Boolean(String(branch.whatsapp_url ?? "").trim());
	if (channel === "instagram") return Boolean(String(branch.instagram_url ?? "").trim());
	return Boolean(String(branch.map_url ?? "").trim());
}

export function getBranchesForContact(
	branches: BranchContactSource[],
	selectedBranchId?: string | null,
): BranchContactSource[] {
	if (selectedBranchId) {
		const selected = branches.filter((branch) => branch.id === selectedBranchId);
		if (selected.length > 0) return selected;
	}
	return branches;
}

export function getAvailableContactChannels(
	branches: BranchContactSource[],
	selectedBranchId?: string | null,
): BranchContactChannel[] {
	const pool = getBranchesForContact(branches, selectedBranchId);
	const channels: BranchContactChannel[] = [];
	if (pool.some((branch) => branchHasContactChannel(branch, "whatsapp"))) channels.push("whatsapp");
	if (pool.some((branch) => branchHasContactChannel(branch, "instagram"))) channels.push("instagram");
	if (pool.some((branch) => branchHasContactChannel(branch, "location"))) channels.push("location");
	return channels;
}

export function shouldShowContactTab(
	branches: BranchContactSource[],
	selectedBranchId?: string | null,
): boolean {
	return getAvailableContactChannels(branches, selectedBranchId).length > 0;
}

export function openBranchContactUrl(
	branch: BranchContactSource,
	channel: BranchContactChannel,
): void {
	const url =
		channel === "whatsapp"
			? branch.whatsapp_url
			: channel === "instagram"
				? branch.instagram_url
				: branch.map_url;
	const normalized = String(url ?? "").trim();
	if (!normalized) return;
	window.open(normalized, "_blank", "noopener,noreferrer");
}

export function getBranchesWithContactChannel(
	branches: BranchContactSource[],
	channel: BranchContactChannel,
	selectedBranchId?: string | null,
): BranchContactSource[] {
	return getBranchesForContact(branches, selectedBranchId).filter((branch) =>
		branchHasContactChannel(branch, channel),
	);
}

export type ContactFlowStep =
	| { type: "direct"; channel: BranchContactChannel; branch: BranchContactSource }
	| { type: "pick-channel" }
	| { type: "pick-branch"; channel: BranchContactChannel };

export function resolveContactFlowStep(
	branches: BranchContactSource[],
	selectedBranchId?: string | null,
): ContactFlowStep | null {
	const channels = getAvailableContactChannels(branches, selectedBranchId);
	if (channels.length === 0) return null;
	if (channels.length > 1) return { type: "pick-channel" };

	const channel = channels[0];
	const eligible = getBranchesWithContactChannel(branches, channel, selectedBranchId);
	if (eligible.length === 1) {
		return { type: "direct", channel, branch: eligible[0] };
	}
	return { type: "pick-branch", channel };
}

// Palabras que deben ir en minúscula en títulos en español (salvo si son la primera palabra)
const SPANISH_LOWER_WORDS = new Set([
	"de", "del", "la", "las", "el", "los", "en", "con", "sin", "y", "e", "o", "u", "a", "al", "por", "para",
]);

// Acrónimos comunes, medidas y números romanos que deben mantenerse en mayúsculas
const UPPER_ACRONYMS = new Set([
	"BBQ", "IPA", "DOP", "DOC", "BLT", "KCAL", "VIP", "USA", "USD", "CLP", "UF",
	"XL", "XXL", "XXXL", "XS",
	"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
]);

function isAllUpperLetters(str: string): boolean {
	const lettersOnly = str.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, "");
	if (!lettersOnly) return false;
	return lettersOnly === lettersOnly.toUpperCase();
}

function isAllLowerLetters(str: string): boolean {
	const lettersOnly = str.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, "");
	if (!lettersOnly) return false;
	return lettersOnly === lettersOnly.toLowerCase();
}

function formatWord(word: string, index: number, totalWords: number): string {
	if (!word) return "";

	if (word.includes("-")) {
		return word
			.split("-")
			.map((part, i) => formatWord(part, index === 0 && i === 0 ? 0 : 1, totalWords))
			.join("-");
	}
	if (word.includes("/")) {
		return word
			.split("/")
			.map((part, i) => formatWord(part, index === 0 && i === 0 ? 0 : 1, totalWords))
			.join("/");
	}

	const match = word.match(/^([^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]*)(.*?)([^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]*)$/);
	if (match) {
		const [, prefix, core, suffix] = match;
		if (!core) return word;

		const coreUpper = core.toUpperCase();
		const coreLower = core.toLowerCase();

		if (UPPER_ACRONYMS.has(coreUpper)) {
			return prefix + coreUpper + suffix;
		}

		if (/^\d+[xX]\d+$/.test(core)) {
			return prefix + coreUpper + suffix;
		}

		if (/^\d+(ml|cc|gr|kg|g|l|oz|pcs|pz|cm)$/i.test(core)) {
			return prefix + coreLower + suffix;
		}

		if (index > 0 && index < totalWords - 1 && SPANISH_LOWER_WORDS.has(coreLower)) {
			return prefix + coreLower + suffix;
		}

		const capitalized = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
		return prefix + capitalized + suffix;
	}

	return word;
}

/**
 * Normaliza nombres de categorías y productos que fueron ingresados en MAYÚSCULAS sostenidas
 * o minúsculas a un formato Capitalizado elegante y legible, preservando casos mixtos ya formateados.
 */
export function formatMenuTitle(title: string | null | undefined): string {
	if (!title || typeof title !== "string") return title || "";
	const trimmed = title.trim();
	if (!trimmed) return "";

	if (!isAllUpperLetters(trimmed) && !isAllLowerLetters(trimmed)) {
		return trimmed;
	}

	const words = trimmed.split(/\s+/);
	return words.map((word, idx) => formatWord(word, idx, words.length)).join(" ");
}

/**
 * Normaliza descripciones de productos escritas en MAYÚSCULAS sostenidas a tipo oración (Sentence case).
 */
export function formatMenuDescription(desc: string | null | undefined): string {
	if (!desc || typeof desc !== "string") return desc || "";
	const trimmed = desc.trim();
	if (!trimmed) return "";

	if (!isAllUpperLetters(trimmed)) {
		return trimmed;
	}

	return trimmed
		.toLowerCase()
		.replace(/(^\s*|[.!?]\s+)([a-záéíóúñü])/g, (m, p1, p2) => p1 + p2.toUpperCase())
		.replace(/\b(bbq|ipa|xl|xxl|2x1|3x2)\b/gi, (m) => m.toUpperCase());
}
