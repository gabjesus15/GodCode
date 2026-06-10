"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogFooter } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Alert } from "../../ui/Alert";
import {
  Globe,
  MapPin,
  Phone,
  Clock,
  Link,
  Send,
  Compass,
  CreditCard,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { BranchSummary } from "../../shared/customer-account-types";

type BranchEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: BranchSummary | null;
  onSaveSuccess: () => void;
};

const ALL_PAYMENT_METHODS = [
  { id: "efectivo", label: "Efectivo", description: "Pago físico en efectivo" },
  { id: "tarjeta", label: "Tarjeta de Débito/Crédito", description: "Pago físico con POS" },
  { id: "pago_movil", label: "Pago Móvil", description: "Transferencia rápida móvil (VE)" },
  { id: "zelle", label: "Zelle", description: "Transferencias Zelle (US)" },
  { id: "transferencia_bancaria", label: "Transferencia Bancaria", description: "Depósito o transferencia local" },
  { id: "stripe", label: "Stripe", description: "Pasarela de pago internacional" },
  { id: "mercadopago", label: "Mercado Pago", description: "Pasarela de pago en Latam" },
  { id: "paypal", label: "PayPal", description: "Pagos globales por PayPal" },
];

const parseJsonField = (field: unknown): Record<string, string> => {
  if (!field) return {};
  if (typeof field === "object") return (field as Record<string, string>) || {};
  if (typeof field === "string") {
    try {
      return JSON.parse(field) as Record<string, string>;
    } catch {
      return {};
    }
  }
  return {};
};

