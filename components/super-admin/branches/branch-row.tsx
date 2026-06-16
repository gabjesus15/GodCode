"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { revalidateMenuCache } from "@/app/actions/revalidate";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { requireAdminRole, roleSets } from "@/utils/admin";
import { logAdminAction } from "@/utils/audit";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import {
	effectiveDeliveryPricingMode,
	mergeDeliverySettingsJson,
	normalizeDeliverySettings,
} from "@/lib/delivery/delivery-settings";

import { ChevronDown, ChevronRight, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Checkbox } from "@/components/ui/checkbox";

// Types
export type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  instagram: string;
  schedule: string;
  country: string;
  currency: string;
  payment_methods: string[];
    pago_movil?: {
        banco?: string;
        telefono?: string;
        identificacion?: string;
    } | null;
    zelle?: {
        email?: string;
        name?: string;
    } | null;
    transferencia_bancaria?: {
        banco?: string;
        nro_cuenta?: string;
        tipo_cuenta?: string;
        identificacion?: string; // rut, ci, dni
        titular?: string;
        email?: string;
    } | null;
    stripe?: { [key: string]: string } | null;
    mercadopago?: { [key: string]: string } | null;
    paypal?: { [key: string]: string } | null;
    is_active: boolean;
    company_id: string;
    delivery_settings?: unknown;
    [key: string]: unknown;
};

// Schema de validación Zod - Define las reglas y tipos automáticamente
const branchFormSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    slug: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().min(1, "El teléfono es requerido"),
    instagram: z.string().optional(),
    schedule: z.string().optional(),
    country: z.string().min(1, "El país es requerido"),
    currency: z.string().min(1, "La moneda es requerida"),
    payment_methods: z.array(z.string()),
    // Objetos dinámicos: z.any() permite flexibilidad para los campos cambiantes por país
    pago_movil: z.any(),
    zelle: z.any(),
    transferencia_bancaria: z.any(),
    stripe: z.any(),
    mercadopago: z.any(),
    paypal: z.any(),
    uberExternalEnabled: z.boolean(),
    uberStoreId: z.string().optional(),
    uberShowFeeAmount: z.boolean(),
    uberDisplayText: z.string().optional(),
    is_active: z.boolean(),
}).refine(
    (d) =>
        !d.uberExternalEnabled ||
        Boolean(d.uberStoreId && String(d.uberStoreId).trim().length > 0),
    {
        path: ["uberStoreId"],
        message: "Indica el store id de Uber para esta sucursal.",
    },
);

// TypeScript infiere el tipo desde el esquema Zod
type BranchFormValues = z.infer<typeof branchFormSchema>;

interface BranchRowProps {
  branch: Branch;
}

const ALL_PAYMENT_METHODS = [
  "efectivo",
  "tarjeta",
  "pago_movil",
  "zelle",
  "transferencia_bancaria",
  "stripe",
  "mercadopago",
  "paypal",
];

const COUNTRY_OPTIONS = [
    { value: "CL", label: "Chile" },
    { value: "VE", label: "Venezuela" },
    { value: "US", label: "Estados Unidos" },
    { value: "MX", label: "México" },
    { value: "CO", label: "Colombia" },
    { value: "AR", label: "Argentina" },
    { value: "PE", label: "Perú" },
    { value: "EC", label: "Ecuador" },
    { value: "ES", label: "España" },
    { value: "OTRO", label: "Otro" },
];

