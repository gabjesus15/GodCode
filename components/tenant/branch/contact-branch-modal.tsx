"use client";

import { createPortal } from "react-dom";
import { Loader2, Store, X } from "lucide-react";
import { useTranslations } from "next-intl";

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
}

export function ContactBranchModal({
  isOpen,
  onClose,
  branches,
  isLoading,
  onSelectBranch,
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

  const modalContent = (
    <div className="branch-modal-overlay" onClick={onClose}>
      <div className="branch-modal-wrapper" onClick={(event) => event.stopPropagation()}>
        <div className="branch-modal-content">
          <header className="branch-modal-header">
            <div className="branch-modal-title-section">
              <h2 className="branch-modal-title">{t("contactBranch.title")}</h2>
              <p className="branch-modal-subtitle">
                {t("contactBranch.subtitle")}
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
                        <Store
                          size={18}
                          className={`branch-pin-icon ${
                            status === "open" ? "icon-open" : status === "closed" ? "icon-closed" : ""
                          }`}
                        />
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
