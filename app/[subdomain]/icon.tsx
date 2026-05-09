import { ImageResponse } from "next/og";

import { getCachedCompany } from "../../utils/tenant-cache";

export const runtime = "edge";

const getInitials = (name: string) => {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
	return initials.join("") || "GC";
};

const normalizeColor = (value: string | null | undefined, fallback: string) => {
	if (!value) return fallback;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
};

export default async function Icon(
	_request: Request,
	context: { params: Promise<{ subdomain: string }> },
) {
	const { subdomain } = await context.params;
	const company = await getCachedCompany(subdomain);
	const theme = (company?.theme_config as Record<string, unknown> | null | undefined) ?? null;
	const status = company?.subscription_status?.toLowerCase();
	const isUnavailable = status === "suspended" || status === "cancelled";

	const displayName =
		isUnavailable
			? "GodCode"
			: typeof theme?.displayName === "string" && theme.displayName.trim()
				? theme.displayName.trim()
				: company?.name || "GodCode";

	const primaryColor = normalizeColor(
		typeof theme?.primaryColor === "string" ? theme.primaryColor : null,
		"#111827",
	);
	const secondaryColor = normalizeColor(
		typeof theme?.secondaryColor === "string" ? theme.secondaryColor : null,
		primaryColor,
	);
	const initials = getInitials(displayName);

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
					color: "#ffffff",
					fontFamily: "Arial, sans-serif",
					fontWeight: 800,
					fontSize: 30,
					borderRadius: 18,
				}}
				>
				{initials}
			</div>
		),
		{ width: 64, height: 64 },
	);
}