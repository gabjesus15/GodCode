import Image from "next/image";

import { cn } from "@/utils/cn";

export function LandingFeatureShot({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[1.9rem] bg-gradient-to-b from-slate-300 via-slate-100 to-slate-200 p-[12px] shadow-[0_28px_70px_-30px_rgba(15,23,42,0.42)] ring-1 ring-white/70 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 dark:ring-white/10",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[1.35rem] bg-slate-950 p-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.35)]">
        <div className="absolute left-1/2 top-[8px] z-10 h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-slate-700/80 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] dark:bg-slate-500/80" />
        <div className="relative overflow-hidden rounded-[1.05rem] bg-black">
          <Image
            src={src}
            alt={alt}
            width={1600}
            height={1000}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="block h-auto w-full"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" aria-hidden />
        </div>
      </div>
    </div>
  );
}
