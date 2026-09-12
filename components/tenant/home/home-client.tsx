"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Settings, QrCode } from "lucide-react";
import Image from "next/image";

import { LazyContactBranchModal } from "@/lib/tenant/lazy/tenant-dynamic";
import { buildPoweredByHref } from "@/lib/tenant/powered-by";
import { getTenantScopedPath } from "../utils/tenant-route";
import { PoweredByGcode } from "../branding/powered-by-gcode";

interface BranchInfo {
  id: string;
  name: string | null;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  map_url?: string | null;
}

const RestaurantMenuIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Cloche knob */}
    <circle cx="12" cy="4" r="1.8" />
    {/* Cloche dome */}
    <path d="M12 6.5C7.2 6.5 3.3 10.3 3 15h18c-.3-4.7-4.2-8.5-9-8.5Z" />
    {/* Serving tray platter */}
    <rect x="2" y="16.5" width="20" height="2.5" rx="1.25" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.938 3.658 1.434 5.71 1.435h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
  </svg>
);

const InstagramIcon = () => (
  <svg
    width="22"
    height="22"
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
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const StorefrontIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Storefront structure */}
    <rect x="4" y="10.5" width="16" height="10" rx="1.5" fill="#38bdf8" />
    <rect x="13" y="13.5" width="5.5" height="4.5" rx="0.75" fill="#ffffff" />
    <path d="M13 15.75H18.5M15.75 13.5V18" stroke="#38bdf8" strokeWidth="0.75" strokeLinecap="round" />
    <rect x="5.5" y="13.5" width="5" height="7" rx="0.75" fill="#ffffff" />
    <circle cx="9.5" cy="17" r="0.65" fill="#0284c7" />
    {/* Striped awning */}
    <path d="M3 10.5L5 4H19L21 10.5H3Z" fill="#f43f5e" />
    <path d="M7 4L6 10.5H10.2L10.5 4H7Z" fill="#ffffff" />
    <path d="M13.5 4L13.8 10.5H18L17 4H13.5Z" fill="#ffffff" />
    {/* Scalloped edge */}
    <circle cx="4.5" cy="10.5" r="1.5" fill="#f43f5e" />
    <circle cx="7.5" cy="10.5" r="1.5" fill="#ffffff" />
    <circle cx="10.5" cy="10.5" r="1.5" fill="#f43f5e" />
    <circle cx="13.5" cy="10.5" r="1.5" fill="#ffffff" />
    <circle cx="16.5" cy="10.5" r="1.5" fill="#f43f5e" />
    <circle cx="19.5" cy="10.5" r="1.5" fill="#ffffff" />
  </svg>
);


type ActionType = "whatsapp" | "instagram" | "location";

type ActionVariant = ActionType | "menu" | "godcode";

interface HomeAction {
  label: string;
  icon: ReactNode;
  variant: ActionVariant;
  /** Solo cuando el nombre accesible debe decir más que la etiqueta visible. */
  ariaLabel?: string;
  primary?: boolean;
  godcodeCta?: boolean;
  /** Navegación: se renderiza como enlace real (Cmd+click, click central, SEO). */
  href?: string;
  external?: boolean;
  /** Acción: abre el selector de sucursal. */
  onClick?: () => void;
}

interface HomeClientProps {
  publicSlug: string;
  name: string;
  logoUrl?: string | null;
  schedule?: string | null;
  branches: BranchInfo[];
}

