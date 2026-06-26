"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Inbox, MessageSquarePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";
import { MasterDetailLayout } from "@/components/super-admin/shared/master-detail-layout";
import { TicketDetailPanel } from "./ticket-detail-panel";
import { ticketStatus, ticketPriority } from "@/lib/super-admin/status-maps";
import { formatDateTime } from "@/lib/super-admin/format-utils";
import { toast } from "sonner";

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

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En progreso" },
  { value: "waiting_customer", label: "Esperando cliente" },
  { value: "resolved", label: "Resuelto" },
  { value: "closed", label: "Cerrado" },
];

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todas las prioridades" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const CATEGORY_OPTIONS: TicketCategory[] = ["general", "billing", "technical", "product", "account"];
const CATEGORY_LABELS: Record<TicketCategory, string> = {
  general: "General",
  billing: "Facturación",
  technical: "Técnico",
  product: "Producto",
  account: "Cuenta",
};

const PRIORITY_SELECT: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

function showMessage(type: "success" | "error", text: string) {
  if (type === "success") toast.success(text);
  else toast.error(text);
}

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
  const [assignedFilter, setAssignedFilter] = useState<string>("");
  const [query, setQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<TicketCategory>("general");
  const [newPriority, setNewPriority] = useState<TicketPriority>("medium");

  const selectedTicket = useMemo(
    () => tickets.find((item) => item.id === selectedId) ?? null,
    [selectedId, tickets]
  );

  const slaMetrics = useMemo(() => {
    const breached = tickets.filter(
      (t) => t.sla?.resolutionBreached || t.sla?.firstResponseBreached
    ).length;
    const criticalOpen = tickets.filter(
      (t) => t.priority === "critical" && t.status !== "resolved" && t.status !== "closed"
    ).length;
    return { breached, criticalOpen };
  }, [tickets]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (assignedFilter.trim()) params.set("assignedTo", assignedFilter.trim());
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/super-admin/tickets?${params.toString()}`, {
        cache: "no-store",
      });
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
      showMessage("error", err instanceof Error ? err.message : "No se pudieron cargar tickets");
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, query, selectedId, statusFilter, assignedFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const loadMessages = useCallback(async (ticketId: string) => {
    if (!ticketId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/super-admin/tickets/${ticketId}/messages`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar mensajes");
      setMessages((data.messages ?? []) as TicketMessage[]);
    } catch (err) {
      setMessages([]);
      showMessage("error", err instanceof Error ? err.message : "No se pudieron cargar mensajes");
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

  const saveTicket = useCallback(
    async (updates: { status: TicketStatus; assignedTo: string | null }) => {
      if (!selectedTicket) return;
      setSaving(true);
      try {
        const res = await fetch("/api/super-admin/tickets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedTicket.id,
            status: updates.status,
            assignedTo: updates.assignedTo,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo guardar el ticket");
        showMessage("success", "Ticket actualizado correctamente");
        await loadTickets();
      } catch (err) {
        showMessage("error", err instanceof Error ? err.message : "No se pudo guardar el ticket");
      } finally {
        setSaving(false);
      }
    },
    [selectedTicket, loadTickets]
  );

  const sendMessage = useCallback(
    async (message: string, isInternal: boolean) => {
      if (!selectedTicket || !message.trim()) {
        showMessage("error", "Escribe un mensaje para enviar");
        return;
      }
      setSaving(true);
      try {
        const res = await fetch(`/api/super-admin/tickets/${selectedTicket.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message.trim(), isInternal }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo enviar el mensaje");
        showMessage("success", "Mensaje enviado correctamente");
        await Promise.all([loadTickets(), loadMessages(selectedTicket.id)]);
      } catch (err) {
        showMessage("error", err instanceof Error ? err.message : "No se pudo enviar el mensaje");
      } finally {
        setSaving(false);
      }
    },
    [selectedTicket, loadTickets, loadMessages]
  );

  const createTicket = async () => {
    if (!newCompanyId.trim() || !newSubject.trim() || !newDescription.trim()) {
      showMessage("error", "Completa companyId, asunto y descripción");
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
      showMessage("success", "Ticket creado correctamente");
      setNewCompanyId("");
      setNewSubject("");
      setNewDescription("");
      setNewCategory("general");
      setNewPriority("medium");
      setCreateOpen(false);
      await loadTickets();
      if (data.ticket?.id) {
        setSelectedId(data.ticket.id);
      }
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "No se pudo crear el ticket");
    } finally {
      setSaving(false);
    }
  };

  const renderListItem = (ticket: TicketItem, selected: boolean) => {
    const statusBadge = ticketStatus(ticket.status);
    const priorityBadge = ticketPriority(ticket.priority);
    const isSlaCritical = ticket.sla?.escalationLevel === "critical";

    return (
      <div
        className={`relative px-4 py-3 transition sm:px-5 sm:py-4 ${
          selected
            ? "bg-zinc-50 dark:bg-zinc-800/60"
            : "hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40"
        }`}
      >
        {selected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-zinc-900 dark:bg-zinc-100" />
        )}
        {isSlaCritical && (
          <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pr-6">
          <SaasStatusBadge label={statusBadge.label} variant={statusBadge.variant} />
          <SaasStatusBadge label={priorityBadge.label} variant={priorityBadge.variant} />
        </div>
        <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
          {ticket.subject}
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {ticket.companyName || ticket.companyId} · {ticket.createdByEmail}
        </p>
        {ticket.assignedTo && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Asignado: <span className="font-medium text-zinc-700 dark:text-zinc-300">{ticket.assignedTo}</span>
          </p>
        )}
        <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
          {formatDateTime(ticket.lastMessageAt || ticket.createdAt)}
        </p>
      </div>
    );
  };

  const renderDetail = (ticket: TicketItem) => (
    <TicketDetailPanel
      key={ticket.id}
      ticket={ticket}
      messages={messages}
      messagesLoading={messagesLoading}
      saving={saving}
      readOnly={readOnly}
      onSave={saveTicket}
      onSendMessage={sendMessage}
    />
  );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900/80">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total tickets
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{tickets.length}</p>
        </Card>
        <Card className="rounded-3xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900/80">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            SLA incumplidos
          </p>
          <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">{slaMetrics.breached}</p>
        </Card>
        <Card className="rounded-3xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900/80">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Críticos abiertos
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">{slaMetrics.criticalOpen}</p>
        </Card>
        <Card className="rounded-3xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900/80">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Sin asignar
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {tickets.filter((t) => !t.assignedTo && t.status !== "resolved" && t.status !== "closed").length}
          </p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SaasSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
          <SaasSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={PRIORITY_OPTIONS}
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar asunto/email"
          />
          <Input
            value={assignedFilter}
            onChange={(event) => setAssignedFilter(event.target.value)}
            placeholder="Asignado a (email)"
          />
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={readOnly}
          className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 lg:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo ticket
        </Button>
      </div>

      {/* Master-detail */}
      {loading && tickets.length === 0 ? (
        <Card className="rounded-3xl border border-zinc-200/60 bg-white p-8 text-center dark:border-zinc-800/60 dark:bg-zinc-900/80">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando tickets...</p>
        </Card>
      ) : (
        <MasterDetailLayout
          items={tickets}
          selectedId={selectedId}
          onSelect={setSelectedId}
          listKey={(ticket) => ticket.id}
          renderListItem={renderListItem}
          renderDetail={renderDetail}
          emptyState={
            <SaasEmptyState
              icon={Inbox}
              title="No hay tickets"
              description="No se encontraron tickets con los filtros seleccionados."
            />
          }
          className="min-h-[600px] lg:grid-cols-[380px_1fr]"
        />
      )}

      {/* Create modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear ticket manual"
        description="Abre un ticket de soporte en nombre de un negocio."
      >
        <div className="grid gap-4">
          <Input
            value={newCompanyId}
            onChange={(event) => setNewCompanyId(event.target.value)}
            placeholder="Company ID"
          />
          <Input
            value={newSubject}
            onChange={(event) => setNewSubject(event.target.value)}
            placeholder="Asunto"
          />
          <Textarea
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            rows={3}
            placeholder="Descripción"
          />
          <div className="grid grid-cols-2 gap-3">
            <SaasSelect
              label="Categoría"
              value={newCategory}
              onChange={(value) => setNewCategory(value as TicketCategory)}
              options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
            />
            <SaasSelect
              label="Prioridad"
              value={newPriority}
              onChange={(value) => setNewPriority(value as TicketPriority)}
              options={PRIORITY_SELECT}
            />
          </div>
          <Button
            onClick={() => void createTicket()}
            disabled={saving || readOnly}
            className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Crear ticket
          </Button>
        </div>
      </Modal>
    </div>
  );
}
