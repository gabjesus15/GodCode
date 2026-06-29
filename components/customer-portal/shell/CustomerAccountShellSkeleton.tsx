"use client";

import { Skeleton, SkeletonStatCard } from "../ui/Skeleton";
import { PORTAL_TAB_ORDER } from "../shared/customer-account-constants";

export function CustomerAccountShellSkeleton() {
	return (
		<div className="min-h-screen bg-[#fbfbfd]">
			<div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:py-5 md:flex-row md:gap-6 md:px-5 lg:px-8">
				<aside className="hidden w-60 shrink-0 md:block">
					<div className="rounded-2xl border border-[#e5e5ea] bg-white p-5 shadow-sm">
						<Skeleton className="mb-5 h-8 w-32" />
						<div className="space-y-2">
							{PORTAL_TAB_ORDER.map((key) => (
								<Skeleton key={key} className="h-10 w-full" />
							))}
						</div>
					</div>
				</aside>
				<div className="flex min-w-0 flex-1 flex-col gap-4">
					<div className="rounded-2xl border border-[#e5e5ea] bg-white px-5 py-4 shadow-sm">
						<Skeleton className="h-7 w-48" />
						<Skeleton className="mt-2 h-4 w-32" />
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<SkeletonStatCard />
						<SkeletonStatCard />
						<SkeletonStatCard />
					</div>
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		</div>
	);
}