export function HomeClient(props: HomeClientProps) {
  const { name, logoUrl, schedule, branches, publicSlug } = props;
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
  const buttons = useMemo((): HomeAction[] => {
    const list: HomeAction[] = [
      {
        label: "Ver Menú Digital",
        icon: <RestaurantMenuIcon />,
        href: menuPath,
        primary: true,
        variant: "menu",
      },
    ];

    if (branches.some(b => b.whatsapp_url)) {
      list.push({
        label: "WhatsApp",
        icon: <WhatsAppIcon />,
        onClick: () => handleActionClick("whatsapp"),
        // El botón no va a WhatsApp: abre el selector de sucursal.
        ariaLabel: "Contactar por WhatsApp",
        variant: "whatsapp",
      });
    }

    if (branches.some(b => b.instagram_url)) {
      list.push({
        label: "Instagram",
        icon: <InstagramIcon />,
        onClick: () => handleActionClick("instagram"),
        ariaLabel: "Ver nuestro Instagram",
        variant: "instagram",
      });
    }

    if (branches.some(b => b.map_url)) {
      list.push({
        label: "Ubicación",
        icon: <MapPinIcon />,
        onClick: () => handleActionClick("location"),
        ariaLabel: "Ver ubicaciones",
        variant: "location",
      });
    }

    list.push({
      label: "Crea tu menú",
      ariaLabel: "Crea tu menú digital con Gcode",
      godcodeCta: true,
      variant: "godcode",
      icon: <StorefrontIcon />,
      // La landing pública de marketing es `/` (landing v3). `/landing` es el panel super-admin y pide login.
      href: buildPoweredByHref({ tenantSlug: publicSlug, surface: "home" }),
      external: true,
    });

    return list;
  }, [handleActionClick, menuPath, branches, publicSlug]);

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
        <Link
          href={loginPath}
          className="settings-btn"
          title="Acceso Administrativo"
          aria-label="Acceso Administrativo"
        >
          <Settings size={20} aria-hidden="true" />
        </Link>
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
                    priority
                    // Branding: servir el logo original sin recomprimir.
                    unoptimized
                  />
                ) : (
                  <div
                    className="home-logo-centered logo-initials"
                    role="img"
                    aria-label={`Iniciales de ${name}`}
                  >
                    {initials}
                  </div>
                )}
              </div>
              
              <div className="home-profile-info">
                <h1 className="text-gradient">{name}</h1>
                {schedule?.split("\n")[0]?.trim() ? (
                  <p className="home-tagline">{schedule.split("\n")[0].trim()}</p>
                ) : null}
              </div>
            </header>

            <nav className="home-nav-grid" aria-label="Menú principal de opciones">
              {buttons.map((btn) => {
                const className = `btn btn-linkbio btn-item--${btn.variant} ${
                  btn.primary ? "btn-primary" : "btn-secondary"
                } ${btn.godcodeCta ? "btn-godcode" : ""}`;
                const inner = (
                  <>
                    <span className="btn-icon-bubble" aria-hidden="true">
                      {btn.icon}
                    </span>
                    <span className="btn-label">{btn.label}</span>
                  </>
                );

                if (btn.href && btn.external) {
                  return (
                    <a
                      key={btn.label}
                      href={btn.href}
                      className={className}
                      rel="noopener noreferrer"
                      aria-label={btn.ariaLabel}
                    >
                      {inner}
                    </a>
                  );
                }

                if (btn.href) {
                  return (
                    <Link
                      key={btn.label}
                      href={btn.href}
                      className={className}
                      aria-label={btn.ariaLabel}
                    >
                      {inner}
                    </Link>
                  );
                }

                return (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={btn.onClick}
                    className={className}
                    aria-label={btn.ariaLabel}
                  >
                    {inner}
                  </button>
                );
              })}
            </nav>

            <PoweredByGcode tenantSlug={publicSlug} surface="home" />
          </div>

          {/* Talón de QR (visible en escritorio; el CSS lo oculta en móvil) */}
          <aside className="ticket-stub">
            <div className="veggie-bg" aria-hidden="true">
              <span className="veggie veggie-1" />
              <span className="veggie veggie-2" />
              <span className="veggie veggie-3" />
              <span className="veggie veggie-4" />
              <span className="veggie veggie-5" />
            </div>
            <div className="stub-content">
              <div className="stub-badge">Acceso digital</div>
              <div
                className="qr-box"
                role="img"
                aria-label="Código QR del Menú Digital"
              >
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
                <p className="stub-scan-text">Escanéame</p>
                <span className="stub-info">Pasaporte al sabor</span>
              </div>
            </div>
          </aside>

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