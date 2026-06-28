import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { computeCouponDiscountAmount } from "@/lib/discount/compute-coupon-discount";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const bodySchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().min(1).max(80),
  subtotal: z.number().finite().nonnegative(),
  clientPhone: z.string().max(40).optional().nullable(),
});

function coalescePhoneEq(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "") === (b ?? "");
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false as const, error: "bad_request" }, { status: 400 });
    }
    const { branchId, code, subtotal, clientPhone } = parsed.data;

    const { data: branch, error: branchErr } = await supabaseAdmin
      .from("branches")
      .select("company_id")
      .eq("id", branchId)
      .maybeSingle();

    if (branchErr || !branch?.company_id) {
      return NextResponse.json({ ok: false as const, error: "branch_not_found" }, { status: 404 });
    }

    const companyId = String(branch.company_id);
    const codeNorm = code.trim().toUpperCase();

    const { data: coupons, error: couponErr } = await supabaseAdmin
      .from("discount_coupons")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true);

    if (couponErr) {
      return NextResponse.json({ ok: false as const, error: "server" }, { status: 500 });
    }

    const coupon = (coupons ?? []).find((c) => String(c.code ?? "").trim().toUpperCase() === codeNorm);
    if (!coupon) {
      return NextResponse.json({ ok: false as const, error: "invalid_coupon" });
    }

    const now = Date.now();
    if (coupon.valid_from != null && new Date(String(coupon.valid_from)).getTime() > now) {
      return NextResponse.json({ ok: false as const, error: "coupon_expired" });
    }
    if (coupon.valid_until != null && new Date(String(coupon.valid_until)).getTime() < now) {
      return NextResponse.json({ ok: false as const, error: "coupon_expired" });
    }

    const minSub = Number(coupon.min_order_subtotal ?? 0);
    if (!Number.isFinite(minSub) || subtotal + 1e-9 < minSub) {
      return NextResponse.json({
        ok: false as const,
        error: "coupon_min_subtotal",
        minSubtotal: Math.round(minSub),
      });
    }

    const trimmedPhone = (clientPhone ?? "").trim();

    if (coupon.scope === "client_only") {
      if (!trimmedPhone) {
        return NextResponse.json({ ok: false as const, error: "coupon_phone_required" });
      }
      const { data: clientRow } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("company_id", companyId)
        .eq("phone", trimmedPhone)
        .maybeSingle();

      const restricted = coupon.restricted_client_id != null ? String(coupon.restricted_client_id) : null;
      if (!clientRow?.id || !restricted || String(clientRow.id) !== restricted) {
        return NextResponse.json({ ok: false as const, error: "coupon_wrong_client" });
      }
    }

    const maxRedemptions = coupon.max_redemptions != null ? Number(coupon.max_redemptions) : null;
    const redemptionCount = Number(coupon.redemptions_count ?? 0);
    if (maxRedemptions != null && Number.isFinite(maxRedemptions) && redemptionCount >= maxRedemptions) {
      return NextResponse.json({ ok: false as const, error: "coupon_usage_exhausted" });
    }

    const maxPerClient = Number(coupon.max_redemptions_per_client ?? 0);
    if (Number.isFinite(maxPerClient) && maxPerClient > 0) {
      const { data: reds } = await supabaseAdmin
        .from("discount_coupon_redemptions")
        .select("client_phone")
        .eq("coupon_id", coupon.id);

      const countClient =
        reds?.filter((r) => coalescePhoneEq(r.client_phone as string | null, trimmedPhone)).length ?? 0;
      if (countClient >= maxPerClient) {
        return NextResponse.json({ ok: false as const, error: "coupon_usage_exhausted_client" });
      }
    }

    const discountRaw = computeCouponDiscountAmount(
      subtotal,
      String(coupon.discount_type),
      coupon.discount_value,
    );
    const discountAmount = Math.round(discountRaw * 100) / 100;
    if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
      return NextResponse.json({ ok: false as const, error: "invalid_coupon" });
    }

    return NextResponse.json({
      ok: true as const,
      code: String(coupon.code).trim(),
      normalizedCode: codeNorm,
      discountAmount,
      discountType: String(coupon.discount_type),
    });
  } catch {
    return NextResponse.json({ ok: false as const, error: "server" }, { status: 500 });
  }
}
