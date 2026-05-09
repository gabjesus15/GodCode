import { NextResponse } from "next/server";
import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { getCachedCompany } from "@/utils/tenant-cache";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await context.params;
  const company = await getCachedCompany(subdomain);
  const versionSeed = company ? tenantBrandingIconVersionSeed(company) : subdomain;
  const target = `/${subdomain}/tenant-favicon?v=${encodeURIComponent(String(versionSeed))}`;
  return NextResponse.redirect(target, 302);
}
