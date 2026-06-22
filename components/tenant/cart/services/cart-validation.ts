import { z } from "zod";

/** Mensajes de validación del checkout (procedentes de next-intl `tenant.cart.modal.validation`). */
export type CartClientValidationMessages = {
  nameShort: string;
  nameInvalid: string;
  phoneShort: string;
  phoneLong: string;
  phoneInvalid: string;
  addressRequired?: string;
  referenceShort?: string;
  receiptRequired?: string;
};

export function buildCartClientSchema(
  messages: CartClientValidationMessages,
  options?: {
    fulfillment?: "pickup" | "delivery";
    requiresReceipt?: boolean;
    validateRut?: (rut: string) => boolean;
  }
) {
  const baseSchema = z.object({
    name: z
      .string()
      .min(3, messages.nameShort)
      .max(50)
      .regex(/^[\p{L} .'-]+$/u, messages.nameInvalid),
    phone: z
      .string()
      .transform((v) => v.replace(/\s/g, ""))
      .pipe(
        z
          .string()
          .min(7, messages.phoneShort)
          .max(20, messages.phoneLong)
          .regex(/^\+?\d{7,15}$/, messages.phoneInvalid),
      ),
    rut: z.string().optional().default(""),
    receiptFile: z.any().optional(),
    receiptPreview: z.string().optional(),
    fulfillment: z.enum(["pickup", "delivery"]).default("pickup"),
    delivery_address: z.object({
      address: z.string().optional().default(""),
      formatted_address: z.string().optional().default(""),
      reference: z.string().optional().default(""),
      lat: z.number().optional().nullable(),
      lng: z.number().optional().nullable(),
      namedAreaId: z.string().optional().nullable(),
    }).optional(),
    payment_type: z.enum(["pendiente", "online", "tienda"]).nullable().optional(),
    payment_method_specific: z.string().optional().nullable(),
    payment_ref: z.string().optional().nullable(),
  });

  // Aplicar superRefine para validación condicionada
  return baseSchema.superRefine((data, ctx) => {
    // 1. Validar RUT si existe validador de estrategia de país
    if (options?.validateRut && data.rut) {
      const trimmed = data.rut.trim();
      if (trimmed.length > 0 && !options.validateRut(trimmed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Identificación o RUT no válido",
          path: ["rut"],
        });
      }
    }

    // 2. Validar campos de Delivery si está seleccionado
    const currentFulfillment = options?.fulfillment || data.fulfillment;
    if (currentFulfillment === "delivery") {
      const addr = data.delivery_address?.address || data.delivery_address?.formatted_address || "";
      if (!addr.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.addressRequired || "La dirección de entrega es obligatoria",
          path: ["delivery_address", "address"],
        });
      }

      const ref = data.delivery_address?.reference || "";
      if (ref.trim().length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.referenceShort || "Agrega indicaciones para el repartidor (mín. 6 letras)",
          path: ["delivery_address", "reference"],
        });
      }
    }

    // 3. Validar comprobante para pagos online
    if (options?.requiresReceipt) {
      if (!data.receiptFile && !data.payment_ref) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.receiptRequired || "El comprobante de pago es obligatorio",
          path: ["receiptFile"],
        });
      }
    }
  });
}
