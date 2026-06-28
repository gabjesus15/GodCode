import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers, Smartphone, Zap, Quote } from "lucide-react";

export function BentoGrid() {
  return (
    <section id="nosotros" className="v3-section-dark py-28 md:py-36">
      <div className="v3-container">
        <p className="v3-label mb-12">{"// "}POR QUÉ GCODE</p>

        <div className="grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* 1. Wide stat card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-7 transition-colors hover:border-[#7c3aed]/40 md:col-span-2 lg:col-span-2">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#7c3aed]/10 transition-transform duration-500 group-hover:scale-150" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="font-display text-6xl text-[#7c3aed] md:text-7xl">4.9/5</p>
                <p className="mt-2 text-sm font-medium text-[#a1a1aa]">
                  Calificación promedio de dueños de restaurantes
                </p>
              </div>
              <span className="v3-label">{"// "}RATING</span>
            </div>
            <p className="relative mt-8 max-w-xl text-lg leading-relaxed text-[#f4f4f5]">
              Los equipos que migran a Gcode reducen a la mitad los errores de
              pedido en el primer mes.
            </p>
          </div>

          {/* 2. Tall UI preview card */}
          <div className="group relative min-h-[560px] overflow-hidden rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-0 md:row-span-3">
            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
              <Image
                src="/imagenes para landing/menu_mobil.jpg"
                alt="Vista previa del menú móvil"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/60 to-[#0d0d0d]/20" />
            </div>
            <div className="relative z-10 flex h-full flex-col justify-end p-7">
              <p className="v3-label mb-2 text-[#7c3aed]">{"// "}MOBILE FIRST</p>
              <p className="font-display text-3xl leading-tight text-[#f4f4f5]">
                MENÚS QUE FUNCIONAN EN CUALQUIER PANTALLA
              </p>
            </div>
          </div>

          {/* 3. Testimonial card */}
          <div className="flex flex-col justify-between rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-7 transition-colors hover:border-[rgba(244,244,245,0.2)]">
            <Quote className="h-8 w-8 text-[#7c3aed]/60" />
            <blockquote className="mt-4 text-lg leading-relaxed text-[#f4f4f5]">
              “Gcode nos permitió dejar de depender de las apps de delivery y
              recuperar el control de nuestros pedidos.”
            </blockquote>
            <div className="mt-6 border-t border-[rgba(244,244,245,0.08)] pt-4">
              <p className="text-sm font-semibold text-[#f4f4f5]">
                Equipo Oishi Sushi
              </p>
              <p className="text-xs text-[#71717a]">Restaurant, Chile</p>
            </div>
          </div>

          {/* 4. Feature highlight card */}
          <div className="flex flex-col justify-between rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-7 transition-colors hover:border-[rgba(244,244,245,0.2)]">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1a1a1a] text-[#7c3aed]">
                <Zap className="h-5 w-5" />
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1a1a1a] text-[#7c3aed]">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1a1a1a] text-[#7c3aed]">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6">
              <p className="font-display text-2xl leading-tight text-[#f4f4f5]">
                RÁPIDO, MÓVIL Y MULTI-TENANT
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#a1a1aa]">
                Pensado para locales únicos y cadenas por igual.
              </p>
            </div>
          </div>

          {/* 5. CTA card */}
          <div className="flex flex-col justify-center rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-7 md:col-span-2">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="v3-label mb-3">{"// "}NOSOTROS</p>
                <p className="max-w-md text-2xl font-medium leading-snug text-[#f4f4f5]">
                  ¿Querés ver cómo Gcode se adapta a tu negocio?
                </p>
              </div>
              <Link
                href="/sobre-godcode"
                className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[#7c3aed] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9]"
              >
                Conocer más
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* 6. Full accent card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#7c3aed] p-7 md:col-span-2 lg:col-span-3">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
            <div className="relative flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
              <div>
                <p className="font-display text-6xl leading-[0.9] text-white md:text-7xl lg:text-8xl">
                  0% COMISIONES
                </p>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/90">
                  Cada pedido es tuyo. Sin comisiones de marketplaces, sin cargos
                  ocultos, sin sorpresas.
                </p>
              </div>
              <Link
                href="/onboarding"
                className="inline-flex w-fit shrink-0 rounded-full bg-[#0d0d0d] px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#141414]"
              >
                Empezar ahora
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
