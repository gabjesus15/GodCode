"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CompanySnapshot, PaymentSummary, TicketMessage, TicketSummary } from "../shared/customer-account-types";
import { displayStatus, fmtMoney } from "../shared/customer-account-format";
import { PAYMENT_STATUS_LABELS } from "../shared/customer-account-constants";

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

export type UseTicketsReturn = {
  tickets:              TicketSummary[];
  setTickets:           React.Dispatch<React.SetStateAction<TicketSummary[]>>;
  selectedTicketId:     string;
  setSelectedTicketId:  (id: string) => void;
  selectedTicket:       TicketSummary | null;
  messages:             TicketMessage[];
  messageDraft:         string;
  setMessageDraft:      (v: string) => void;
  messageLoading:       boolean;
  ticketFeedbackError:  string | null;
  ticketFeedbackOk:     string | null;
  clearTicketFeedback:  () => void;
  busy:                 boolean;
  supportSubject:       string;
  setSupportSubject:    (v: string) => void;
  supportCategory:      "general" | "billing" | "technical" | "product" | "account";
  setSupportCategory:   (v: "general" | "billing" | "technical" | "product" | "account") => void;
  supportPriority:      "low" | "medium" | "high" | "critical";
  setSupportPriority:   (v: "low" | "medium" | "high" | "critical") => void;
  supportDescription:   string;
  setSupportDescription:(v: string) => void;
  handleSelectTicket:   (id: string) => void;
  handleSendMessage:    () => Promise<void>;
  handleSupportTicket:  () => Promise<void>;
  handleOpenBillingSupport: (payment: PaymentSummary) => void;
  handleApplySupportTemplate: (t: "facturacion" | "tecnico" | "sucursales") => void;
  onNavigateToSupport:  () => void;
  setOnNavigateToSupport: (fn: () => void) => void;
  isOnSupportTab:       boolean;
  setIsOnSupportTab:    (v: boolean) => void;
};

