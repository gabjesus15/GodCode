"use client";

import { useState } from "react";
import { Save, Send, LifeBuoy, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { ticketStatus, ticketPriority } from "@/lib/super-admin/status-maps";
import { formatDateTime } from "@/lib/super-admin/format-utils";
import { useSaasListAnimate } from "@/components/super-admin/shared/use-saas-list-animate";

type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";
type TicketCategory = "general" | "billing" | "technical" | "product" | "account";

interface TicketMessage {
  id: string;
  ticket_id: string;
  author_type: "tenant" | "super_admin" | "system";
  author_email: string | null;
  is_internal: boolean;
  message: string;
  created_at: string;
}

interface TicketItem {
  id: string;
  companyId: string;
  companyName: string | null;
  companySlug: string | null;
  createdByEmail: string;
  source: "tenant" | "saas";
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  sla?: {
    firstResponseBreached: boolean;
    resolutionBreached: boolean;
    escalationLevel: "none" | "warning" | "critical";
  };
  lastMessageAt: string;
  createdAt: string;
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En progreso" },
  { value: "waiting_customer", label: "Esperando cliente" },
  { value: "resolved", label: "Resuelto" },
  { value: "closed", label: "Cerrado" },
];

interface TicketDetailPanelProps {
  ticket: TicketItem;
  messages: TicketMessage[];
  messagesLoading: boolean;
  saving: boolean;
  readOnly: boolean;
  onSave: (updates: { status: TicketStatus; assignedTo: string | null }) => Promise<void>;
  onSendMessage: (message: string, isInternal: boolean) => Promise<void>;
}

export function TicketDetailPanel({
  ticket,
  messages,
  messagesLoading,
  saving,
  readOnly,
  onSave,
  onSendMessage,
}: TicketDetailPanelProps) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignedTo, setAssignedTo] = useState(ticket.assignedTo ?? "");
  const [responseMessage, setResponseMessage] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [messagesRef] = useSaasListAnimate();

  const statusBadge = ticketStatus(ticket.status);
  const priorityBadge = ticketPriority(ticket.priority);

  const categoryLabels: Record<TicketCategory, string> = {
    general: "General",
    billing: "Facturación",
    technical: "Técnico",
    product: "Producto",
    account: "Cuenta",
  };

  const isSlaCritical = ticket.sla?.escalationLevel === "critical";
  const isSlaWarning = ticket.sla?.escalationLevel === "warning";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-zinc-100 p-4 dark:border-zinc-800 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <SaasStatusBadge label={statusBadge.label} variant={statusBadge.variant} />
          <SaasStatusBadge label={priorityBadge.label} variant={priorityBadge.variant} />
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {categoryLabels[ticket.category]}
          </span>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{ticket.subject}</h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {ticket.companyName || ticket.companyId} · {ticket.createdByEmail}
        </p>

        {(isSlaCritical || isSlaWarning) && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
              isSlaCritical
                ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            {isSlaCritical ? "SLA crítico" : "SLA en riesgo"}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* Description */}
        <Card className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {ticket.description}
          </p>
        </Card>

        {/* Management form */}
        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SaasSelect
              label="Estado"
              value={status}
              onChange={(value) => setStatus(value as TicketStatus)}
              options={STATUS_OPTIONS}
              disabled={readOnly}
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Asignar a
              </label>
              <Input
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
                placeholder="Email interno"
                disabled={readOnly}
              />
            </div>
          </div>

          <Button
            onClick={() =>
              void onSave({ status, assignedTo: assignedTo.trim() || null })
            }
            disabled={saving || readOnly}
            className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar gestión
          </Button>
        </div>

        {/* Messages */}
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Hilo del ticket</h4>
          {messagesLoading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-8 text-center dark:border-zinc-800">
              <LifeBuoy className="mb-2 h-6 w-6 text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Aún no hay mensajes.</p>
            </div>
          ) : (
            <div ref={messagesRef} className="grid gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-2xl border p-3 text-sm ${
                    msg.is_internal
                      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                      : "border-zinc-100 bg-white text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {msg.author_email || "Sistema"}
                    </p>
                    {msg.is_internal && (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
                        Interno
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                    {formatDateTime(msg.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply */}
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Responder</h4>
          <Textarea
            value={responseMessage}
            onChange={(event) => setResponseMessage(event.target.value)}
            rows={3}
            placeholder="Escribe una respuesta..."
            disabled={readOnly}
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SaasSwitch
              checked={internalNote}
              onChange={setInternalNote}
              label="Nota interna"
              description="No visible para el tenant"
            />
            <Button
              onClick={() => {
                if (!responseMessage.trim()) return;
                void onSendMessage(responseMessage.trim(), internalNote);
              }}
              disabled={saving || readOnly || !responseMessage.trim()}
              className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:w-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar mensaje
            </Button>
          </div>
        </div>

        {/* SLA footer */}
        <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">SLA</span>
          </div>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            <p>Primera respuesta: {ticket.firstResponseDueAt ? formatDateTime(ticket.firstResponseDueAt) : "-"}</p>
            <p>Resolución: {ticket.resolutionDueAt ? formatDateTime(ticket.resolutionDueAt) : "-"}</p>
          </div>
          {ticket.sla?.resolutionBreached && (
            <p className="mt-2 font-semibold text-red-600 dark:text-red-400">Incumplimiento crítico de resolución</p>
          )}
          {!ticket.sla?.resolutionBreached && ticket.sla?.firstResponseBreached && (
            <p className="mt-2 font-semibold text-amber-600 dark:text-amber-400">Incumplimiento de primera respuesta</p>
          )}
        </div>
      </div>
    </div>
  );
}