const CURRENCY_OPTIONS = [
    { value: "CLP", label: "Peso Chileno (CLP)" },
    { value: "VES", label: "Bolívar (VES)" },
    { value: "USD", label: "Dólar (USD)" },
    { value: "MXN", label: "Peso Mexicano (MXN)" },
    { value: "COP", label: "Peso Colombiano (COP)" },
    { value: "ARS", label: "Peso Argentino (ARS)" },
    { value: "PEN", label: "Sol Peruano (PEN)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "OTRO", label: "Otro" },
];

// Lógica dinámica para los campos según país
const getPaymentMethodFields = (method: string, country: string): { key: string; label: string }[] | null => {
    // Métodos físicos sin formulario
    if (["efectivo", "tarjeta"].includes(method)) return null;

    // Métodos digitales y transferencias
    switch (method) {
        case "pago_movil":
            // Típicamente Venezuela
            return [
                { key: "banco", label: "Banco" },
                { key: "telefono", label: "Teléfono" },
                { key: "identificacion", label: country === "VE" ? "Cédula" : "Identificación" }
            ];
        case "zelle":
            return [
                { key: "email", label: "Correo Electrónico" },
                { key: "name", label: "Nombre Titular" }
            ];
        case "transferencia_bancaria":
            const idLabel = country === "CL" ? "RUT" : (country === "VE" ? "Cédula/RIF" : "Documento ID");
            const fields = [
                { key: "banco", label: "Banco" },
                { key: "tipo_cuenta", label: "Tipo de Cuenta" },
                { key: "nro_cuenta", label: "Nro. Cuenta" },
                { key: "identificacion", label: idLabel },
                { key: "titular", label: "Nombre Titular" },
                { key: "email", label: "Correo Confirmación" }
            ];
            return fields;
        case "stripe":
            return [
                { key: "publishable_key", label: "Publishable Key (PK)" },
                { key: "secret_key", label: "Secret Key (SK)" }
            ];
        case "mercadopago":
            return [
                { key: "public_key", label: "Public Key" },
                { key: "access_token", label: "Access Token" }
            ];
        case "paypal":
            return [
                { key: "client_id", label: "Client ID" },
                { key: "client_secret", label: "Client Secret" }
            ];
        default:
            return [];
    }
};

// Main Component
export function BranchRow({ branch }: BranchRowProps) {
    const [isEditing, setIsEditing] = useState(false);

    if (isEditing) {
        return <BranchEditForm branch={branch} onCancel={() => setIsEditing(false)} />;
    }

    return <BranchView branch={branch} onEdit={() => setIsEditing(true)} />;
}

// View Component
function BranchView({ branch, onEdit }: { branch: Branch, onEdit: () => void }) {
    const { readOnly } = useAdminRole();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [deletePassword, setDeletePassword] = useState("");
    const supabase = createSupabaseBrowserClient("super-admin");
    const router = useRouter();


    const handleDeleteConfirm = async () => {
        const auth = await requireAdminRole(roleSets.destructive);
        if (!auth.ok) return setGlobalError(auth.error);

        if (!deletePassword) {
            setFormErrors(prev => ({ ...prev, delete_password: "Password is required." }));
            return;
        }

        setIsLoading(true);
        setGlobalError(null);

        const { error: deleteError } = await supabase.from("branches").delete().eq("id", branch.id);

        if (deleteError) {
            setGlobalError(`Error eliminando: ${deleteError.message}`);
        } else {
            await logAdminAction({ action: "delete_branch", targetType: "branch", targetId: branch.id, companyId: branch.company_id, metadata: { details: `Branch ${branch.name} deleted by ${auth.email}` } });
            setIsDeleting(false);
            await revalidateMenuCache(branch.company_id);
            router.refresh();
        }
        setIsLoading(false);
    }

    return (
        <>
            <div className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600 sm:grid-cols-2 md:grid-cols-6 md:items-start sm:p-5">
                <div className="min-w-0 md:col-span-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {branch.name}
                    </h3>
                    <span className="mt-1 inline-block rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {branch.slug}
                    </span>
                </div>
                <div className="min-w-0 space-y-1.5 md:col-span-2">
                    {branch.address ? (
                        <div className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
                            <span>{branch.address}</span>
                        </div>
                    ) : null}
                    {branch.phone ? (
                        <div className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
                            <span>{branch.phone}</span>
                        </div>
                    ) : null}
                    {!branch.address && !branch.phone ? (
                        <span className="text-sm text-zinc-400 dark:text-zinc-500">Sin dirección ni teléfono</span>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:col-span-2 md:justify-end">
                    {effectiveDeliveryPricingMode(
                        normalizeDeliverySettings(branch.delivery_settings),
                    ) === "external" ? (
                        <Badge variant="neutral" className="shrink-0">
                            Uber Direct
                        </Badge>
                    ) : null}
                    <Badge variant={branch.is_active ? "success" : "destructive"} className="shrink-0">
                        {branch.is_active ? "Activa" : "Suspendida"}
                    </Badge>
                    {!readOnly && (
                      <div className="flex shrink-0 gap-2">
                          <Button onClick={onEdit} size="sm" variant="outline">
                              Editar
                          </Button>
                          <Button onClick={() => setIsDeleting(true)} size="sm" variant="destructive">
                              Eliminar
                          </Button>
                      </div>
                    )}
                </div>
                <div className="min-w-0 rounded-xl border border-zinc-100 bg-zinc-50/80 py-3 px-3 dark:border-zinc-700 dark:bg-zinc-800/50 md:col-span-6 md:px-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Métodos de pago activos
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {branch.payment_methods && branch.payment_methods.length > 0 ? (
                            [...new Set(branch.payment_methods)].map((method) => (
                                <Badge key={method} variant="neutral" className="font-normal">
                                    {method.replace(/_/g, " ")}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-sm text-zinc-400 dark:text-zinc-500">Ninguno</span>
                        )}
                    </div>
                </div>
            </div>
            <Modal isOpen={isDeleting} onClose={() => setIsDeleting(false)} title="Confirmar Eliminación">
                <div className="space-y-4">
                    <p className="text-zinc-700 dark:text-zinc-300">Para confirmar, por favor ingrese su contraseña.</p>
                    <Input
                        type="password"
                        value={deletePassword}
                        onChange={e => { setDeletePassword(e.target.value); setFormErrors(prev => ({ ...prev, delete_password: "" })) }}
                        placeholder="Contraseña"
                        aria-label="Password for delete confirmation"
                    />
                    {formErrors.delete_password && <p className="text-red-500 text-xs">{formErrors.delete_password}</p>}
                    {globalError && <p className="p-3 text-sm text-red-800 bg-red-100 dark:bg-red-950 dark:text-red-200 rounded-lg">{globalError}</p>}
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsDeleting(false)} disabled={isLoading}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isLoading}>{isLoading ? "Eliminando..." : "Eliminar Sucursal"}</Button>
                    </div>
                </div>
            </Modal>
        </>
    )
}

// Edit Component
function BranchEditForm({ branch, onCancel }: { branch: Branch, onCancel: () => void }) {
    const router = useRouter();
    const supabase = createSupabaseBrowserClient("super-admin");

    const [globalError, setGlobalError] = useState<string | null>(null);
    const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

    const toggleDetail = (method: string) => {
        setExpandedDetails((prev) => {
            const next = new Set(prev);
            if (next.has(method)) next.delete(method);
            else next.add(method);
            return next;
        });
    };

    // 1. Preparar valores iniciales
    const ds = normalizeDeliverySettings(branch.delivery_settings);
    const defaultValues: Partial<BranchFormValues> = {
            name: branch.name || "",
            slug: branch.slug || "",
            address: branch.address || "",
            phone: branch.phone || "",
            instagram: branch.instagram || "",
            schedule: branch.schedule || "",
            country: branch.country || "",
            currency: branch.currency || "",
            payment_methods: Array.isArray(branch.payment_methods) ? [...branch.payment_methods] : [],
            uberExternalEnabled: effectiveDeliveryPricingMode(ds) === "external",
            uberStoreId: ds.uberDirectStoreId ?? "",
            uberShowFeeAmount: ds.showExternalDeliveryFeeAmount,
            uberDisplayText: ds.externalDeliveryDisplayText ?? "",
            is_active: branch.is_active !== false,
    };

    // Parsear JSON strings a objetos si es necesario
    ALL_PAYMENT_METHODS.forEach(method => {
        let value = branch[method];
        if (typeof value === "string") {
            try {
                value = JSON.parse(value);
            } catch {
                value = {};
            }
        }
        // @ts-expect-error - Indexación dinámica segura en este contexto
        defaultValues[method] = value ? { ...value } : {};
    });

    // 2. Hook de React Hook Form
    const form = useForm<BranchFormValues>({
        resolver: zodResolver(branchFormSchema),
        defaultValues
    });

    const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = form;

    // 3. Observar cambios para lógica dinámica (sin re-renders de todo el componente)
    const currentCountry = useWatch({ control, name: "country" });
    const currentPaymentMethods = useWatch({ control, name: "payment_methods" });
    const currentCurrency = useWatch({ control, name: "currency" });
    const uberExternalEnabled = useWatch({ control, name: "uberExternalEnabled" });
    const uberShowFeeAmountVal = useWatch({ control, name: "uberShowFeeAmount" });
    const isActiveVal = useWatch({ control, name: "is_active" });

    // Recalcular campos dinámicos solo cuando es necesario
    const paymentFieldsConfig = useMemo(() => {
        const config: Record<string, { key: string; label: string }[] | null> = {};
        (currentPaymentMethods || []).forEach(method => {
            config[method] = getPaymentMethodFields(method, currentCountry);
        });
        return config;
    }, [currentPaymentMethods, currentCountry]);

    const handlePaymentMethodToggle = (method: string) => {
        const current = currentPaymentMethods || [];
        const newMethods = current.includes(method)
            ? current.filter(m => m !== method)
            : [...current, method];
        setValue("payment_methods", newMethods, { shouldDirty: true });
    }

    // Envío del formulario
    const onSubmit = async (data: BranchFormValues) => {
        const auth = await requireAdminRole(roleSets.billing);
        if (!auth.ok) return setGlobalError(auth.error);

        setGlobalError(null);

        const {
            uberExternalEnabled: uberOn,
            uberStoreId,
            uberShowFeeAmount,
            uberDisplayText,
            ...restData
        } = data;
        const cleanForm = { ...restData };

        const deliveryPatch: Record<string, unknown> = uberOn
            ? {
                  deliveryPricingStrategy: "external",
                  externalDeliveryProvider: "uber_direct",
                  uberDirectStoreId: uberStoreId?.trim() || null,
                  showExternalDeliveryFeeAmount: uberShowFeeAmount,
                  externalDeliveryDisplayText:
                      (uberDisplayText && uberDisplayText.trim()) ||
                      "Consultar con la tienda",
              }
            : {
                  deliveryPricingStrategy: "distance",
                  externalDeliveryProvider: null,
                  uberDirectStoreId: null,
                  showExternalDeliveryFeeAmount: true,
              };

        const delivery_settings = mergeDeliverySettingsJson(
            branch.delivery_settings,
            deliveryPatch,
        );

        const { error: updateError } = await supabase
            .from("branches")
            .update({ ...cleanForm, delivery_settings })
            .eq("id", branch.id);

        if (updateError) {
            setGlobalError(`Error actualizando: ${updateError.message}`);
        } else {
            await logAdminAction({ action: "update_branch", targetType: "branch", targetId: branch.id, companyId: branch.company_id, metadata: { details: `Branch ${branch.name} updated by ${auth.email}` } });
            onCancel();
            await revalidateMenuCache(branch.company_id);
            router.refresh();
        }
    };

    const inputSelectClass =
        "mt-1 flex h-11 w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500";

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="min-w-0 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5"
        >
            <div className="space-y-5 sm:space-y-6">
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    {["name", "slug", "address", "phone", "instagram", "schedule", "country", "currency"].map(key => (
                        <div key={key} className="min-w-0">
                            <label htmlFor={key} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                                {key.replace(/_/g, " ")}
                            </label>
                            {key === "country" ? (
                                <select
                                    id={key}
                                    {...register("country")}
                                    onChange={(e) => {
                                        register("country").onChange(e);
                                        const val = e.target.value;
                                        if (val === "CL" && currentCurrency === branch.currency) setValue("currency", "CLP");
                                        if (val === "VE" && currentCurrency === branch.currency) setValue("currency", "VES");
                                        if (val === "US" && currentCurrency === branch.currency) setValue("currency", "USD");
                                    }}
                                    className={inputSelectClass}
                                >
                                    <option value="">Selecciona país</option>
                                    {COUNTRY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : key === "currency" ? (
                                <select id={key} {...register("currency")} className={inputSelectClass}>
                                    <option value="">Selecciona moneda</option>
                                    {CURRENCY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    id={key}
                                    {...register(key as keyof BranchFormValues)}
                                    className="mt-1 w-full min-w-0"
                                />
                            )}
                            {errors[key as keyof BranchFormValues] && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                    {errors[key as keyof BranchFormValues]?.message as string}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
                    <h3 className="mb-2 text-base font-semibold text-zinc-800 dark:text-zinc-200 sm:text-lg">
                        Estado de la sucursal
                    </h3>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="is-active"
                            checked={isActiveVal === true}
                            onCheckedChange={(v) =>
                                setValue("is_active", v === true, { shouldDirty: true })
                            }
                        />
                        <label
                            htmlFor="is-active"
                            className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            Sucursal Activa (si se desmarca, quedará suspendida/inactiva y no contará para el límite del plan)
                        </label>
                    </div>
                </div>

                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
                    <h3 className="mb-2 text-base font-semibold text-zinc-800 dark:text-zinc-200 sm:text-lg">
                        Opciones de sucursal (Uber Direct)
                    </h3>
                    <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                        Activa la cotización vía Uber para esta ubicación. Las credenciales OAuth se
                        configuran en la pestaña Global de la empresa.
                    </p>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="uber-external-enabled"
                            checked={uberExternalEnabled === true}
                            onCheckedChange={(v) =>
                                setValue("uberExternalEnabled", v === true, { shouldDirty: true })
                            }
                        />
                        <label
                            htmlFor="uber-external-enabled"
                            className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            Usar Uber Direct en esta sucursal
                        </label>
                    </div>
                    {uberExternalEnabled ? (
                        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="min-w-0 sm:col-span-2">
                                <label
                                    htmlFor="uber-store-id"
                                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                >
                                    Store ID (Uber Direct)
                                </label>
                                <p
                                    id="uber-store-desc"
                                    className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400"
                                >
                                    Es el identificador del{" "}
                                    <strong className="font-medium text-zinc-600 dark:text-zinc-300">
                                        local de recogida
                                    </strong>{" "}
                                    que Uber asigna a esta sucursal en Uber Direct / Eats: indica desde qué
                                    tienda sale el envío. Lo obtienes en el portal de desarrolladores o el
                                    panel de Uber vinculado a tu app;{" "}
                                    <strong className="font-medium text-zinc-600 dark:text-zinc-300">
                                        no es el Client ID
                                    </strong>{" "}
                                    (ese va en Global de la empresa).
                                </p>
                                <Input
                                    id="uber-store-id"
                                    {...register("uberStoreId")}
                                    className="mt-2 w-full min-w-0 font-mono text-sm"
                                    placeholder="Ej. UUID o id que te da Uber para este local"
                                    aria-describedby="uber-store-desc"
                                />
                                {errors.uberStoreId ? (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                        {errors.uberStoreId.message}
                                    </p>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2 sm:col-span-2">
                                <Checkbox
                                    id="uber-show-fee"
                                    checked={uberShowFeeAmountVal === true}
                                    onCheckedChange={(v) =>
                                        setValue("uberShowFeeAmount", v === true, {
                                            shouldDirty: true,
                                        })
                                    }
                                />
                                <label
                                    htmlFor="uber-show-fee"
                                    className="cursor-pointer text-sm text-zinc-700 dark:text-zinc-300"
                                >
                                    Mostrar monto de envío al cliente (si no, solo texto informativo)
                                </label>
                            </div>
                            <div className="min-w-0 sm:col-span-2">
                                <label
                                    htmlFor="uber-display-text"
                                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                >
                                    Texto si no se muestra monto
                                </label>
                                <Input
                                    id="uber-display-text"
                                    {...register("uberDisplayText")}
                                    className="mt-1 w-full min-w-0"
                                    placeholder="Ej. Consultar con la tienda"
                                />
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
                    <h3 className="mb-3 text-base font-semibold text-zinc-800 dark:text-zinc-200 sm:text-lg">
                        Métodos de Pago
                    </h3>
                    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {ALL_PAYMENT_METHODS.map(method => (
                            <div key={method} className="flex items-center gap-2">
                                <Checkbox
                                    id={`edit-${method}`}
                                    checked={(currentPaymentMethods || []).includes(method)}
                                    onCheckedChange={() => handlePaymentMethodToggle(method)}
                                />
                                <label htmlFor={`edit-${method}`} className="cursor-pointer text-sm font-medium capitalize text-zinc-700 dark:text-zinc-300">
                                    {method.replace(/_/g, " ")}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {(currentPaymentMethods || []).length > 0 && (
                    <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
                        <h3 className="mb-3 text-base font-semibold text-zinc-800 dark:text-zinc-200 sm:text-lg">
                            Detalles de Pago
                        </h3>
                        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                            Despliega cada método para completar sus datos.
                        </p>
                        <div className="space-y-2">
                            {(currentPaymentMethods || []).map((method) => {
                                const fields = paymentFieldsConfig[method];
                                if (!fields) return null;
                                const isOpen = expandedDetails.has(method);
                                const methodLabel = method.replace(/_/g, " ");
                                return (
                                    <div
                                        key={method}
                                        className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleDetail(method)}
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                                            aria-expanded={isOpen}
                                            aria-controls={`detail-${method}`}
                                            id={`header-${method}`}
                                        >
                                            <span
                                                className="flex h-6 w-6 shrink-0 items-center justify-center text-zinc-500 dark:text-zinc-400"
                                                aria-hidden
                                            >
                                                {isOpen ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </span>
                                            <span className="font-medium capitalize text-zinc-800 dark:text-zinc-200">
                                                {methodLabel}
                                            </span>
                                        </button>
                                        <div
                                            id={`detail-${method}`}
                                            role="region"
                                            aria-labelledby={`header-${method}`}
                                            className="grid transition-[grid-template-rows] duration-200 ease-out"
                                            style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                                        >
                                            <div className="min-h-0 overflow-hidden">
                                                <div className="border-t border-zinc-200 bg-zinc-50/50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/50 sm:py-4">
                                                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                                                        {fields.map((field) => (
                                                            <div key={field.key} className="min-w-0">
                                                                <label
                                                                    htmlFor={`${method}-${field.key}`}
                                                                    className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                                                                >
                                                                    {field.label}
                                                                </label>
                                                                <Input
                                                                    id={`${method}-${field.key}`}
                                                                    {...register(
                                                                        `${method}.${field.key}` as
                                                                            | `pago_movil.${string}`
                                                                            | `zelle.${string}`
                                                                            | `transferencia_bancaria.${string}`
                                                                            | `stripe.${string}`
                                                                            | `mercadopago.${string}`
                                                                            | `paypal.${string}`
                                                                    )}
                                                                    className="mt-1 w-full min-w-0"
                                                                    placeholder={field.label}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {globalError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
                        {globalError}
                    </div>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
