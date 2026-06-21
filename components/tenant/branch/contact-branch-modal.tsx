"use client";

import { createPortal } from "react-dom";
import { Loader2, Store, X, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

const InstagramIcon = ({ size = 18, color = "#e1306c" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="branch-pin-icon"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const WhatsAppIcon = ({ size = 18, color = "#25d366" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    className="branch-pin-icon"
  >
    <path d="M8.88595 7.16985C9.06891 7.17475 9.27175 7.18465 9.46474 7.61303C9.59271 7.89821 9.80829 8.42321 9.9839 8.85087C10.1206 9.18366 10.233 9.45751 10.2611 9.51356C10.3254 9.64156 10.365 9.78926 10.2809 9.96156C10.271 9.98188 10.2617 10.0013 10.2526 10.02C10.1852 10.16 10.1372 10.2597 10.0237 10.3899C9.97709 10.4435 9.9285 10.5022 9.88008 10.5607C9.79494 10.6636 9.71035 10.7658 9.63785 10.838C9.50924 10.9659 9.37563 11.1039 9.52402 11.3599C9.6725 11.6159 10.1919 12.4579 10.9587 13.1373C11.783 13.8712 12.4998 14.1805 12.8622 14.3368C12.9325 14.3672 12.9895 14.3918 13.0313 14.4126C13.2886 14.5406 13.4419 14.5209 13.5903 14.3486C13.7388 14.1762 14.2334 13.6001 14.4066 13.3441C14.5748 13.0881 14.7479 13.1275 14.9854 13.2161C15.2228 13.3047 16.4892 13.9251 16.7464 14.0531C16.7972 14.0784 16.8448 14.1012 16.8889 14.1224C17.0678 14.2082 17.1895 14.2665 17.2411 14.3535C17.3054 14.4618 17.3054 14.9739 17.0927 15.5746C16.8751 16.1752 15.8263 16.7513 15.3514 16.7956C15.3064 16.7999 15.2617 16.8053 15.2156 16.8108C14.7804 16.8635 14.228 16.9303 12.2596 16.1555C9.83424 15.2018 8.23322 12.8354 7.90953 12.357C7.88398 12.3192 7.86638 12.2932 7.85698 12.2806L7.8515 12.2733C7.70423 12.0762 6.80328 10.8707 6.80328 9.62685C6.80328 8.43682 7.38951 7.81726 7.65689 7.53467C7.67384 7.51676 7.6895 7.50021 7.70366 7.48494C7.94107 7.22895 8.21814 7.16495 8.39125 7.16495C8.56445 7.16495 8.73756 7.16495 8.88595 7.16985Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M2.18418 21.3314C2.10236 21.6284 2.37285 21.9025 2.6709 21.8247L7.27824 20.6213C8.7326 21.409 10.37 21.8275 12.0371 21.8275H12.0421C17.5281 21.8275 22 17.3815 22 11.9163C22 9.26735 20.966 6.77594 19.0863 4.90491C17.2065 3.03397 14.7084 2 12.042 2C6.55607 2 2.08411 6.44605 2.08411 11.9114C2.08348 13.65 2.5424 15.3582 3.41479 16.8645L2.18418 21.3314ZM4.86092 17.2629C4.96774 16.8752 4.91437 16.4608 4.71281 16.1127C3.97266 14.8348 3.58358 13.3855 3.58411 11.9114C3.58411 7.28158 7.37738 3.5 12.042 3.5C14.3119 3.5 16.5053 4.38287 18.0619 5.93952C19.6186 7.49618 20.5015 9.68953 20.5015 11.9614C20.5015 16.5912 16.7082 20.3727 12.0784 20.3727C10.597 20.3727 9.14175 19.988 7.87635 19.2621L7.75373 19.1915L3.92317 20.187L4.86092 17.2629Z" />
  </svg>
);

interface BranchInfo {
  id: string;
  name: string | null;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  map_url?: string | null;
}

interface ContactBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: BranchInfo[];
  isLoading: boolean;
  onSelectBranch: (branch: BranchInfo) => void;
  action?: "whatsapp" | "instagram" | "location" | null;
}

export function ContactBranchModal({
  isOpen,
  onClose,
  branches,
  isLoading,
  onSelectBranch,
  action,
}: ContactBranchModalProps) {
  const t = useTranslations("tenant.cart.modal");
  if (!isOpen) return null;

  const handleBranchSelect = (branch: BranchInfo) => {
    onSelectBranch(branch);
    onClose();
  };

  const parseBranchStatus = (rawName: string | null) => {
    if (!rawName) {
      return { name: "", status: null as "open" | "closed" | null };
    }

    if (rawName.includes("ABIERTO") || rawName.includes("OPEN")) {
      return { name: rawName.replace(/ABIERTO|OPEN/g, "").trim(), status: "open" as const };
    }

    if (rawName.includes("CERRADO") || rawName.includes("CLOSED")) {
      return { name: rawName.replace(/CERRADO|CLOSED/g, "").trim(), status: "closed" as const };
    }

    return { name: rawName, status: null as "open" | "closed" | null };
  };

  const getModalText = () => {
    switch (action) {
      case "instagram":
        return {
          title: "Instagram de nuestras sucursales",
          subtitle: "¿De qué local quieres ver su perfil de Instagram?",
        };
      case "whatsapp":
        return {
          title: "WhatsApp de nuestras sucursales",
          subtitle: "¿Con qué local te quieres comunicar por WhatsApp?",
        };
      case "location":
        return {
          title: "Dirección de nuestras sucursales",
          subtitle: "¿De qué local quieres ver su ubicación?",
        };
      default:
        return {
          title: t("contactBranch.title"),
          subtitle: t("contactBranch.subtitle"),
        };
    }
  };

  const { title: modalTitle, subtitle: modalSubtitle } = getModalText();

  const modalContent = (
    <div className="branch-modal-overlay" onClick={onClose}>
      <div className="branch-modal-wrapper" onClick={(event) => event.stopPropagation()}>
        <div className="branch-modal-content">
          <header className="branch-modal-header">
            <div className="branch-modal-title-section">
              <h2 className="branch-modal-title">{modalTitle}</h2>
              <p className="branch-modal-subtitle">
                {modalSubtitle}
              </p>
            </div>
            <button onClick={onClose} className="branch-modal-close-btn" aria-label={t("contactBranch.closeAria")}>
              <X size={20} />
            </button>
          </header>
 
          <div className="branch-list">
            {isLoading ? (
              <div className="branch-empty-state">
                <Loader2 size={32} className="branch-loading-spinner" />
                <p>{t("contactBranch.loading")}</p>
              </div>
            ) : branches.length === 0 ? (
              <div className="branch-empty-state">
                <p>{t("contactBranch.empty")}</p>
              </div>
            ) : (
              branches.map((branch) => {
                const { name, status } = parseBranchStatus(branch.name ?? "");
                return (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchSelect(branch)}
                    className="branch-button"
                  >
                    <div className="branch-item-row">
                      <div className="branch-name-group">
                        {action === "instagram" ? (
                          <InstagramIcon size={18} />
                        ) : action === "whatsapp" ? (
                          <WhatsAppIcon size={18} />
                        ) : action === "location" ? (
                          <MapPin size={18} className="branch-pin-icon" style={{ color: "var(--accent-primary)" }} />
                        ) : (
                          <Store
                            className={`branch-pin-icon ${
                              status === "open" ? "icon-open" : status === "closed" ? "icon-closed" : ""
                            }`}
                            size={18}
                          />
                        )}
                        <span className="branch-item-name">{name}</span>
                      </div>
                      {status ? (
                        <span
                          className={`branch-status-badge ${
                            status === "open" ? "status-open" : "status-closed"
                          }`}
                        >
                          {status === "open" ? t("branchSelector.openBadge") : t("branchSelector.closedBadge")}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const portalRoot = document.getElementById("modal-root") || document.body;
  return createPortal(modalContent, portalRoot);
}
