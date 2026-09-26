"use client";

import { MapPin } from "lucide-react";

import type { BranchInfo, BranchModalItem } from "./menu-types";

export function buildModalBranchItems(
	branches: BranchInfo[],
	openBranchIds: string[] | undefined,
	hasOpenBranches: boolean,
	/** Textos de la insignia ya traducidos (antes iba «ABIERTO»/«CERRADO» fijo en español). */
	labels: { open: string; closed: string },
): BranchModalItem[] {
	const branchesWithOpenCaja = (openBranchIds ?? []).map(String);

	return [...branches]
		.sort((a, b) => {
			const aOpen = branchesWithOpenCaja.includes(String(a.id));
			const bOpen = branchesWithOpenCaja.includes(String(b.id));
			if (aOpen === bOpen) return 0;
			return aOpen ? -1 : 1;
		})
		.map((branch) => {
			const isOpen = branchesWithOpenCaja.includes(String(branch.id));
			return {
				...branch,
				name: (
					<div className="branch-item-row">
						<div className="branch-name-group">
							<MapPin size={18} className={`branch-pin-icon ${isOpen ? "icon-open" : "icon-closed"}`} />
							<span className="branch-item-name">{branch.name}</span>
						</div>
						<span className={`branch-status-badge ${isOpen ? "status-open" : "status-closed"}`}>
							{isOpen ? <span className="status-dot" /> : null}
							{isOpen ? labels.open : labels.closed}
						</span>
					</div>
				),
				disabled: hasOpenBranches ? !isOpen : false,
			};
		});
}
