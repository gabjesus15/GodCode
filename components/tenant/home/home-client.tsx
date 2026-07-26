"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Settings, QrCode } from "lucide-react";
import Image from "next/image";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";

import { LazyContactBranchModal } from "@/lib/tenant/lazy/tenant-dynamic";
import { getAppUrl } from "@/lib/tenant/app-url";
import { getTenantScopedPath } from "../utils/tenant-route";

interface BranchInfo {
  id: string;
  name: string | null;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  map_url?: string | null;
}

const MenuBookIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M8 6h7M8 10h7M8 14h5" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M8.88595 7.16985C9.06891 7.17475 9.27175 7.18465 9.46474 7.61303C9.59271 7.89821 9.80829 8.42321 9.9839 8.85087C10.1206 9.18366 10.233 9.45751 10.2611 9.51356C10.3254 9.64156 10.365 9.78926 10.2809 9.96156C10.271 9.98188 10.2617 10.0013 10.2526 10.02C10.1852 10.16 10.1372 10.2597 10.0237 10.3899C9.97709 10.4435 9.9285 10.5022 9.88008 10.5607C9.79494 10.6636 9.71035 10.7658 9.63785 10.838C9.50924 10.9659 9.37563 11.1039 9.52402 11.3599C9.6725 11.6159 10.1919 12.4579 10.9587 13.1373C11.783 13.8712 12.4998 14.1805 12.8622 14.3368C12.9325 14.3672 12.9895 14.3918 13.0313 14.4126C13.2886 14.5406 13.4419 14.5209 13.5903 14.3486C13.7388 14.1762 14.2334 13.6001 14.4066 13.3441C14.5748 13.0881 14.7479 13.1275 14.9854 13.2161C15.2228 13.3047 16.4892 13.9251 16.7464 14.0531C16.7972 14.0784 16.8448 14.1012 16.8889 14.1224C17.0678 14.2082 17.1895 14.2665 17.2411 14.3535C17.3054 14.4618 17.3054 14.9739 17.0927 15.5746C16.8751 16.1752 15.8263 16.7513 15.3514 16.7956C15.3064 16.7999 15.2617 16.8053 15.2156 16.8108C14.7804 16.8635 14.228 16.9303 12.2596 16.1555C9.83424 15.2018 8.23322 12.8354 7.90953 12.357C7.88398 12.3192 7.86638 12.2932 7.85698 12.2806L7.8515 12.2733C7.70423 12.0762 6.80328 10.8707 6.80328 9.62685C6.80328 8.43682 7.38951 7.81726 7.65689 7.53467C7.67384 7.51676 7.6895 7.50021 7.70366 7.48494C7.94107 7.22895 8.21814 7.16495 8.39125 7.16495C8.56445 7.16495 8.73756 7.16495 8.88595 7.16985Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M2.18418 21.3314C2.10236 21.6284 2.37285 21.9025 2.6709 21.8247L7.27824 20.6213C8.7326 21.409 10.37 21.8275 12.0371 21.8275H12.0421C17.5281 21.8275 22 17.3815 22 11.9163C22 9.26735 20.966 6.77594 19.0863 4.90491C17.2065 3.03397 14.7084 2 12.042 2C6.55607 2 2.08411 6.44605 2.08411 11.9114C2.08348 13.65 2.5424 15.3582 3.41479 16.8645L2.18418 21.3314ZM4.86092 17.2629C4.96774 16.8752 4.91437 16.4608 4.71281 16.1127C3.97266 14.8348 3.58358 13.3855 3.58411 11.9114C3.58411 7.28158 7.37738 3.5 12.042 3.5C14.3119 3.5 16.5053 4.38287 18.0619 5.93952C19.6186 7.49618 20.5015 9.68953 20.5015 11.9614C20.5015 16.5912 16.7082 20.3727 12.0784 20.3727C10.597 20.3727 9.14175 19.988 7.87635 19.2621L7.75373 19.1915L3.92317 20.187L4.86092 17.2629Z" />
  </svg>
);

const InstagramIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const MapPinIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);


interface HomeClientProps {
  publicSlug: string;
  name: string;
  logoUrl?: string | null;
  schedule?: string | null;
  branches: BranchInfo[];
}

