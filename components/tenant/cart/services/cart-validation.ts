import { z } from "zod";

/** Mensajes de validación del checkout (procedentes de next-intl `tenant.cart.modal.validation`). */
export type CartClientValidationMessages = {
  nameShort: string;
  nameInvalid: string;
  phoneShort: string;
  phoneLong: string;
  phoneInvalid: string;
};

export function buildCartClientSchema(messages: CartClientValidationMessages) {
  return z.object({
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
  });
}
