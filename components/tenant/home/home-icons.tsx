import type { SVGProps } from "react";
import {
	Bike,
	BookOpen,
	CalendarDays,
	Gift,
	Globe,
	Link as LinkIcon,
	Mail,
	MapPin,
	Phone,
	Star,
	type LucideIcon,
} from "lucide-react";

import type { HomeSocialPlatform, ResolvedHomeLinkIcon } from "@/lib/tenant/home-page/home-page-config";

/*
 * Marcas: lucide ya no trae logos de redes, así que van dibujadas aquí, rellenas
 * y en la misma caja de 24 que los íconos de trazo para que pesen igual.
 */

type GlyphProps = SVGProps<SVGSVGElement> & { size?: number };

function Glyph({ size = 22, children, ...props }: GlyphProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false" {...props}>
			{children}
		</svg>
	);
}

export function WhatsAppGlyph(props: GlyphProps) {
	return (
		<Glyph {...props}>
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.938 3.658 1.434 5.71 1.435h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413z" />
		</Glyph>
	);
}

export function InstagramGlyph(props: GlyphProps) {
	return (
		<Glyph {...props}>
			<path
				fillRule="evenodd"
				d="M7.2 2h9.6A5.2 5.2 0 0 1 22 7.2v9.6a5.2 5.2 0 0 1-5.2 5.2H7.2A5.2 5.2 0 0 1 2 16.8V7.2A5.2 5.2 0 0 1 7.2 2Zm0 1.9a3.3 3.3 0 0 0-3.3 3.3v9.6a3.3 3.3 0 0 0 3.3 3.3h9.6a3.3 3.3 0 0 0 3.3-3.3V7.2a3.3 3.3 0 0 0-3.3-3.3H7.2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.9a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z"
			/>
			<circle cx="17.35" cy="6.65" r="1.25" />
		</Glyph>
	);
}

export function TikTokGlyph(props: GlyphProps) {
	return (
		<Glyph {...props}>
			<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
		</Glyph>
	);
}

export function FacebookGlyph(props: GlyphProps) {
	return (
		<Glyph {...props}>
			<path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
		</Glyph>
	);
}

export function YouTubeGlyph(props: GlyphProps) {
	return (
		<Glyph {...props}>
			<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
		</Glyph>
	);
}

export function XGlyph(props: GlyphProps) {
	return (
		<Glyph {...props}>
			<path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
		</Glyph>
	);
}

const STROKE_ICONS: Partial<Record<ResolvedHomeLinkIcon, LucideIcon>> = {
	link: LinkIcon,
	menu: BookOpen,
	delivery: Bike,
	reviews: Star,
	calendar: CalendarDays,
	gift: Gift,
	mail: Mail,
	phone: Phone,
	location: MapPin,
};

const BRAND_GLYPHS: Partial<Record<ResolvedHomeLinkIcon, (props: GlyphProps) => React.JSX.Element>> = {
	whatsapp: WhatsAppGlyph,
	instagram: InstagramGlyph,
	tiktok: TikTokGlyph,
	facebook: FacebookGlyph,
	youtube: YouTubeGlyph,
	x: XGlyph,
};

export function HomeLinkIconGlyph({ icon, size = 22 }: { icon: ResolvedHomeLinkIcon; size?: number }) {
	const Brand = BRAND_GLYPHS[icon];
	if (Brand) return <Brand size={size} />;
	const Stroke = STROKE_ICONS[icon] ?? LinkIcon;
	return <Stroke size={size} strokeWidth={2} aria-hidden focusable="false" />;
}

const SOCIAL_ICON: Record<HomeSocialPlatform, ResolvedHomeLinkIcon | "website"> = {
	instagram: "instagram",
	tiktok: "tiktok",
	facebook: "facebook",
	youtube: "youtube",
	x: "x",
	whatsapp: "whatsapp",
	email: "mail",
	website: "website",
};

export function HomeSocialGlyph({ platform, size = 22 }: { platform: HomeSocialPlatform; size?: number }) {
	const icon = SOCIAL_ICON[platform];
	if (icon === "website") return <Globe size={size} strokeWidth={2} aria-hidden focusable="false" />;
	return <HomeLinkIconGlyph icon={icon} size={size} />;
}
