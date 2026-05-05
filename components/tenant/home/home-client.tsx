"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Building2, Share2, MapPin, MessageCircle, Settings, Utensils, QrCode } from "lucide-react";
import Image from "next/image";

import dynamic from "next/dynamic";

const ContactBranchModal = dynamic(
  () => import("../branch/contact-branch-modal").then((mod) => mod.ContactBranchModal),
  { ssr: false }
);
import { getTenantScopedPath } from "../utils/tenant-route";

interface BranchInfo {
  id: string;
  name: string | null;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  map_url?: string | null;
}

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
      icon: <Utensils size={20} />,
      // AL HACER CLIC, VA DIRECTO AL MENÚ SIN ABRIR MODAL AQUÍ
      onClick: () => router.push(menuPath),
      primary: true,
    },
    {
      label: "WhatsApp",
      icon: <MessageCircle size={20} />,
      onClick: () => handleActionClick("whatsapp"),
    },
    {
      label: "Instagram",
      icon: <Share2 size={20} />,
      onClick: () => handleActionClick("instagram"),
    },
    {
      label: "Ubicación",
      icon: <MapPin size={20} />,
      onClick: () => handleActionClick("location"),
    },
    {
      label: "¿Quieres tu menú digital?",
      ariaLabel: "Descubre cómo tener tu propio menú digital",
      icon: <Building2 size={20} />,
      onClick: () => {
        window.location.href = "https://www.godcode.me/landing";
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

      <div className="home-overlay" aria-hidden="true" />

      <main className="home-content container">
        <div className="ticket-wrapper">
          <div className="ticket-main">
            
            <header className="home-header-centered">
              <div className="brand-container-centered">
                {logoUrl && !logoError ? (
                  <Image
                    src={logoUrl}
                    alt={`Logo de ${name}`}
                    className="home-logo-centered"
                    width={120}
                    height={120}
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
                <div className="brand-text-centered">
                  <h1 className="text-gradient">{name}</h1>
                </div>
              </div>
              <p className="home-tagline">
                {schedule ? schedule.split("\n")[0] : "Sabor auténtico en cada pieza"}
              </p>
            </header>

            <nav className="home-nav-grid" aria-label="Menú principal de opciones">
              {buttons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  className={`btn ${btn.primary ? "btn-primary" : "btn-secondary glass"}`}
                  aria-label={btn.ariaLabel ?? `Ir a ${btn.label}`}
                >
                  <span className="btn-icon" aria-hidden="true">{btn.icon}</span>
                  <span className="btn-label">{btn.label}</span>
                </button>
              ))}
            </nav>

            <div className="ticket-stub-line" aria-hidden="true" />
          </div>

          <aside className="ticket-stub">
            {/* Ocultar QR en mobile usando estado para evitar SSR mismatch */}
            {showQR && (
              <>
                <div className="veggie-bg" aria-hidden="true">
                  <span className="veggie veggie-1 veg-lettuce" />
                  <span className="veggie veggie-2 veg-carrot" />
                  <span className="veggie veggie-3 veg-cucumber" />
                  <span className="veggie veggie-4 veg-tomato" />
                  <span className="veggie veggie-5 veg-pepper" />
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
              </>
            )}
          </aside>
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