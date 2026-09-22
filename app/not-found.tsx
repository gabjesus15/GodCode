import type { Metadata } from "next";

import { Illustrated404 } from "../components/brand/illustrated-404";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description:
    "La página que buscas no existe. Vuelve al inicio o crea tu tienda online con Gcode POS.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function GlobalNotFound() {
  return (
    <Illustrated404
      oops="Oops"
      title="Esta página ya no está en el menú."
      subtitle="La ruta que buscas no existe o fue movida. Te ayudamos a volver."
      primaryCta={{ label: "Volver al inicio", href: "/" }}
      secondaryCta={{ label: "Crear mi tienda", href: "/onboarding" }}
    />
  );
}
