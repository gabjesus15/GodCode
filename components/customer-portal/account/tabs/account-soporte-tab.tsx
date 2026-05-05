"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Plus, Send } from "lucide-react";

import type { CompanySnapshot, TicketMessage, TicketSummary } from "../../shared/customer-account-types";
import { fmtDate } from "../../shared/customer-account-format";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from "../../shared/customer-account-constants";
import { getTicketAgeHours, getTicketSlaHours } from "../../shared/customer-account-ticket-utils";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Dialog, DialogFooter } from "../../ui/Dialog";
import { EmptyState } from "../../ui/EmptyState";
import { PageHeader } from "../../ui/PageHeader";
import type { ColorVariant } from "../../ui/tokens";

export type SupportCategory = "general" | "billing" | "technical" | "product" | "account";
export type SupportPriority = "low" | "medium" | "high" | "critical";

export type AccountSoporteTabProps = {
  company: CompanySnapshot;
  busy: boolean;
  supportSubject: string;
  setSupportSubject: (v: string) => void;
  supportCategory: SupportCategory;
  setSupportCategory: (v: SupportCategory) => void;
  supportPriority: SupportPriority;
  setSupportPriority: (v: SupportPriority) => void;
  supportDescription: string;
  setSupportDescription: (v: string) => void;
  onSupportTicket: () => void;
  onApplySupportTemplate: (kind: "facturacion" | "tecnico" | "sucursales") => void;
  tickets: TicketSummary[];
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
  selectedTicket: TicketSummary | null;
  messageLoading: boolean;
  messages: TicketMessage[];
  messageDraft: string;
  setMessageDraft: (v: string) => void;
  onSendMessage: () => void;
};

const priorityVariant: Record<SupportPriority, ColorVariant> = {
  low:      "neutral",
  medium:   "info",
  high:     "warning",
  critical: "danger",
};

const QUICK_TEMPLATES: { kind: "facturacion" | "tecnico" | "sucursales"; label: string }[] = [
  { kind: "facturacion", label: "Facturacion y cobros" },
  { kind: "tecnico",     label: "Incidencia tecnica" },
  { kind: "sucursales",  label: "Sucursales y expansion" },
];

