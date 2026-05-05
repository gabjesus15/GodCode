"use client";

import { useState } from "react";
import type { BillingOptionsResponse, BillingPaymentResponse, BranchEntitlementSummary, CompanySnapshot, PaymentSummary, TicketSummary } from "../shared/customer-account-types";
import { uploadImage } from "@/components/tenant/utils/cloudinary";

async function postTicket(payload: {
  subject:     string;
  description: string;
  category:    "general" | "billing" | "technical" | "product" | "account";
  priority:    "low" | "medium" | "high" | "critical";
}): Promise<{ ok: boolean; error?: string; ticket?: TicketSummary }> {
  const res  = await fetch("/api/tenant/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = (await res.json().catch(() => ({}))) as { error?: string; ticket?: TicketSummary };
  return res.ok ? { ok: true, ticket: data.ticket } : { ok: false, error: data.error || "No se pudo crear la solicitud." };
}

export type UseBranchFlowReturn = {
  branchFlowStep:          1 | 2 | 3;
  setBranchFlowStep:       (step: 1 | 2 | 3) => void;
  branchRequestName:       string;
  setBranchRequestName:    (v: string) => void;
  branchRequestAddress:    string;
  setBranchRequestAddress: (v: string) => void;
  branchRequestNotes:      string;
  setBranchRequestNotes:   (v: string) => void;
  expansionBranchName:     string;
  setExpansionBranchName:  (v: string) => void;
  expansionBranchAddress:  string;
  setExpansionBranchAddress:(v: string) => void;
  expansionQty:            string;
  setExpansionQty:         (v: string) => void;
  expansionMonths:         string;
  setExpansionMonths:      (v: string) => void;
  expansionMethodSlug:     string;
  setExpansionMethodSlug:  (v: string) => void;
  expansionNotes:          string;
  setExpansionNotes:       (v: string) => void;
  expansionQtyNumber:      number;
  expansionMonthsNumber:   number;
  expansionAmount:         number;
  projectedActiveBranches: number;
  projectedEffectiveMaxBranches: number | null;
  projectedRemainingBranches:    number | null;
  isProjectedCapacityInvalid:    boolean;
  createdExpansionPayment: BillingPaymentResponse | null;
  proofUploading:          boolean;
  proofFileUrl:            string;
  busy:                    boolean;
  billingError:            string | null;
  billingOk:               string | null;
  setBillingError:         (v: string | null) => void;
  handleBranchWizardNext:  () => void;
  handleBranchWizardBack:  () => void;
  handleBranchRequest:     () => Promise<void>;
  handleCreateExpansionPayment: () => Promise<void>;
  handleUploadPaymentProof: (file: File) => Promise<void>;
};

export function useBranchFlow(
  company:                    CompanySnapshot,
  billingOptions:             BillingOptionsResponse | null,
  activeBranchesCount:        number,
  subscriptionEndsAt:         string | null,
  canRequestBranchWithoutPayment: boolean,
  onAppendTicket:             (ticket?: TicketSummary) => void,
  onPaymentRowAdded:          (payment: PaymentSummary) => void,
  onEntitlementAdded:         (e: BranchEntitlementSummary) => void,
  onBillingOptionsReload:     () => Promise<void>,
): UseBranchFlowReturn {
  const [branchFlowStep,       setBranchFlowStep]       = useState<1 | 2 | 3>(1);
  const [branchRequestName,    setBranchRequestName]    = useState("");
  const [branchRequestAddress, setBranchRequestAddress] = useState("");
  const [branchRequestNotes,   setBranchRequestNotes]   = useState("");
  const [expansionBranchName,  setExpansionBranchName]  = useState("");
  const [expansionBranchAddress, setExpansionBranchAddress] = useState("");
  const [expansionQty,         setExpansionQty]         = useState("1");
  const [expansionMonths,      setExpansionMonths]      = useState("1");
  const [expansionMethodSlug,  setExpansionMethodSlug]  = useState(billingOptions?.paymentMethods[0]?.slug ?? "");
  const [expansionNotes,       setExpansionNotes]       = useState("");
  const [createdExpansionPayment, setCreatedExpansionPayment] = useState<BillingPaymentResponse | null>(null);
  const [proofUploading,       setProofUploading]       = useState(false);
  const [proofFileUrl,         setProofFileUrl]         = useState("");
  const [busy,                 setBusy]                 = useState(false);
  const [billingError,         setBillingError]         = useState<string | null>(null);
  const [billingOk,            setBillingOk]            = useState<string | null>(null);

  const branchUnitPrice   = billingOptions?.branchExpansionPriceMonthly ?? 0;
  const expansionQtyNumber   = Math.max(1, Number.parseInt(expansionQty,   10) || 1);
  const expansionMonthsNumber = Math.max(1, Number.parseInt(expansionMonths, 10) || 1);
  const expansionAmount       = Number((branchUnitPrice * expansionQtyNumber * expansionMonthsNumber).toFixed(2));
  const projectedExtraEntitlements = (billingOptions?.extraBranchEntitlements ?? 0) + (canRequestBranchWithoutPayment ? 0 : expansionQtyNumber);
  const projectedEffectiveMaxBranches = billingOptions?.maxBranches == null ? null : billingOptions.maxBranches + projectedExtraEntitlements;
  const projectedActiveBranches = activeBranchesCount + 1;
  const projectedRemainingBranches = projectedEffectiveMaxBranches == null ? null : projectedEffectiveMaxBranches - projectedActiveBranches;
  const isProjectedCapacityInvalid = projectedRemainingBranches != null && projectedRemainingBranches < 0;

  const handleBranchWizardNext = () => {
    const name = canRequestBranchWithoutPayment ? branchRequestName.trim() : expansionBranchName.trim();
    if (branchFlowStep === 1 && !name) { setBillingError("Indica el nombre de la sucursal antes de continuar."); return; }
    if (branchFlowStep === 2 && isProjectedCapacityInvalid) { setBillingError("La proyeccion supera tu capacidad disponible. Ajusta la cantidad antes de continuar."); return; }
    if (branchFlowStep === 2 && !canRequestBranchWithoutPayment && !expansionMethodSlug) { setBillingError("Selecciona un metodo de pago para continuar."); return; }
    setBillingError(null);
    setBranchFlowStep((prev) => (prev >= 3 ? 3 : ((prev + 1) as 1 | 2 | 3)));
  };

  const handleBranchWizardBack = () => setBranchFlowStep((prev) => (prev <= 1 ? 1 : ((prev - 1) as 1 | 2 | 3)));

  const handleBranchRequest = async () => {
    if (!branchRequestName.trim()) { setBillingError("Indica nombre de la sucursal."); return; }
    setBillingError(null); setBillingOk(null); setBusy(true);
    const result = await postTicket({
      subject: `Solicitud de nueva sucursal -> ${branchRequestName.trim()}`,
      description: [`Empresa: ${company.name}`, `Nombre sucursal: ${branchRequestName.trim()}`, `Direccion: ${branchRequestAddress.trim() || "Sin direccion"}`, `Detalle: ${branchRequestNotes.trim() || "Sin detalle"}`].join("\n"),
      category: "account", priority: "medium",
    });
    setBusy(false);
    if (!result.ok) { setBillingError(result.error || "No se pudo enviar la solicitud."); return; }
    onAppendTicket(result.ticket);
    setBranchRequestName(""); setBranchRequestAddress(""); setBranchRequestNotes(""); setBranchFlowStep(1);
    setBillingOk("Solicitud de sucursal enviada.");
  };

  const handleCreateExpansionPayment = async () => {
    if (!expansionBranchName.trim()) { setBillingError("Indica el nombre de la nueva sucursal."); return; }
    if (!expansionMethodSlug)        { setBillingError("Selecciona un metodo de pago.");         return; }
    setBillingError(null); setBillingOk(null); setBusy(true);
    try {
      const res  = await fetch("/api/customer-account/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: expansionQtyNumber, months: expansionMonthsNumber, methodSlug: expansionMethodSlug, notes: expansionNotes.trim() || undefined, branchName: expansionBranchName.trim(), branchAddress: expansionBranchAddress.trim() || undefined }) });
      const data = (await res.json().catch(() => ({}))) as BillingPaymentResponse & { error?: string };
      if (!res.ok) { setBillingError(data.error || "No se pudo crear el cobro de expansion."); return; }
      setCreatedExpansionPayment(data); setProofFileUrl(data.payment.reference_file_url ?? "");
      onPaymentRowAdded(data.payment);
      onEntitlementAdded({ id: `temp-${data.payment.id}`, quantity: expansionQtyNumber, monthsPurchased: expansionMonthsNumber, amountPaid: data.instructions.summary.amount, unitPrice: data.instructions.summary.unitPrice, status: data.instructions.summary.requiresManualProof ? "pending" : "active", startsAt: new Date().toISOString(), expiresAt: subscriptionEndsAt, createdAt: new Date().toISOString(), paymentReference: data.payment.payment_reference });
      setBillingOk(data.instructions.summary.requiresManualProof ? "Orden creada. Sube el comprobante para validacion manual." : "Pago creado y aplicado automaticamente.");
      setBranchFlowStep(3); setExpansionNotes("");
      await onBillingOptionsReload();
    } finally { setBusy(false); }
  };

  const handleUploadPaymentProof = async (file: File) => {
    if (!createdExpansionPayment?.payment.id) { setBillingError("Primero crea una orden de pago."); return; }
    setBillingError(null); setBillingOk(null); setProofUploading(true);
    try {
      const uploadedUrl = await uploadImage(file, "payment-reference");
      const res  = await fetch("/api/customer-account/billing/reference", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: createdExpansionPayment.payment.id, referenceFileUrl: uploadedUrl }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setBillingError(data.error || "No se pudo registrar el comprobante."); return; }
      setProofFileUrl(uploadedUrl);
      setCreatedExpansionPayment((prev) => prev ? { ...prev, payment: { ...prev.payment, reference_file_url: uploadedUrl } } : prev);
      setBillingOk("Comprobante cargado correctamente. Te avisaremos cuando sea validado.");
    } catch { setBillingError("No se pudo subir el archivo. Intenta nuevamente."); }
    finally { setProofUploading(false); }
  };

  return {
    branchFlowStep, setBranchFlowStep, branchRequestName, setBranchRequestName,
    branchRequestAddress, setBranchRequestAddress, branchRequestNotes, setBranchRequestNotes,
    expansionBranchName, setExpansionBranchName, expansionBranchAddress, setExpansionBranchAddress,
    expansionQty, setExpansionQty, expansionMonths, setExpansionMonths,
    expansionMethodSlug, setExpansionMethodSlug, expansionNotes, setExpansionNotes,
    expansionQtyNumber, expansionMonthsNumber, expansionAmount,
    projectedActiveBranches, projectedEffectiveMaxBranches, projectedRemainingBranches, isProjectedCapacityInvalid,
    createdExpansionPayment, proofUploading, proofFileUrl,
    busy, billingError, billingOk, setBillingError,
    handleBranchWizardNext, handleBranchWizardBack, handleBranchRequest,
    handleCreateExpansionPayment, handleUploadPaymentProof,
  };
}
