export type DeletePolicyInput = {
	status: string | null;
	companyId: string | null;
	paymentStatus: string | null;
	referenceFileUrl: string | null;
};

/** Decide si una solicitud de alta se puede eliminar y, si no, el motivo que ve el super admin. */
export function getDeletePolicy(input: DeletePolicyInput): { canDelete: boolean; reason: string | null } {
	if (input.companyId) {
		return { canDelete: false, reason: "La solicitud ya fue convertida en empresa" };
	}

	const status = String(input.status ?? "").trim().toLowerCase();
	const paymentStatus = String(input.paymentStatus ?? "").trim().toLowerCase();
	const hasProof = Boolean((input.referenceFileUrl ?? "").trim());

	if (status === "active" || status === "payment_validated") {
		return { canDelete: false, reason: "La solicitud ya está activada" };
	}

	if (paymentStatus === "paid") {
		return { canDelete: false, reason: "La solicitud tiene un pago aprobado" };
	}

	if (paymentStatus === "pending_validation" || hasProof) {
		return { canDelete: false, reason: "La solicitud tiene un pago en revisión" };
	}

	const allowedStatuses = new Set(["pending_verification", "email_verified", "form_completed", "rejected", "payment_pending"]);
	if (!allowedStatuses.has(status)) {
		return { canDelete: false, reason: "Estado no elegible para eliminación" };
	}

	return { canDelete: true, reason: null };
}
