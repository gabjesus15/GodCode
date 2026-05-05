"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LifeBuoy, MessageSquarePlus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

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

const STATUS_OPTIONS: TicketStatus[] = ["open", "in_progress", "waiting_customer", "resolved", "closed"];
const PRIORITY_OPTIONS: TicketPriority[] = ["low", "medium", "high", "critical"];
const CATEGORY_OPTIONS: TicketCategory[] = ["general", "billing", "technical", "product", "account"];

export default function TicketsManager() {
  const { readOnly } = useAdminRole();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const [assignTo, setAssignTo] = useState("");
  const [nextStatus, setNextStatus] = useState<TicketStatus>("open");
  const [responseMessage, setResponseMessage] = useState("");
  const [internalNote, setInternalNote] = useState(false);

  const [newCompanyId, setNewCompanyId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<TicketCategory>("general");
  const [newPriority, setNewPriority] = useState<TicketPriority>("medium");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedTicket = useMemo(
    () => tickets.find((item) => item.id === selectedId) ?? null,
    [selectedId, tickets]
  );

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (assignedFilter !== "all") params.set("assignedTo", assignedFilter);
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/super-admin/tickets?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar tickets");
      const items = (data.tickets ?? []) as TicketItem[];
      setTickets(items);
      if (!selectedId && items.length > 0) {
        setSelectedId(items[0].id);
      }
      if (selectedId && !items.some((item) => item.id === selectedId)) {
        setSelectedId(items[0]?.id ?? null);
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudieron cargar tickets" });
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, query, selectedId, statusFilter, assignedFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicket) return;
    setAssignTo(selectedTicket.assignedTo ?? "");
    setNextStatus(selectedTicket.status);
    setResponseMessage("");
    setInternalNote(false);
  }, [selectedTicket]);

  const loadMessages = useCallback(async (ticketId: string) => {
    if (!ticketId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/super-admin/tickets/${ticketId}/messages`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar mensajes");
      setMessages((data.messages ?? []) as TicketMessage[]);
    } catch (err) {
      setMessages([]);
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudieron cargar mensajes" });
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

  const saveTicket = async () => {
    if (!selectedTicket) return;

    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTicket.id,
          status: nextStatus,
          assignedTo: assignTo.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el ticket");

      setMessage({ type: "success", text: "Ticket actualizado" });
      await loadTickets();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo guardar el ticket" });
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !responseMessage.trim()) {
      setMessage({ type: "error", text: "Escribe un mensaje para enviar" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: responseMessage.trim(),
          isInternal: internalNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el mensaje");

      setResponseMessage("");
      setInternalNote(false);
      setMessage({ type: "success", text: "Mensaje enviado" });
      await Promise.all([loadTickets(), loadMessages(selectedTicket.id)]);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo enviar el mensaje" });
    } finally {
      setSaving(false);
    }
  };

  const createTicket = async () => {
    if (!newCompanyId.trim() || !newSubject.trim() || !newDescription.trim()) {
      setMessage({ type: "error", text: "Completa companyId, asunto y descripción" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: newCompanyId.trim(),
          subject: newSubject.trim(),
          description: newDescription.trim(),
          category: newCategory,
          priority: newPriority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el ticket");

      setMessage({ type: "success", text: "Ticket creado" });
      setNewSubject("");
      setNewDescription("");
      await loadTickets();
      if (data.ticket?.id) {
        setSelectedId(data.ticket.id);
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo crear el ticket" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[1.15fr_1fr]">
      <Card className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-4">
        <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          <select title="Selecciona una opción"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="all">estado: todos</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select title="Selecciona una opción"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="all">prioridad: todas</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar asunto/email"
            className="md:col-span-2"
          />
          <Input
            value={assignedFilter}
            onChange={(event) => setAssignedFilter(event.target.value)}
            placeholder="Asignado a (email)"
            className="md:col-span-1"
          />
        </div>

        {message ? (
          <div
            className={`mb-3 rounded-lg border p-3 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
          {loading ? <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Cargando tickets...</div> : null}

          {!loading && tickets.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">No hay tickets con esos filtros.</div>
          ) : null}

          {tickets.map((ticket) => {
            const active = ticket.id === selectedId;
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedId(ticket.id)}
                className={`w-full px-4 py-3 text-left transition ${
                  active ? "bg-zinc-100 dark:bg-zinc-800/70 border-l-4 border-blue-500" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      {ticket.subject}
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                        ticket.status === "open" ? "bg-green-100 text-green-700" :
                        ticket.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        ticket.status === "waiting_customer" ? "bg-yellow-100 text-yellow-700" :
                        ticket.status === "resolved" ? "bg-gray-100 text-gray-700" :
                        ticket.status === "closed" ? "bg-zinc-300 text-zinc-700" : "bg-zinc-100 text-zinc-700"
                      }`}>{ticket.status}</span>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                        ticket.priority === "critical" ? "bg-red-100 text-red-700" :
                        ticket.priority === "high" ? "bg-orange-100 text-orange-700" :
                        ticket.priority === "medium" ? "bg-blue-100 text-blue-700" :
                        ticket.priority === "low" ? "bg-gray-100 text-gray-700" : "bg-zinc-100 text-zinc-700"
                      }`}>{ticket.priority}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {ticket.companyName || ticket.companyId} · {ticket.createdByEmail}
                      {ticket.assignedTo ? (
                        <span className="ml-2 font-semibold text-blue-600 dark:text-blue-300">Asignado: {ticket.assignedTo}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                    {ticket.sla?.escalationLevel === "critical" ? (
                      <p className="font-semibold text-red-500">SLA crítico</p>
                    ) : ticket.sla?.escalationLevel === "warning" ? (
                      <p className="font-semibold text-amber-500">SLA en riesgo</p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 sm:gap-6">
        <Card className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Crear ticket manual</h3>
          <div className="grid gap-3">
            <Input value={newCompanyId} onChange={(event) => setNewCompanyId(event.target.value)} placeholder="Company ID" />
            <Input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Asunto" />
            <textarea
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              rows={3}
              placeholder="Descripción"
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="grid grid-cols-2 gap-3">
              <select title="Selecciona una opción"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value as TicketCategory)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select title="Selecciona una opción"
                value={newPriority}
                onChange={(event) => setNewPriority(event.target.value as TicketPriority)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={() => void createTicket()} disabled={saving || readOnly} className="bg-zinc-900 hover:bg-zinc-800">
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Crear ticket
            </Button>
          </div>
        </Card>

        <Card className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-4">
          {!selectedTicket ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Selecciona un ticket para gestionarlo.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Ticket seleccionado</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{selectedTicket.subject}</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedTicket.companyName || selectedTicket.companyId} · {selectedTicket.createdByEmail}
                </p>
              </div>

              <div className="grid gap-3">
                <select title="Selecciona una opción"
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value as TicketStatus)}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <Input
                  value={assignTo}
                  onChange={(event) => setAssignTo(event.target.value)}
                  placeholder="Asignar a (email interno)"
                />

                <textarea
                  value={responseMessage}
                  onChange={(event) => setResponseMessage(event.target.value)}
                  rows={3}
                  placeholder="Escribe respuesta del soporte"
                  className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
                />

                <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={internalNote}
                    onChange={(event) => setInternalNote(event.target.checked)}
                  />
                  Nota interna (no visible tenant)
                </label>

                <Button onClick={() => void sendMessage()} disabled={saving || readOnly} variant="outline">
                  Enviar mensaje al hilo
                </Button>

                <Button onClick={() => void saveTicket()} disabled={saving || readOnly} className="bg-zinc-900 hover:bg-zinc-800">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar gestión
                </Button>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Hilo del ticket</p>
                {messagesLoading ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Cargando mensajes...</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Aún no hay mensajes.</p>
                ) : (
                  <div className="grid gap-2">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg border p-2 text-xs ${
                          msg.is_internal
                            ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300"
                            : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        <p className="font-semibold">
                          {msg.author_type} · {msg.author_email || "sistema"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{msg.message}</p>
                        <p className="mt-1 opacity-70">{new Date(msg.created_at).toLocaleString("es-CL")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                <p>Primera respuesta SLA: {selectedTicket.firstResponseDueAt ? new Date(selectedTicket.firstResponseDueAt).toLocaleString("es-CL") : "-"}</p>
                <p>Resolución SLA: {selectedTicket.resolutionDueAt ? new Date(selectedTicket.resolutionDueAt).toLocaleString("es-CL") : "-"}</p>
                {selectedTicket.sla?.resolutionBreached ? <p className="font-semibold text-red-500">Incumplimiento crítico de resolución</p> : null}
                {!selectedTicket.sla?.resolutionBreached && selectedTicket.sla?.firstResponseBreached ? <p className="font-semibold text-amber-500">Incumplimiento de primera respuesta</p> : null}
              </div>
            </div>
          )}
        </Card>

        <Card className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300 sm:p-4">
          <LifeBuoy className="mr-2 inline h-4 w-4" />
          Este tab centraliza tickets por empresa en una sola cola y aplica SLA básico por prioridad automáticamente.
        </Card>
      </div>
    </div>
  );
}
