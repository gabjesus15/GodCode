"use client";

import { useEffect, useState } from "react";

interface FloatingWhatsappButtonProps {
  phoneNumber: string;
  message?: string;
}

export function FloatingWhatsappButton({
  phoneNumber,
  message = "¡Hola! Me interesa conocer más sobre GodCode.",
}: FloatingWhatsappButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Hacer visible después del montaje para evitar hidratación
    const id = window.setTimeout(() => setIsVisible(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!isVisible) return null;

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-500 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95 sm:bottom-8 sm:right-8"
      aria-label="Contactar por WhatsApp"
    >
      <svg viewBox="0 0 32 32" aria-hidden className="h-6 w-6 fill-current">
        <path d="M16 3C8.82 3 3 8.64 3 15.58c0 2.79.93 5.37 2.53 7.47L4 29l6.19-1.45c1.97 1.04 4.23 1.63 6.65 1.63 7.18 0 13-5.64 13-12.6C29.84 8.64 24.02 3 16 3Zm0 23.08c-2.2 0-4.31-.58-6.12-1.67l-.44-.26-3.67.86.93-3.55-.29-.46a10.87 10.87 0 0 1-1.75-5.92C4.66 9.55 9.72 4.85 16 4.85c6.28 0 11.34 4.7 11.34 10.23 0 5.55-5.06 10.3-11.34 10.3Zm6.44-7.43c-.34-.17-2.02-.99-2.33-1.1-.31-.1-.53-.17-.75.17-.22.33-.86 1.1-1.05 1.32-.2.23-.39.25-.73.08-.34-.17-1.43-.52-2.72-1.66-1.01-.89-1.69-1.99-1.89-2.33-.2-.33-.02-.52.15-.69.15-.15.34-.39.51-.59.17-.2.23-.34.34-.56.11-.23.06-.43-.03-.6-.09-.17-.75-1.83-1.03-2.51-.27-.65-.55-.56-.75-.57h-.64c-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.85 0 1.68 1.23 3.3 1.4 3.53.17.23 2.42 3.73 5.86 5.08 3.44 1.35 3.44.9 4.06.84.62-.06 2.02-.82 2.31-1.61.28-.78.28-1.45.2-1.6-.08-.15-.31-.23-.65-.4Z" />
      </svg>
    </a>
  );
}
