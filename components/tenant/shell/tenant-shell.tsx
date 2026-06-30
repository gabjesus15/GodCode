"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

interface TenantShellProps {
	children: React.ReactNode;
}

function resetShellInlineStyles() {
	document.body.style.removeProperty("zoom");
	document.body.style.overflowX = "";

	const contentLayer = document.getElementById("app-content-layer");
	if (contentLayer) {
		contentLayer.style.transform = "";
		contentLayer.style.transformOrigin = "";
		contentLayer.style.width = "";
		contentLayer.style.height = "";
		contentLayer.style.minHeight = "";
		contentLayer.style.maxWidth = "";
	}

	const uiLayer = document.getElementById("app-ui-layer");
	if (uiLayer) {
		uiLayer.style.transform = "";
		uiLayer.style.transformOrigin = "";
		uiLayer.style.position = "";
		uiLayer.style.top = "";
		uiLayer.style.left = "";
		uiLayer.style.width = "";
		uiLayer.style.height = "";
		uiLayer.style.pointerEvents = "";
		uiLayer.style.zIndex = "";
	}
}

export function TenantShell({ children }: TenantShellProps) {
	const pathname = usePathname();
	const normalizedPath = String(pathname || "").toLowerCase();
	const hideMenuPatternLayer = normalizedPath.endsWith("/login") || normalizedPath.endsWith("/admin");

	useEffect(() => {
		resetShellInlineStyles();

		const uiLayer = document.getElementById("app-ui-layer");
		if (!uiLayer) return;

		uiLayer.style.position = "fixed";
		uiLayer.style.top = "0";
		uiLayer.style.left = "0";
		uiLayer.style.width = "100%";
		uiLayer.style.height = "100%";
		uiLayer.style.pointerEvents = "none";
		uiLayer.style.zIndex = "9999";

		return () => {
			resetShellInlineStyles();
		};
	}, [pathname]);

	return (
		<div className="tenant-shell-root">
			<div
				className={`app-bg-layer tenant-shell-bg-layer ${hideMenuPatternLayer ? "is-hidden" : ""}`}
			/>

			<div id="app-content-layer" className="app-wrapper tenant-content-layer">
				{children}
			</div>

			<div id="app-ui-layer" className="tenant-ui-layer">
				<div id="navbar-portal-root" className="tenant-portal-navbar" />
				<div id="cart-portal-root" className="tenant-portal-cart" />
				<div id="modal-root" className="tenant-portal-modal" />
			</div>
		</div>
	);
}
