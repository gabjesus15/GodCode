import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/utils/cn";

/* ─── MacBook Pro ─── */

export function LaptopFrame({
  src,
  alt = "Captura de pantalla",
  children,
  className,
  priority = false,
}: {
  src?: string;
  alt?: string;
  children?: ReactNode;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative mx-auto w-full", className)}>
      {/* Screen */}
      <div className="relative rounded-t-[0.75rem] border border-[#2a2a2e] bg-[#1a1a1e] p-[3px] sm:rounded-t-[1rem] sm:p-1">
        {/* Camera notch */}
        <div className="absolute left-1/2 top-0 z-10 h-[6px] w-[52px] -translate-x-1/2 rounded-b-[4px] bg-[#1a1a1e] sm:h-[8px] sm:w-[68px] sm:rounded-b-[5px]">
          <div className="absolute left-1/2 top-[2px] h-[2.5px] w-[2.5px] -translate-x-1/2 rounded-full bg-[#3a3a40] sm:top-[3px] sm:h-[3px] sm:w-[3px]" />
        </div>

        {/* Screen content */}
        <div className="overflow-hidden rounded-[0.5rem] bg-white sm:rounded-[0.65rem] dark:bg-zinc-900">
          {src ? (
            <Image
              src={src}
              alt={alt}
              width={1440}
              height={900}
              quality={92}
              sizes="(max-width: 1024px) 100vw, 56vw"
              className="h-auto w-full"
              priority={priority}
            />
          ) : children ? (
            <div className="aspect-[16/10]">{children}</div>
          ) : null}
        </div>
      </div>

      {/* Hinge / base */}
      <div className="relative">
        <div className="mx-auto h-[3px] w-[94%] rounded-b-sm bg-gradient-to-b from-[#cfcfd1] to-[#b8b8bc] sm:h-[4px] dark:from-[#4a4a50] dark:to-[#38383e]" />
        <div className="mx-auto h-[8px] w-[104%] -translate-x-[2%] rounded-b-lg bg-gradient-to-b from-[#c8c8cc] via-[#d4d4d8] to-[#a8a8ae] shadow-[0_2px_8px_rgba(0,0,0,0.12)] sm:h-[10px] dark:from-[#3a3a40] dark:via-[#444448] dark:to-[#2e2e34] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
          {/* Base indent */}
          <div className="absolute bottom-[1px] left-1/2 h-[2px] w-[18%] -translate-x-1/2 rounded-sm bg-[#b0b0b6] sm:h-[3px] dark:bg-[#505058]" />
        </div>
        {/* Rubber feet indicators */}
        <div className="mx-auto flex w-[100%] justify-between px-[8%]">
          <div className="h-[1.5px] w-[4%] rounded-full bg-[#d0d0d4] dark:bg-[#3a3a40]" />
          <div className="h-[1.5px] w-[4%] rounded-full bg-[#d0d0d4] dark:bg-[#3a3a40]" />
        </div>
      </div>

      {/* Reflection overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-t-[0.75rem] bg-gradient-to-br from-white/[0.06] to-transparent sm:rounded-t-[1rem]" />
    </div>
  );
}

/* ─── iPhone 15 Pro ─── */

export function PhoneFrame({
  src,
  alt = "Captura de pantalla",
  children,
  className,
  imageClassName,
  priority = false,
}: {
  src?: string;
  alt?: string;
  children?: ReactNode;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[220px] sm:max-w-[260px]", className)}>
      {/* Titanium frame */}
      <div className="relative rounded-[2rem] bg-gradient-to-b from-[#2a2a2e] via-[#1d1d20] to-[#2a2a2e] p-[2.5px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.05)] sm:rounded-[2.5rem] sm:p-[3px] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)]">
        {/* Inner bezel */}
        <div className="rounded-[1.75rem] bg-black p-[2px] sm:rounded-[2.2rem] sm:p-[2.5px]">

          {/* Screen area */}
          <div className="relative overflow-hidden rounded-[1.6rem] bg-white sm:rounded-[2rem] dark:bg-zinc-900">

            {/* Dynamic Island */}
            <div className="absolute left-1/2 top-[3px] z-20 h-[9px] w-[34px] -translate-x-1/2 rounded-full bg-black sm:top-[5px] sm:h-[11px] sm:w-[40px]" />

            {/* Screen content */}
            {src ? (
              <div className="relative aspect-[9/19.5] w-full overflow-hidden">
                <Image
                  src={src}
                  alt={alt}
                  width={430}
                  height={932}
                  quality={95}
                  sizes="(max-width: 640px) 62vw, (max-width: 1024px) 26vw, 342px"
                  className={cn("h-full w-full object-contain object-center", imageClassName)}
                  priority={priority}
                />
              </div>
            ) : children ? (
              <div className="aspect-[9/19.5]">{children}</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Side buttons — left */}
      <div className="absolute left-[-2px] top-[22%] h-[8px] w-[2.5px] rounded-l-sm bg-gradient-to-b from-[#3a3a3f] to-[#2a2a2e] sm:h-[10px] sm:w-[3px]" />
      <div className="absolute left-[-2px] top-[30%] h-[16px] w-[2.5px] rounded-l-sm bg-gradient-to-b from-[#3a3a3f] to-[#2a2a2e] sm:h-[20px] sm:w-[3px]" />
      <div className="absolute left-[-2px] top-[38%] h-[16px] w-[2.5px] rounded-l-sm bg-gradient-to-b from-[#3a3a3f] to-[#2a2a2e] sm:h-[20px] sm:w-[3px]" />

      {/* Side button — right (power) */}
      <div className="absolute right-[-2px] top-[30%] h-[20px] w-[2.5px] rounded-r-sm bg-gradient-to-b from-[#3a3a3f] to-[#2a2a2e] sm:h-[26px] sm:w-[3px]" />

      {/* Subtle reflection */}
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/[0.08] via-transparent to-transparent sm:rounded-[2.5rem]" />
    </div>
  );
}
