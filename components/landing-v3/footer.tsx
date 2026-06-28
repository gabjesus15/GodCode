import Image from "next/image";
import Link from "next/link";
import { Globe, Mail, MessageCircle } from "lucide-react";

const footerLinks = [
  { label: "Funciones", href: "#funciones" },
  { label: "Precios", href: "#precios" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Contacto", href: "#contacto" },
];

const socialLinks = [
  { icon: Globe, href: "#", label: "Sitio web" },
  { icon: Mail, href: "mailto:hola@gcode.me", label: "Email" },
  { icon: MessageCircle, href: "#", label: "WhatsApp" },
];

export function Footer() {
  return (
    <footer id="contacto" className="v3-section-beige pt-20 md:pt-28">
      <div className="v3-container">
        {/* Top columns */}
        <div className="grid grid-cols-1 gap-12 border-b border-[#0d0d0d]/10 pb-16 md:grid-cols-3">
          {/* Nav links */}
          <div>
            <p className="v3-label mb-6 text-[#71717a]">{"// "}NAVEGACIÓN</p>
            <ul className="flex flex-col gap-3">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-lg font-medium text-[#0d0d0d] transition-colors hover:text-[#7c3aed]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Address */}
          <div>
            <p className="v3-label mb-6 text-[#71717a]">{"// "}DIRECCIÓN</p>
            <address className="not-italic text-lg leading-relaxed text-[#0d0d0d]">
              Gcode HQ
              <br />
              Santiago, Chile
              <br />
              hola@gcode.me
            </address>
          </div>

          {/* Partnerships */}
          <div>
            <p className="v3-label mb-6 text-[#71717a]">{"// "}ALIANZAS</p>
            <p className="text-lg leading-relaxed text-[#0d0d0d]">
              Abiertos a integraciones con hardware POS, pasarelas de pago y
              flotas de delivery.
            </p>
          </div>
        </div>

        {/* Social + copyright */}
        <div className="flex flex-col items-center gap-8 py-12 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/gcode-logo.svg"
              alt="Gcode"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
            <p className="text-sm text-[#71717a]">
              © {new Date().getFullYear()} Gcode. Todos los derechos reservados.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#0d0d0d]/20 text-[#0d0d0d] transition-colors hover:border-[#7c3aed] hover:bg-[#7c3aed] hover:text-white"
              >
                <social.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Oversized brand name */}
      <div className="border-t border-[#0d0d0d]/10">
        <div className="v3-container py-8">
          <p className="font-display text-[clamp(5rem,22vw,16rem)] leading-[0.8] tracking-[0.02em] text-[#0d0d0d]">
            code
          </p>
        </div>
      </div>
    </footer>
  );
}
