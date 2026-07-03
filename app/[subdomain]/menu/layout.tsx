import type { ReactNode } from "react";

import "../styles/App.css";
import "../styles/Menu.css";
import "../styles/ProductCard.css";
import "../styles/Navbar.css";
import "../styles/HeroCarousel.css";
import "../styles/ProductCardLayouts.css";
import "@/app/[subdomain]/styles/BottomNavbar.css";

export default function TenantMenuLayout({ children }: { children: ReactNode }) {
	return children;
}