export function HomeClient(props: HomeClientProps) {
  const { name, logoUrl, schedule, branches } = props;
    // Estado para detectar mobile
    const [showQR, setShowQR] = useState(true);

    useEffect(() => {
      const handleResize = () => {
        setShowQR(window.innerWidth >= 850);
      };
      handleResize(); // Inicial
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
  const router = useRouter();
  const pathname = usePathname();
  
  const menuPath = useMemo(
    () => getTenantScopedPath(pathname ?? "/", "/menu"),
    [pathname]
  );

  const panelBase = (process.env.NEXT_PUBLIC_TENANT_PANEL_URL ?? "").replace(/\/$/, "");
  const loginPath = useMemo(() => {
    if (panelBase) {
      return `${panelBase}/`;
    }
    return getTenantScopedPath(pathname ?? "/", "/login");
  }, [pathname, panelBase]);

  // Estados de UI
  const [showModal, setShowModal] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
  // Tipado estricto: Eliminamos "menu" porque esa acción ya no abre este modal
  type ActionType = "whatsapp" | "instagram" | "location";
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);

  // Generación de URL segura para el QR
  const [menuUrl, setMenuUrl] = useState("");

  useEffect(() => {
    setMenuUrl(`${window.location.origin}${menuPath}`);
  }, [menuPath]);

  // Función separada para ejecutar la acción y mantener el código limpio
  const executeAction = useCallback((action: ActionType, branch: BranchInfo) => {
    try {
      switch (action) {
        case "whatsapp":
          if (branch.whatsapp_url) {
            window.open(branch.whatsapp_url, "_blank", "noopener,noreferrer");
          }
          break;
        case "instagram":
          if (branch.instagram_url) {
            window.open(branch.instagram_url, "_blank", "noopener,noreferrer");
          }
          break;
        case "location":
          if (branch.map_url) {
            window.open(branch.map_url, "_blank", "noopener,noreferrer");
          }
          break;
      }
    } catch {
      // Error handling silently
    }
  }, []);

  // Manejador centralizado para botones que SÍ abren el modal (Contacto/Ubicación)
  const handleActionClick = useCallback((action: ActionType) => {
    // Filtrar las sucursales que tienen la URL configurada para esta acción
    const activeBranches = branches.filter(b => {
      if (action === "whatsapp") return !!b.whatsapp_url;
      if (action === "instagram") return !!b.instagram_url;
      if (action === "location") return !!b.map_url;
      return false;
    });

    if (activeBranches.length === 0) return;

    setPendingAction(action);
    setShowModal(true);
  }, [branches]);

  // Manejador de selección cuando el usuario elige en el modal
  const handleBranchSelect = (branch: BranchInfo | null) => {
    setShowModal(false);
    
    if (branch && pendingAction) {
      executeAction(pendingAction, branch);
    }
    
    setPendingAction(null);
  };

  // Configuración de botones dinámica
  const buttons = useMemo((): Array<{
    label: string;
    icon: ReactNode;
    onClick: () => void;
    primary?: boolean;
    ariaLabel?: string;
  }> => {
    const list: Array<{
      label: string;
      icon: ReactNode;
      onClick: () => void;
      primary?: boolean;
      ariaLabel?: string;
    }> = [
      {
        label: "Ver Menú Digital",
        icon: <MenuBookIcon />,
        // AL HACER CLIC, VA DIRECTO AL MENÚ SIN ABRIR MODAL AQUÍ
        onClick: () => router.push(menuPath),
        primary: true,
      }
    ];

    if (branches.some(b => b.whatsapp_url)) {
      list.push({
        label: "WhatsApp",
        icon: <WhatsAppIcon />,
        onClick: () => handleActionClick("whatsapp"),
      });
    }

    if (branches.some(b => b.instagram_url)) {
      list.push({
        label: "Instagram",
        icon: <InstagramIcon />,
        onClick: () => handleActionClick("instagram"),
      });
    }

    if (branches.some(b => b.map_url)) {
      list.push({
        label: "Ubicación",
        icon: <MapPinIcon />,
        onClick: () => handleActionClick("location"),
      });
    }

    list.push({
      label: "REGISTRAR MI NEGOCIO",
      ariaLabel: "Ir a Registrar mi negocio",
        icon: (
        <Image
          src="/logo.svg"
          alt="Gcode Logo"
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
        />
      ),
      onClick: () => {
        // La landing pública de marketing es `/` (landing v3). `/landing` es el panel super-admin y pide login.
        const base = getAppUrl().replace(/\/$/, "");
        window.location.assign(`${base}/`);
      },
    });

    return list;
  }, [handleActionClick, router, menuPath, branches]);

  // Generador de iniciales robusto
  const initials = useMemo(() => {
    if (!name) return "GC";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return "GC";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [name]);

  return (
    <div className="home-container animate-fade">
      {panelBase ? (
        <button
          type="button"
          onClick={() => router.push(loginPath)}
          className="settings-btn"
          title="Acceso Administrativo"
          aria-label="Acceso Administrativo"
        >
          <Settings size={20} />
        </button>
      ) : null}

      <div className="home-background-glass" aria-hidden="true" />
      <div className="home-overlay" aria-hidden="true">
        <div className="home-glow home-glow-1" />
        <div className="home-glow home-glow-2" />
        <div className="home-glow home-glow-3" />
      </div>

      <main className="home-content container">
        <div className="ticket-wrapper">
          
          {/* Sección Principal (Link-in-Bio) */}
          <div className="ticket-main">
            <div className="home-banner" aria-hidden="true" />
            
            <header className="home-profile-header">
              <div className="home-logo-wrap">
                {logoUrl && !logoError ? (
                  <Image
                    src={logoUrl}
                    alt={`Logo de ${name}`}
                    className="home-logo-centered"
                    width={106}
                    height={106}
                    quality={80}
                    onError={() => setLogoError(true)}
                    loading="eager"
                    priority
                    unoptimized={shouldUnoptimizeImageSrc(logoUrl)}
                  />
                ) : (
                  <div
                    className="home-logo-centered logo-initials"
                    aria-label={`Iniciales de ${name}`}
                  >
                    {initials}
                  </div>
                )}
              </div>
              
              <div className="home-profile-info">
                <h1 className="text-gradient">{name}</h1>
                <p className="home-tagline">
                  {schedule ? schedule.split("\n")[0] : "Sabor auténtico en cada pieza"}
                </p>
              </div>
            </header>

            <nav className="home-nav-grid" aria-label="Menú principal de opciones">
              {buttons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  className={`btn ${btn.primary ? "btn-primary" : "btn-secondary glass"} ${
                    btn.label === "REGISTRAR MI NEGOCIO" ? "btn-godcode" : ""
                  }`}
                  aria-label={btn.ariaLabel ?? `Ir a ${btn.label}`}
                >
                  <span className="btn-icon" aria-hidden="true">{btn.icon}</span>
                  <span className="btn-label">{btn.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Talón de QR (Escritorio) */}
          {showQR && (
            <aside className="ticket-stub">
              <div className="veggie-bg" aria-hidden="true">
                <span className="veggie veggie-1" />
                <span className="veggie veggie-2" />
                <span className="veggie veggie-3" />
                <span className="veggie veggie-4" />
                <span className="veggie veggie-5" />
              </div>
              <div className="stub-content">
                <div className="stub-badge">ACCESO DIGITAL</div>
                <div className="qr-box" aria-label="Código QR del Menú Digital">
                  {menuUrl ? (
                    <QRCodeSVG 
                      value={menuUrl} 
                      level="H" 
                      includeMargin={false} 
                      className="qr-code"
                    />
                  ) : (
                    <div className="qr-placeholder">
                      <QrCode size={40} />
                    </div>
                  )}
                </div>
                <div className="stub-footer">
                  <p className="stub-scan-text">ESCANÉAME</p>
                  <span className="stub-info">PASAPORTE AL SABOR</span>
                </div>
              </div>
            </aside>
          )}

        </div>
      </main>

      {/* MODAL DE SUCURSALES (Ahora solo se usa para WhatsApp, Instgram y Ubicación) */}
      <LazyContactBranchModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setPendingAction(null);
        }}
        branches={
          pendingAction
            ? branches.filter((b) => {
                if (pendingAction === "whatsapp") return !!b.whatsapp_url;
                if (pendingAction === "instagram") return !!b.instagram_url;
                if (pendingAction === "location") return !!b.map_url;
                return false;
              })
            : branches
        }
        isLoading={false}
        onSelectBranch={handleBranchSelect}
        action={pendingAction}
      />
    </div>
  );
}