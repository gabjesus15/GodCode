"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LandingLogo } from "./landing-logo";

const navLinks = [
  { href: "#funciones", key: "features" },
  { href: "#como-funciona", key: "howItWorks" },
  { href: "#producto", key: "product" },
  { href: "#demo", key: "demo" },
  { href: "#comparar", key: "compare" },
  { href: "#testimonios", key: "testimonials" },
  { href: "#precios", key: "pricing" },
  { href: "#faq", key: "faq" },
  { href: "#contacto", key: "contact" },
] as const;

const sectionIds = navLinks.map((l) => l.href.slice(1));

function useActiveSection() {
  const [active, setActive] = useState("");

  useEffect(() => {
    const els = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );

    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return active;
}

export function LandingNav() {
  const t = useTranslations("landing.nav");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const active = useActiveSection();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header
      suppressHydrationWarning
      className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-200 ${
        scrolled
          ? "border-b border-slate-200/70 bg-white/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/80"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center px-5 sm:px-6 lg:px-8 xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-4">
        <a
          href="#inicio"
          className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 xl:justify-self-start"
        >
          <span className="sr-only">{t("goHome")}</span>
          <LandingLogo className="gap-1" />
        </a>

        {/* Desktop nav */}
        <nav className="hidden min-w-0 items-center justify-center gap-0.5 px-0 xl:flex xl:justify-self-center xl:pl-4" aria-label={t("main")}>
          {navLinks.map(({ href, key }) => {
            const isActive = active === href.slice(1);
            return (
              <a
                key={href}
                href={href}
                className={`relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[12px] font-medium transition-colors ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                }`}
              >
                {t(`links.${key}`)}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                )}
              </a>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 2xl:flex xl:justify-self-end">
          <LanguageSwitcher className="flex items-center" selectClassName="h-9" />
          <Link
            href="/login"
            className="inline-flex h-9 min-w-[88px] items-center justify-center rounded-lg px-4 text-[13px] font-medium leading-none text-slate-600 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {t("login")}
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex h-9 min-w-[124px] items-center justify-center whitespace-nowrap rounded-lg bg-indigo-600 px-4 text-[13px] font-medium leading-none text-white shadow-sm shadow-indigo-500/20 transition-colors hover:bg-indigo-700"
          >
            {t("createAccount")}
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="ml-auto flex items-center gap-2 xl:hidden">
          <LanguageSwitcher className="flex items-center" selectClassName="h-9 px-2" />
          <Link
            href="/onboarding"
            className="inline-flex h-9 min-w-[108px] items-center justify-center whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 text-xs font-medium leading-none text-white shadow-sm shadow-indigo-500/20"
          >
            {t("createAccount")}
          </Link>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 top-16 z-40 bg-slate-950/30 backdrop-blur-[2px] xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={close}
              aria-hidden
            />

            <motion.nav
              ref={panelRef}
              className="fixed right-0 top-16 z-50 flex h-[calc(100dvh-4rem)] w-full max-w-xs flex-col overflow-y-auto border-l border-slate-200/60 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-xl xl:hidden dark:border-zinc-800 dark:bg-zinc-950"
              aria-label={t("mobile")}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="flex flex-col gap-0.5">
                {navLinks.map(({ href, key }) => {
                  const isActive = active === href.slice(1);
                  return (
                    <a
                      key={href}
                      href={href}
                      className={`rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                          : "text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                      }`}
                      onClick={close}
                    >
                      {t(`links.${key}`)}
                    </a>
                  );
                })}
              </div>

              <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-zinc-800">
                <Link
                  href="/sobre-godcode"
                  prefetch={false}
                  className="rounded-lg px-3 py-2.5 text-center text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                  onClick={close}
                >
                  Sobre GodCode
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2.5 text-center text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                  onClick={close}
                >
                  {t("login")}
                </Link>
                <Link
                  href="/onboarding"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 text-center text-[14px] font-medium text-white transition-colors hover:bg-indigo-700"
                  onClick={close}
                >
                  {t("createAccount")}
                </Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
