"use client";

import { useEffect, useRef, useState } from "react";

type PayPalButtonsInstance = {
  render: (container: HTMLElement) => Promise<void>;
  close?: () => Promise<void>;
};

type PayPalSdk = {
  Buttons: (config: {
    style?: Record<string, unknown>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID?: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (error: unknown) => void;
  }) => PayPalButtonsInstance;
};

let sdkPromise: Promise<PayPalSdk> | null = null;
let sdkClientId: string | null = null;

/** Carga el SDK de PayPal una sola vez por página (el botón puede montarse varias veces). */
function loadPayPalSdk(clientId: string): Promise<PayPalSdk> {
  if (sdkPromise && sdkClientId === clientId) return sdkPromise;
  sdkClientId = clientId;
  sdkPromise = new Promise<PayPalSdk>((resolve, reject) => {
    const existing = (window as Window & { paypal?: PayPalSdk }).paypal;
    if (existing?.Buttons) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => {
      const sdk = (window as Window & { paypal?: PayPalSdk }).paypal;
      if (sdk?.Buttons) resolve(sdk);
      else reject(new Error("PayPal no respondió."));
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("No pudimos cargar PayPal. Revisa tu conexión o usa otro método."));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

export type PayPalButtonsProps = {
  clientId: string;
  /** Crea la orden en nuestro servidor y devuelve su id de PayPal. */
  createOrder: () => Promise<string>;
  /** El cliente aprobó el pago en PayPal: capturarlo en nuestro servidor. */
  onApprove: (orderId: string) => Promise<void>;
  onCancel?: () => void;
  onError?: (message: string) => void;
};

export function PayPalButtons({ clientId, createOrder, onApprove, onCancel, onError }: PayPalButtonsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  // Los botones de PayPal se montan una vez: leen siempre las funciones más recientes.
  const handlers = useRef({ createOrder, onApprove, onCancel, onError });
  useEffect(() => {
    handlers.current = { createOrder, onApprove, onCancel, onError };
  }, [createOrder, onApprove, onCancel, onError]);

  useEffect(() => {
    let cancelled = false;
    let instance: PayPalButtonsInstance | null = null;

    loadPayPalSdk(clientId)
      .then((paypal) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        container.innerHTML = "";
        instance = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay", height: 44 },
          createOrder: () => handlers.current.createOrder(),
          onApprove: async (data) => {
            if (data.orderID) await handlers.current.onApprove(data.orderID);
          },
          onCancel: () => handlers.current.onCancel?.(),
          onError: (error) =>
            handlers.current.onError?.(error instanceof Error && error.message ? error.message : "PayPal no pudo completar el pago."),
        });
        return instance.render(container).then(() => {
          if (!cancelled) setStatus("ready");
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus("error");
        handlers.current.onError?.(error instanceof Error ? error.message : "No pudimos cargar PayPal.");
      });

    return () => {
      cancelled = true;
      void instance?.close?.().catch(() => undefined);
    };
  }, [clientId]);

  return (
    <div aria-busy={status === "loading"}>
      {status === "loading" && <div className="h-11 animate-pulse rounded-lg bg-[#f5f5f7]" aria-label="Cargando PayPal" />}
      {status === "error" && (
        <p className="rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] px-3 py-2.5 text-sm text-[#6e6e73]">
          PayPal no está disponible en este momento. Prueba en unos minutos o paga con otro método.
        </p>
      )}
      <div ref={containerRef} className="min-h-0" />
    </div>
  );
}
