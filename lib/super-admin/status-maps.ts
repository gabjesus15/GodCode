import {
	describeStatus,
	ONBOARDING_STATUSES,
	PAYMENT_STATUSES,
	SUBSCRIPTION_STATUSES,
	TICKET_PRIORITIES,
	TICKET_STATUSES,
	type StatusTone,
} from "@/lib/status/status-labels";

/** Badges del super admin. Los nombres salen del mapa común (`lib/status/status-labels`). */

export type BadgeVariant = StatusTone;

export interface StatusBadgeConfig {
	label: string;
	variant: BadgeVariant;
}

function toBadge(descriptor: { label: string; tone: StatusTone }): StatusBadgeConfig {
	return { label: descriptor.label, variant: descriptor.tone };
}

export function companySubscriptionStatus(status: string | null | undefined): StatusBadgeConfig {
	return toBadge(describeStatus(SUBSCRIPTION_STATUSES, status, "Sin estado"));
}

export function ticketStatus(status: string | null | undefined): StatusBadgeConfig {
	return toBadge(describeStatus(TICKET_STATUSES, status));
}

export function ticketPriority(priority: string | null | undefined): StatusBadgeConfig {
	return toBadge(describeStatus(TICKET_PRIORITIES, priority, "Sin prioridad"));
}

export function onboardingStatus(status: string | null | undefined): StatusBadgeConfig {
	return toBadge(describeStatus(ONBOARDING_STATUSES, status));
}

export function paymentStatus(status: string | null | undefined): StatusBadgeConfig {
	return toBadge(describeStatus(PAYMENT_STATUSES, status, "Sin pago"));
}