export function BranchEditModal({ open, onOpenChange, branch, onSaveSuccess }: BranchEditModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "payments">("general");

  // General fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [schedule, setSchedule] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [originLat, setOriginLat] = useState("");
  const [originLng, setOriginLng] = useState("");

  // Payment fields
  const [activeMethods, setActiveMethods] = useState<string[]>([]);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  // Pago Móvil details
  const [pmBanco, setPmBanco] = useState("");
  const [pmTelefono, setPmTelefono] = useState("");
  const [pmIdentificacion, setPmIdentificacion] = useState("");

  // Zelle details
  const [zelleEmail, setZelleEmail] = useState("");
  const [zelleName, setZelleName] = useState("");

  // Transferencia Bancaria details
  const [tbBanco, setTbBanco] = useState("");
  const [tbTipoCuenta, setTbTipoCuenta] = useState("");
  const [tbNroCuenta, setTbNroCuenta] = useState("");
  const [tbIdentificacion, setTbIdentificacion] = useState("");
  const [tbTitular, setTbTitular] = useState("");
  const [tbEmail, setTbEmail] = useState("");

  // Stripe details
  const [stripePk, setStripePk] = useState("");
  const [stripeSk, setStripeSk] = useState("");

  // Mercado Pago details
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [mpAccessToken, setMpAccessToken] = useState("");

  // PayPal details
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalSecretKey, setPaypalSecretKey] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branch) {
      setActiveTab("general");
      setName(branch.name || "");
      setPhone(branch.phone || "");
      setAddress(branch.address || "");
      setSchedule(branch.schedule || "");
      setInstagramUrl(branch.instagram_url || "");
      setWhatsappUrl(branch.whatsapp_url || "");
      setMapUrl(branch.map_url || "");
      setOriginLat(branch.origin_lat != null ? String(branch.origin_lat) : "");
      setOriginLng(branch.origin_lng != null ? String(branch.origin_lng) : "");

      // Load payments
      setActiveMethods(branch.payment_methods || []);
      setExpandedDetails(new Set());

      // Pago móvil
      const pm = parseJsonField(branch.pago_movil);
      setPmBanco(pm.banco || "");
      setPmTelefono(pm.telefono || "");
      setPmIdentificacion(pm.identificacion || "");

      // Zelle
      const z = parseJsonField(branch.zelle);
      setZelleEmail(z.email || "");
      setZelleName(z.name || "");

      // Transferencia bancaria
      const tb = parseJsonField(branch.transferencia_bancaria);
      setTbBanco(tb.banco || "");
      setTbTipoCuenta(tb.tipo_cuenta || "");
      setTbNroCuenta(tb.nro_cuenta || "");
      setTbIdentificacion(tb.identificacion || "");
      setTbTitular(tb.titular || "");
      setTbEmail(tb.email || "");

      // Stripe
      const st = parseJsonField(branch.stripe);
      setStripePk(st.publishable_key || "");
      setStripeSk(st.secret_key || "");

      // Mercado Pago
      const mp = parseJsonField(branch.mercadopago);
      setMpPublicKey(mp.public_key || "");
      setMpAccessToken(mp.access_token || "");

      // PayPal
      const pp = parseJsonField(branch.paypal);
      setPaypalClientId(pp.client_id || "");
      setPaypalSecretKey(pp.client_secret || "");

      setError(null);
    }
  }, [branch, open]);

  const togglePaymentMethod = (id: string) => {
    setActiveMethods((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      return next;
    });
  };

  const toggleDetail = (method: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;
    if (!name.trim()) {
      setError("El nombre de la sucursal es requerido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        id: branch.id,
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        schedule: schedule.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        whatsapp_url: whatsappUrl.trim() || null,
        map_url: mapUrl.trim() || null,
        origin_lat: originLat.trim() ? Number(originLat) : null,
        origin_lng: originLng.trim() ? Number(originLng) : null,
        payment_methods: activeMethods,
        pago_movil: activeMethods.includes("pago_movil")
          ? {
              banco: pmBanco.trim() || null,
              telefono: pmTelefono.trim() || null,
              identificacion: pmIdentificacion.trim() || null,
            }
          : null,
        zelle: activeMethods.includes("zelle")
          ? {
              email: zelleEmail.trim() || null,
              name: zelleName.trim() || null,
            }
          : null,
        transferencia_bancaria: activeMethods.includes("transferencia_bancaria")
          ? {
              banco: tbBanco.trim() || null,
              tipo_cuenta: tbTipoCuenta.trim() || null,
              nro_cuenta: tbNroCuenta.trim() || null,
              identificacion: tbIdentificacion.trim() || null,
              titular: tbTitular.trim() || null,
              email: tbEmail.trim() || null,
            }
          : null,
        stripe: activeMethods.includes("stripe")
          ? {
              publishable_key: stripePk.trim() || null,
              secret_key: stripeSk.trim() || null,
            }
          : null,
        mercadopago: activeMethods.includes("mercadopago")
          ? {
              public_key: mpPublicKey.trim() || null,
              access_token: mpAccessToken.trim() || null,
            }
          : null,
        paypal: activeMethods.includes("paypal")
          ? {
              client_id: paypalClientId.trim() || null,
              client_secret: paypalSecretKey.trim() || null,
            }
          : null,
      };

      const res = await fetch("/api/customer-account/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar la sucursal");
      }

      router.refresh();
      onSaveSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition duration-150";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Editar Sucursal: ${branch?.name || ""}`}
      description="Personaliza los datos y configura los métodos de pago habilitados para el carrito de compras."
      size="xl"
    >
      <div className="mb-5 flex border-b border-[#e5e5ea]">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "general"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-[#8e8e93] hover:text-[#6e6e73]"
          }`}
        >
          <Settings className="w-4 h-4" /> Información General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "payments"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-[#8e8e93] hover:text-[#6e6e73]"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Métodos de Pago
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        {activeTab === "general" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Col 1: Datos básicos */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8e8e93] flex items-center gap-1.5 border-b border-[#f5f5f7] pb-1">
                <Clock className="w-3.5 h-3.5" /> Detalles de Operación
              </h4>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  Nombre de la Sucursal <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Sucursal Centro"
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  Teléfono de Contacto
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +56912345678"
                    className={`${inputClass} pl-9`}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  Dirección
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej. Av. Providencia 1234, Oficina 50"
                    className={`${inputClass} pl-9`}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  Horarios de Atención
                </label>
                <textarea
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="Ej. Lunes a Viernes 09:00 a 19:00, Sábados 10:00 a 14:00"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition duration-150"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Col 2: Social Media, Map, Geolocation */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8e8e93] flex items-center gap-1.5 border-b border-[#f5f5f7] pb-1">
                <Globe className="w-3.5 h-3.5" /> Enlaces y Mapa
              </h4>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  Enlace WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
                    <Send className="w-4 h-4" />
                  </span>
                  <input
                    value={whatsappUrl}
                    onChange={(e) => setWhatsappUrl(e.target.value)}
                    placeholder="Ej. https://wa.me/56912345678"
                    className={`${inputClass} pl-9`}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  Enlace Instagram
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
                    <Link className="w-4 h-4" />
                  </span>
                  <input
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="Ej. https://instagram.com/mitienda"
                    className={`${inputClass} pl-9`}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  Enlace de Google Maps
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    value={mapUrl}
                    onChange={(e) => setMapUrl(e.target.value)}
                    placeholder="Ej. https://maps.app.goo.gl/..."
                    className={`${inputClass} pl-9`}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">
                    Latitud de Origen
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
                      <Compass className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={originLat}
                      onChange={(e) => setOriginLat(e.target.value)}
                      placeholder="-33.456"
                      className={`${inputClass} pl-8`}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">
                    Longitud de Origen
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
                      <Compass className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={originLng}
                      onChange={(e) => setOriginLng(e.target.value)}
                      placeholder="-70.648"
                      className={`${inputClass} pl-8`}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8e8e93] border-b border-[#f5f5f7] pb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Métodos de Pago Activos
              </h4>
              <p className="mb-4 text-xs text-[#8e8e93]">
                Habilita los métodos que tus clientes verán al pagar en el carrito.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ALL_PAYMENT_METHODS.map((method) => {
                  const isActive = activeMethods.includes(method.id);
                  return (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer select-none flex-col gap-1.5 rounded-xl border p-4.5 transition-all duration-200 ${
                        isActive
                          ? "border-indigo-600 bg-indigo-50/15 ring-2 ring-indigo-600/10"
                          : "border-[#e5e5ea] bg-white hover:border-[#d2d2d7]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-[#1d1d1f]">{method.label}</span>
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => togglePaymentMethod(method.id)}
                          className="h-4.5 w-4.5 rounded border-[#d2d2d7] text-indigo-600 focus:ring-indigo-500/20"
                        />
                      </div>
                      <span className="text-[11px] leading-snug text-[#8e8e93]">{method.description}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Payment Details forms */}
            {activeMethods.some((m) => ["pago_movil", "zelle", "transferencia_bancaria", "stripe", "mercadopago", "paypal"].includes(m)) && (
              <div className="space-y-3">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8e8e93] border-b border-[#f5f5f7] pb-1 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Detalles de Métodos Digitales
                </h4>

                <div className="space-y-3">
                  {/* Pago Móvil */}
                  {activeMethods.includes("pago_movil") && (
                    <div className="overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#fbfbfd]">
                      <button
                        type="button"
                        onClick={() => toggleDetail("pago_movil")}
                        className="flex w-full items-center justify-between px-4.5 py-3 text-left transition hover:bg-[#f5f5f7]"
                      >
                        <span className="text-sm font-semibold text-[#1d1d1f]">Datos para Pago Móvil</span>
                        {expandedDetails.has("pago_movil") ? (
                          <ChevronDown className="h-4 w-4 text-[#8e8e93]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#8e8e93]" />
                        )}
                      </button>
                      {expandedDetails.has("pago_movil") && (
                        <div className="border-t border-[#e5e5ea] bg-white p-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Banco</label>
                            <input value={pmBanco} onChange={(e) => setPmBanco(e.target.value)} placeholder="Ej. Banesco" className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Teléfono</label>
                            <input value={pmTelefono} onChange={(e) => setPmTelefono(e.target.value)} placeholder="Ej. 04121234567" className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Cédula/RIF</label>
                            <input value={pmIdentificacion} onChange={(e) => setPmIdentificacion(e.target.value)} placeholder="Ej. V-12345678" className={inputClass} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zelle */}
                  {activeMethods.includes("zelle") && (
                    <div className="overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#fbfbfd]">
                      <button
                        type="button"
                        onClick={() => toggleDetail("zelle")}
                        className="flex w-full items-center justify-between px-4.5 py-3 text-left transition hover:bg-[#f5f5f7]"
                      >
                        <span className="text-sm font-semibold text-[#1d1d1f]">Datos para Zelle</span>
                        {expandedDetails.has("zelle") ? (
                          <ChevronDown className="h-4 w-4 text-[#8e8e93]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#8e8e93]" />
                        )}
                      </button>
                      {expandedDetails.has("zelle") && (
                        <div className="border-t border-[#e5e5ea] bg-white p-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Correo Electrónico Zelle</label>
                            <input value={zelleEmail} onChange={(e) => setZelleEmail(e.target.value)} placeholder="Ej. pagos@miempresa.com" className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Nombre del Titular</label>
                            <input value={zelleName} onChange={(e) => setZelleName(e.target.value)} placeholder="Ej. Inversiones Rojas S.A." className={inputClass} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transferencia Bancaria */}
                  {activeMethods.includes("transferencia_bancaria") && (
                    <div className="overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#fbfbfd]">
                      <button
                        type="button"
                        onClick={() => toggleDetail("transferencia_bancaria")}
                        className="flex w-full items-center justify-between px-4.5 py-3 text-left transition hover:bg-[#f5f5f7]"
                      >
                        <span className="text-sm font-semibold text-[#1d1d1f]">Datos para Transferencia Bancaria</span>
                        {expandedDetails.has("transferencia_bancaria") ? (
                          <ChevronDown className="h-4 w-4 text-[#8e8e93]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#8e8e93]" />
                        )}
                      </button>
                      {expandedDetails.has("transferencia_bancaria") && (
                        <div className="border-t border-[#e5e5ea] bg-white p-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Banco</label>
                            <input value={tbBanco} onChange={(e) => setTbBanco(e.target.value)} placeholder="Ej. Banco de Chile" className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Tipo de Cuenta</label>
                            <input value={tbTipoCuenta} onChange={(e) => setTbTipoCuenta(e.target.value)} placeholder="Ej. Cuenta Corriente" className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Número de Cuenta</label>
                            <input value={tbNroCuenta} onChange={(e) => setTbNroCuenta(e.target.value)} placeholder="Ej. 1234567890" className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Documento ID / RUT</label>
                            <input value={tbIdentificacion} onChange={(e) => setTbIdentificacion(e.target.value)} placeholder="Ej. 76.123.456-7" className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Nombre Titular</label>
                            <input value={tbTitular} onChange={(e) => setTbTitular(e.target.value)} placeholder="Ej. Mi Tienda SpA" className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Correo de Confirmación</label>
                            <input value={tbEmail} onChange={(e) => setTbEmail(e.target.value)} placeholder="Ej. transferencias@mitienda.com" className={inputClass} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stripe */}
                  {activeMethods.includes("stripe") && (
                    <div className="overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#fbfbfd]">
                      <button
                        type="button"
                        onClick={() => toggleDetail("stripe")}
                        className="flex w-full items-center justify-between px-4.5 py-3 text-left transition hover:bg-[#f5f5f7]"
                      >
                        <span className="text-sm font-semibold text-[#1d1d1f]">Configuración Stripe</span>
                        {expandedDetails.has("stripe") ? (
                          <ChevronDown className="h-4 w-4 text-[#8e8e93]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#8e8e93]" />
                        )}
                      </button>
                      {expandedDetails.has("stripe") && (
                        <div className="border-t border-[#e5e5ea] bg-white p-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Publishable Key (pk_...)</label>
                            <input value={stripePk} onChange={(e) => setStripePk(e.target.value)} placeholder="pk_live_..." className={inputClass} type="password" />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Secret Key (sk_...)</label>
                            <input value={stripeSk} onChange={(e) => setStripeSk(e.target.value)} placeholder="sk_live_..." className={inputClass} type="password" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mercado Pago */}
                  {activeMethods.includes("mercadopago") && (
                    <div className="overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#fbfbfd]">
                      <button
                        type="button"
                        onClick={() => toggleDetail("mercadopago")}
                        className="flex w-full items-center justify-between px-4.5 py-3 text-left transition hover:bg-[#f5f5f7]"
                      >
                        <span className="text-sm font-semibold text-[#1d1d1f]">Configuración Mercado Pago</span>
                        {expandedDetails.has("mercadopago") ? (
                          <ChevronDown className="h-4 w-4 text-[#8e8e93]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#8e8e93]" />
                        )}
                      </button>
                      {expandedDetails.has("mercadopago") && (
                        <div className="border-t border-[#e5e5ea] bg-white p-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Public Key (APP_USR-...)</label>
                            <input value={mpPublicKey} onChange={(e) => setMpPublicKey(e.target.value)} placeholder="APP_USR-..." className={inputClass} type="password" />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Access Token (APP_USR-...)</label>
                            <input value={mpAccessToken} onChange={(e) => setMpAccessToken(e.target.value)} placeholder="APP_USR-..." className={inputClass} type="password" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PayPal */}
                  {activeMethods.includes("paypal") && (
                    <div className="overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#fbfbfd]">
                      <button
                        type="button"
                        onClick={() => toggleDetail("paypal")}
                        className="flex w-full items-center justify-between px-4.5 py-3 text-left transition hover:bg-[#f5f5f7]"
                      >
                        <span className="text-sm font-semibold text-[#1d1d1f]">Configuración PayPal</span>
                        {expandedDetails.has("paypal") ? (
                          <ChevronDown className="h-4 w-4 text-[#8e8e93]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#8e8e93]" />
                        )}
                      </button>
                      {expandedDetails.has("paypal") && (
                        <div className="border-t border-[#e5e5ea] bg-white p-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Client ID</label>
                            <input value={paypalClientId} onChange={(e) => setPaypalClientId(e.target.value)} placeholder="Client ID de PayPal" className={inputClass} type="password" />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-[#6e6e73]">Client Secret</label>
                            <input value={paypalSecretKey} onChange={(e) => setPaypalSecretKey(e.target.value)} placeholder="Client Secret de PayPal" className={inputClass} type="password" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
