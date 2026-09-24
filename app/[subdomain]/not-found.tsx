import type { Metadata } from "next";

import { Illustrated404 } from "../../components/brand/illustrated-404";

export const metadata: Metadata = {
  title: "Tienda no encontrada · Gcode",
  description:
    "Esta tienda no existe o ya no está disponible. Crea la tuya con Gcode POS en pocos minutos.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function TenantNotFound() {
  return (
    <Illustrated404
      oops="Tienda no encontrada"
      title="Tienda no disponible"
      subtitle="Esta tienda no existe… o se mudó sin avisar."
      primaryCta={{ label: "Crear mi propia tienda", href: "/onboarding" }}
      secondaryCta={{ label: "Conocer Gcode POS", href: "/" }}
    />
  );
}
