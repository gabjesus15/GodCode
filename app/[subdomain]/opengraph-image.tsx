import { ImageResponse } from 'next/og';
import { getCachedCompany } from '../../utils/tenant-cache';

export const runtime = 'edge';
export const alt = 'Menú Digital';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface OGThemeConfig {
	primaryColor?: string;
	displayName?: string;
	logoUrl?: string;
	imageUrl?: string;
}

export default async function Image({ params }: { params: Promise<{ subdomain: string }> }) {
	const { subdomain } = await params;
	const company = await getCachedCompany(subdomain);
	const theme: OGThemeConfig = (company?.theme_config as unknown as OGThemeConfig) || {};
	const primaryColor = theme.primaryColor ?? '#111827';
	const name = theme.displayName ?? company?.name ?? 'GodCode';
	const logoUrl = theme.logoUrl ?? theme.imageUrl;

	return new ImageResponse(
		(
			<div className="relative flex h-full w-full flex-col items-center justify-center bg-[#0a0a0a]">
				<div className="absolute inset-0 opacity-30">
					<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="600" cy="315" r="380" fill={primaryColor} />
					</svg>
				</div>
				{/* Decoración de fondo */}
				<div className="absolute left-10 top-10 flex opacity-20">
					<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="1">
						<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
						<path d="M7 2v20" />
						<path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
					</svg>
				</div>

				<div className="z-10 flex flex-col items-center justify-center rounded-[30px] border border-[#334155] bg-white/5 px-[60px] py-10">
					{logoUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={logoUrl}
							alt="Logo"
							width={180}
							height={180}
							className="mb-[30px] rounded-[40px] object-cover"
						/>
					) : null}
					<h1 className="m-0 text-center text-[70px] font-extrabold text-white">
						{name}
					</h1>
					<p className="mt-[10px] text-[32px] text-slate-400">Menú Digital • Pedidos Online</p>
				</div>
				
				<div className="absolute bottom-10 right-10 flex text-[24px] font-semibold text-slate-600">
					godcode.me
				</div>
			</div>
		),
		{ ...size }
	);
}