export function AccountSoporteTab({
  company,
  busy,
  supportSubject,
  setSupportSubject,
  supportCategory,
  setSupportCategory,
  supportPriority,
  setSupportPriority,
  supportDescription,
  setSupportDescription,
  onSupportTicket,
  onApplySupportTemplate,
  tickets,
  selectedTicketId,
  onSelectTicket,
  selectedTicket,
  messageLoading,
  messages,
  messageDraft,
  setMessageDraft,
  onSendMessage,
}: AccountSoporteTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreate = () => {
    onSupportTicket();
    setCreateOpen(false);
  };

  const openTickets  = tickets.filter((t) => t.status !== "closed");
  const closedTickets = tickets.filter((t) => t.status === "closed");

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <PageHeader title="Soporte" description="Gestiona tus tickets y conversa con el equipo." />
        <Button
          variant="primary"
          size="sm"
          className="w-full shrink-0 justify-center sm:w-auto"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setCreateOpen(true)}
        >
          Nuevo ticket
        </Button>
      </div>

      {/* Master-detail */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">

        {/* ── Ticket list (master) ── */}
        <div className="space-y-2 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          {tickets.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Sin tickets" description="Aun no tienes ningún ticket abierto." />
          ) : (
            <>
              {openTickets.map((ticket) => (
                <TicketListItem key={ticket.id} ticket={ticket} isSelected={selectedTicketId === ticket.id} onSelect={onSelectTicket} timezone={company.timezone} />
              ))}
              {closedTickets.length > 0 && (
                <>
                  <p className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Cerrados</p>
                  {closedTickets.map((ticket) => (
                    <TicketListItem key={ticket.id} ticket={ticket} isSelected={selectedTicketId === ticket.id} onSelect={onSelectTicket} timezone={company.timezone} closed />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* ── Conversation thread (detail) ── */}
        {!selectedTicket ? (
          <Card compact>
            <div className="flex h-64 items-center justify-center text-sm text-[#a1a1a6]">
              Selecciona un ticket para ver la conversacion.
            </div>
          </Card>
        ) : (
          <div
            className="flex flex-col overflow-hidden rounded-2xl border border-[#e5e5ea] bg-white shadow-sm shadow-indigo-500/[0.03]"
            style={{ minHeight: "min(420px, 72vh)", maxHeight: "min(560px, calc(100vh - 14rem))" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-[#e5e5ea] px-4 py-3.5 sm:gap-3 sm:px-5 sm:py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#1d1d1f]">{selectedTicket.subject}</p>
                <p className="mt-0.5 text-xs text-[#6e6e73]">{selectedTicket.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={priorityVariant[selectedTicket.priority as SupportPriority]}>{TICKET_PRIORITY_LABELS[selectedTicket.priority] ?? selectedTicket.priority}</Badge>
                <span className="text-[10px] text-[#a1a1a6]">
                  SLA {getTicketSlaHours(selectedTicket.priority)}h
                  {(() => {
                    const h = getTicketAgeHours(selectedTicket.createdAt);
                    if (h == null) return "";
                    const age = h < 24 ? `${Math.max(1, Math.floor(h))}h` : `${Math.floor(h / 24)}d`;
                    return ` · ${age} abierto`;
                  })()}
                </span>
              </div>
            </div>

            {/* Chat thread */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">
              {messageLoading ? (
                <p className="text-sm text-[#a1a1a6]">Cargando mensajes…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-[#a1a1a6]">Sin mensajes adicionales.</p>
              ) : messages.map((msg) => {
                const isTenant = msg.author_type === "tenant";
                return (
                  <div key={msg.id} className={`flex ${isTenant ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[min(92%,18rem)] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug sm:max-w-[80%] sm:px-4 sm:text-sm ${isTenant ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md bg-[#f5f5f7] text-[#1d1d1f]"}`}
                    >
                      <p>{msg.message}</p>
                      <p className={`mt-1 text-[10px] ${isTenant ? "text-indigo-200" : "text-[#a1a1a6]"}`}>{fmtDate(msg.created_at, company.timezone)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#e5e5ea] px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <textarea
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (messageDraft.trim()) onSendMessage(); } }}
                  placeholder="Escribe un mensaje…"
                  rows={2}
                  className="min-h-[4.5rem] w-full flex-1 resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:min-h-0"
                />
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full shrink-0 justify-center sm:w-auto"
                  icon={<Send className="h-3.5 w-3.5" />}
                  onClick={onSendMessage}
                  disabled={messageLoading || !messageDraft.trim()}
                >
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create ticket Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false); }} title="Nuevo ticket" description="El equipo te respondera en el tiempo correspondiente al SLA segun la prioridad.">
        <div className="space-y-4">
          {/* Quick templates */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Plantilla rapida</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => onApplySupportTemplate(t.kind)}
                  className="rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-xs font-medium text-[#6e6e73] transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs font-medium text-[#6e6e73]">
            Asunto
            <input
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              placeholder="Resume el problema en una frase"
              className="mt-1.5 h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-[#6e6e73]">
              Categoria
              <select
                value={supportCategory}
                onChange={(e) => setSupportCategory(e.target.value as SupportCategory)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {(Object.keys(TICKET_CATEGORY_LABELS) as SupportCategory[]).map((k) => (
                  <option key={k} value={k}>{TICKET_CATEGORY_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[#6e6e73]">
              Prioridad
              <select
                value={supportPriority}
                onChange={(e) => setSupportPriority(e.target.value as SupportPriority)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {(Object.keys(TICKET_PRIORITY_LABELS) as SupportPriority[]).map((k) => (
                  <option key={k} value={k}>{TICKET_PRIORITY_LABELS[k]}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-[#6e6e73]">
            Descripcion
            <textarea
              value={supportDescription}
              onChange={(e) => setSupportDescription(e.target.value)}
              placeholder="Describe el problema o solicitud con detalle"
              rows={4}
              className="mt-1.5 w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="primary" size="sm" loading={busy} disabled={busy || !supportSubject.trim()} onClick={handleCreate}>
            Crear ticket
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ── Ticket list item ──────────────────────────────────────────────
type TicketListItemProps = {
  ticket: TicketSummary;
  isSelected: boolean;
  onSelect: (id: string) => void;
  timezone: string;
  closed?: boolean;
};

function TicketListItem({ ticket, isSelected, onSelect, timezone, closed = false }: TicketListItemProps) {
  const statusLabel = TICKET_STATUS_LABELS[ticket.status] ?? ticket.status;
  const pv = priorityVariant[ticket.priority as SupportPriority] ?? "neutral";

  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      className={`group w-full rounded-xl border px-3 py-3 text-left transition ${
        isSelected
          ? "border-indigo-400 bg-indigo-50 shadow-sm shadow-indigo-500/10"
          : closed
          ? "border-[#e5e5ea] bg-[#fbfbfd] opacity-70 hover:opacity-100"
          : "border-[#e5e5ea] bg-white hover:border-[#d2d2d7] hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-1 text-sm font-medium text-[#1d1d1f]">{ticket.subject}</p>
        <Badge variant={pv} className="shrink-0">{TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</Badge>
      </div>
      <p className="mt-0.5 text-xs text-[#6e6e73]">{statusLabel} · {fmtDate(ticket.lastMessageAt, timezone)}</p>
    </button>
  );
}
