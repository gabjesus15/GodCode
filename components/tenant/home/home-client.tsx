"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Settings, QrCode } from "lucide-react";
import Image from "next/image";

import dynamic from "next/dynamic";

const ContactBranchModal = dynamic(
  () => import("../branch/contact-branch-modal").then((mod) => mod.ContactBranchModal),
  { ssr: false }
);
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
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 12c0 5.523-4.477 10-10 10a9.96 9.96 0 0 1-5.03-1.38L2 22l1.42-4.82A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10z" />
    <path d="M17.5 14.3c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.3-.7.8-.9 1-.1.2-.3.2-.6.1-1.2-.5-2.2-1.5-2.7-2.7-.1-.3 0-.5.1-.6.2-.2.5-.5.7-.7.1-.1.2-.3.1-.5-.1-.2-.6-1.5-.8-2-.2-.4-.4-.3-.5-.3h-.5c-.2 0-.5.1-.7.3-.6.6-.9 1.5-.9 2.4 0 1.9 1.4 3.7 1.6 3.9.2.2 2.8 4.3 6.8 6 1 .4 1.7.6 2.3.8.9.3 1.8.2 2.4.1.8-.1 2.4-1 2.7-1.9.3-.9.3-1.7.2-1.9-.1-.2-.3-.3-.6-.4z" />
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
    // Si solo hay una sucursal, podríamos ejecutar la acción directo (Opcional, pero buena UX)
    if (branches.length === 1) {
      executeAction(action, branches[0]);
      return;
    }
    
    setPendingAction(action);
    setShowModal(true);
  }, [branches, executeAction]);

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
  }> => [
    {
      label: "Ver Menú Digital",
      icon: <MenuBookIcon />,
      // AL HACER CLIC, VA DIRECTO AL MENÚ SIN ABRIR MODAL AQUÍ
      onClick: () => router.push(menuPath),
      primary: true,
    },
    {
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      onClick: () => handleActionClick("whatsapp"),
    },
    {
      label: "Instagram",
      icon: <InstagramIcon />,
      onClick: () => handleActionClick("instagram"),
    },
    {
      label: "Ubicación",
      icon: <MapPinIcon />,
      onClick: () => handleActionClick("location"),
    },
    {
      label: "REGISTRAR MI NEGOCIO",
      ariaLabel: "Ir a Registrar mi negocio",
      icon: (
        <img
          src="/logo.png"
          alt="GodCode Logo"
          width={20}
          height={20}
          className="w-5 h-5 object-contain"
        />
      ),
      onClick: () => {
        // La landing pública de marketing es `/` (GodcodeLanding). `/landing` es el panel super-admin y pide login.
        const base = getAppUrl().replace(/\/$/, "");
        window.location.assign(`${base}/`);
      },
    },
  ], [handleActionClick, router, menuPath]);

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
                    onError={() => setLogoError(true)}
                    loading="eager"
                    unoptimized
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
      <ContactBranchModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setPendingAction(null);
        }}
        branches={branches}
        isLoading={false}
        onSelectBranch={handleBranchSelect}
      />
    </div>
  );
}