export function useTickets(
  initialTickets: TicketSummary[],
  company:        CompanySnapshot,
): UseTicketsReturn {
  const [tickets,              setTickets]            = useState(initialTickets);
  const [selectedTicketId,     setSelectedTicketId]   = useState("");
  const [messages,             setMessages]           = useState<TicketMessage[]>([]);
  const [messageDraft,         setMessageDraft]       = useState("");
  const [messageLoading,       setMessageLoading]     = useState(false);
  const [ticketFeedbackError,  setTicketFeedbackError] = useState<string | null>(null);
  const [ticketFeedbackOk,     setTicketFeedbackOk]   = useState<string | null>(null);
  const [busy,                 setBusy]               = useState(false);
  const [supportSubject,       setSupportSubject]     = useState("");
  const [supportCategory,      setSupportCategory]    = useState<"general" | "billing" | "technical" | "product" | "account">("general");
  const [supportPriority,      setSupportPriority]    = useState<"low" | "medium" | "high" | "critical">("medium");
  const [supportDescription,   setSupportDescription] = useState("");
  const [isOnSupportTab,       setIsOnSupportTab]     = useState(false);
  const [navigateToSupport,    setNavigateToSupportFn] = useState<() => void>(() => () => {});

  const selectedTicket = useMemo(() => tickets.find((t) => t.id === selectedTicketId) ?? null, [tickets, selectedTicketId]);
  const clearTicketFeedback = () => { setTicketFeedbackError(null); setTicketFeedbackOk(null); };

  const loadMessages = useCallback(async (ticketId: string) => {
    setMessageLoading(true);
    try {
      const res  = await fetch(`/api/tenant/tickets/${ticketId}/messages`);
      const data = (await res.json().catch(() => ({}))) as { messages?: TicketMessage[] };
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } finally { setMessageLoading(false); }
  }, []);

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId); setMessages([]); void loadMessages(ticketId);
  };

  useEffect(() => {
    if (!isOnSupportTab || !selectedTicketId) return;
    const id = window.setInterval(() => void loadMessages(selectedTicketId), 25_000);
    return () => window.clearInterval(id);
    /*
     * DEUDA TÉCNICA — Fase 8: migración a Supabase Realtime
     *
     * Para reemplazar el polling de 10 s en mensajes de ticket:
     *   1. Habilitar Supabase Realtime en `saas_ticket_messages`.
     *   2. Añadir política RLS SELECT para `authenticated` (tenant) filtrada por
     *      la empresa del usuario (`ticket_id IN (SELECT id FROM saas_tickets WHERE
     *      company_id = <company_id_del_tenant>)`).
     *   3. Sustituir el setInterval por:
     *        const channel = createSupabaseBrowserClient("tenant")
     *          .channel(`ticket-messages-${selectedTicketId}`)
     *          .on("postgres_changes", { event: "INSERT", schema: "public",
     *               table: "saas_ticket_messages",
     *               filter: `ticket_id=eq.${selectedTicketId}` },
     *               (payload) => setMessages((prev) => [...prev, payload.new as TicketMessage]))
     *          .subscribe();
     *      Limpiar el canal al cambiar `selectedTicketId`.
     *      Mantener el polling como fallback si channel.state !== "joined".
     */
  }, [isOnSupportTab, selectedTicketId, loadMessages]);

  const handleSendMessage = async () => {
    if (!selectedTicket || !messageDraft.trim()) return;
    setMessageLoading(true);
    try {
      const res = await fetch(`/api/tenant/tickets/${selectedTicket.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: messageDraft.trim() }) });
      if (!res.ok) { setTicketFeedbackError("No se pudo enviar el mensaje."); return; }
      setMessageDraft(""); await loadMessages(selectedTicket.id);
    } finally { setMessageLoading(false); }
  };

  const appendTicket = (ticket?: TicketSummary) => {
    if (!ticket) return;
    setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
    setSelectedTicketId(ticket.id);
    navigateToSupport();
  };

  const handleSupportTicket = async () => {
    if (!supportSubject.trim() || !supportDescription.trim()) { setTicketFeedbackError("Completa asunto y descripcion."); return; }
    clearTicketFeedback(); setBusy(true);
    const result = await postTicket({ subject: supportSubject.trim(), description: supportDescription.trim(), category: supportCategory, priority: supportPriority });
    setBusy(false);
    if (!result.ok) { setTicketFeedbackError(result.error || "No se pudo crear el ticket."); return; }
    appendTicket(result.ticket); setSupportSubject(""); setSupportDescription(""); setTicketFeedbackOk("Ticket creado correctamente.");
  };

  const handleOpenBillingSupport = (payment: PaymentSummary) => {
    setSupportCategory("billing"); setSupportPriority("medium");
    setSupportSubject(`Consulta sobre pago ${payment.payment_reference ?? payment.id}`);
    setSupportDescription(["Hola, necesito ayuda con este cobro.", `Referencia: ${payment.payment_reference ?? "-"}`, `Monto: ${fmtMoney(payment.amount_paid, company.currency, company.locale)}`, `Estado actual: ${displayStatus(payment.status, PAYMENT_STATUS_LABELS)}`, "Detalle adicional:"].join("\n"));
    navigateToSupport();
  };

  const handleApplySupportTemplate = (t: "facturacion" | "tecnico" | "sucursales") => {
    if (t === "facturacion") { setSupportCategory("billing"); setSupportPriority("medium"); setSupportSubject("Consulta de facturacion / cobro"); setSupportDescription(["Hola, necesito ayuda con un cobro.", "Referencia de pago:", "Detalle del problema:", "Resultado esperado:"].join("\n")); return; }
    if (t === "tecnico") { setSupportCategory("technical"); setSupportPriority("high"); setSupportSubject("Incidencia tecnica"); setSupportDescription(["Hola, reporto una incidencia tecnica.", "Modulo afectado:", "Que accion estabas realizando:", "Error recibido:"].join("\n")); return; }
    setSupportCategory("account"); setSupportPriority("medium"); setSupportSubject("Solicitud de sucursales / capacidad"); setSupportDescription(["Hola, necesito apoyo con sucursales o capacidad del plan.", "Cantidad requerida:", "Fecha objetivo:", "Comentarios adicionales:"].join("\n"));
  };

  return {
    tickets, setTickets, selectedTicketId, setSelectedTicketId, selectedTicket,
    messages, messageDraft, setMessageDraft, messageLoading,
    ticketFeedbackError, ticketFeedbackOk, clearTicketFeedback, busy,
    supportSubject, setSupportSubject, supportCategory, setSupportCategory,
    supportPriority, setSupportPriority, supportDescription, setSupportDescription,
    handleSelectTicket, handleSendMessage, handleSupportTicket,
    handleOpenBillingSupport, handleApplySupportTemplate,
    onNavigateToSupport: navigateToSupport,
    setOnNavigateToSupport: (fn) => setNavigateToSupportFn(() => fn),
    isOnSupportTab, setIsOnSupportTab,
  };
}
