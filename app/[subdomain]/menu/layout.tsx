import type { ReactNode } from "react";

import "../styles/App.css";
import "../styles/Menu.css";
import "../styles/ProductCard.css";
import "../styles/Navbar.css";
import "../styles/HeroCarousel.css";
import "../styles/ProductCardLayouts.css";
/**
 * El menu monta `LazyBranchSelectorModal` (menu-client-view) y los modales de
 * contacto, pero esta hoja solo se importaba en la home del tenant. Sin ella el
 * modal salia sin estilar: `.branch-modal-overlay` quedaba en `position: static`
 * con `z-index: auto`, asi que se apilaba al principio del documento, el header
 * fijo (z-index 10000) lo tapaba y su texto se transparentaba a traves del 6%
 * que deja pasar el header. En un tenant con varias sucursales el cliente veia
 * un fantasma de "Elige tu Sucursal" y no podia pulsarlo: los clics llegaban a
 * los iconos de categoria que tenia encima.
 */
import "../styles/BranchSelectorModal.css";
import "@/app/[subdomain]/styles/BottomNavbar.css";

export default function TenantMenuLayout({ children }: { children: ReactNode }) {
	return children;
}
