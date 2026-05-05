"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, MapPin, Phone, Store, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface BranchData {
  id: string;
  name: React.ReactNode;
  address: string | null;
  phone: string | null;
  disabled?: boolean;
}

interface BranchSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: BranchData[];
  allBranches: BranchData[];
  isLoadingCaja: boolean;
  onSelectBranch: (branch: BranchData) => void;
  allowClose?: boolean;
  schedule?: string | null;
}

export function BranchSelectorModal({
  isOpen,
  onClose,
  branches,
  allBranches,
  isLoadingCaja,
  onSelectBranch,
  allowClose = true,
  schedule,
}: BranchSelectorModalProps) {
  const t = useTranslations("tenant.cart.modal");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!isMounted || !isOpen) return null;
  if (typeof document === "undefined") return null;

  const handleBranchSelect = (branch: BranchData) => {
    onSelectBranch(branch);
    if (allowClose) onClose();
  };

  const hasBranchesWithCaja = branches && branches.length > 0;
  const hasOtherBranches = allBranches && allBranches.length > 0;

  const formatBranchName = (rawName: React.ReactNode) => {
    if (typeof rawName !== "string") return rawName;
    if (!rawName) return rawName;

    let cleanName = rawName;
    let badge: React.ReactNode = null;

    if (rawName.includes("ABIERTO") || rawName.includes("OPEN")) {
      cleanName = rawName.replace(/ABIERTO|OPEN/g, "").trim();
      badge = <span className="badge-open">{t("branchSelector.openBadge")}</span>;
    } else if (rawName.includes("CERRADO") || rawName.includes("CLOSED")) {
      cleanName = rawName.replace(/CERRADO|CLOSED/g, "").trim();
      badge = <span className="badge-closed">{t("branchSelector.closedBadge")}</span>;
    }

    return (
      <>
        <Store size={18} className="branch-icon-small" />
        <span>{cleanName}</span>
        {badge}
      </>
    );
  };

  const modalContent = (
    <div className="branch-modal-overlay" onClick={allowClose ? onClose : undefined}>
      <div className="branch-modal-wrapper" onClick={(event) => event.stopPropagation()}>
        <div className="branch-modal-content">
          <header className="branch-modal-header">
            <div className="branch-modal-title-section">
              <h2 className="branch-modal-title">{t("branchSelector.title")}</h2>
              <p className="branch-modal-subtitle">{t("branchSelector.subtitle")}</p>
            </div>
            {allowClose ? (
              <button onClick={onClose} className="branch-modal-close-btn" aria-label={t("branchSelector.closeAria")}>
                <X size={20} />
              </button>
            ) : null}
          </header>

          <div className="branch-list">
            {isLoadingCaja ? (
              <div className="branch-empty-state">
                <Loader2 size={32} className="branch-loading-spinner" />
                <p>{t("branchSelector.checkingBranches")}</p>
              </div>
            ) : !hasBranchesWithCaja ? (
              <div className="branch-empty-state">
                <AlertCircle size={40} className="branch-empty-icon-alert" />
                <p className="branch-empty-title">
                  {t("branchSelector.noBranchesReceiving")}
                </p>
                <p className="branch-empty-description">
                  {schedule
                    ? t("branchSelector.attentionSchedule", { schedule })
                    : hasOtherBranches
                    ? t("branchSelector.openCashAnyBranch")
                    : t("branchSelector.openCash")}
                </p>
              </div>
            ) : (
              branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleBranchSelect(branch)}
                  className="branch-button"
                  disabled={branch.disabled}
                >
                  <div className="branch-item-row">
                    <div className="branch-item-name">{formatBranchName(branch.name)}</div>
                  </div>
                  <div className="branch-details">
                    <div className="branch-address-row">
                      <MapPin size={16} className="branch-icon-small" />
                      <span>{branch.address}</span>
                    </div>
                    {branch.phone ? (
                      <div className="branch-phone-row">
                        <Phone size={16} className="branch-icon-small" />
                        <span>{branch.phone}</span>
                      </div>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const portalRoot = document.getElementById("modal-root") || document.body;
  return createPortal(modalContent, portalRoot);
}