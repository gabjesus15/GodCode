"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSlidingIndicator } from "./use-sliding-indicator";

interface CategoryItem {
  id: string;
  name: React.ReactNode;
}

interface NavbarProps {
  categories: CategoryItem[];
  activeCategory: string | null;
  onCategoryClick: (id: string) => void;
}

export function Navbar({ categories, activeCategory, onCategoryClick }: NavbarProps) {
  const t = useTranslations("tenant.menu");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeCategory && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(
        `.tab-item[data-id="${activeCategory}"]`
      ) as HTMLElement | null;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
      }
    }
  }, [activeCategory]);

  // Una sola línea bajo la activa que se desliza entre pestañas.
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  useSlidingIndicator(
    scrollRef,
    indicatorRef,
    activeCategory ? `.tab-item[data-id="${activeCategory}"]` : null,
    "x",
    [categories],
  );

  const handleClick = (id: string) => {
    onCategoryClick(id);
  };

  return (
    <div className="navbar-wrapper">
      <div className="navbar-main-row">
        <div className="navbar-tabs-area">
          <div className="nav-fade-left" />
          <nav aria-label={t("nav.categories")} className="navbar-container" ref={scrollRef as React.RefObject<HTMLDivElement>}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                data-id={cat.id}
                type="button"
                onClick={() => handleClick(cat.id)}
                aria-current={activeCategory === cat.id ? "true" : undefined}
                className={`tab-item ${activeCategory === cat.id ? "active" : ""}`}
              >
                {cat.name}
              </button>
            ))}
            <span ref={indicatorRef} className="tab-indicator" aria-hidden />
          </nav>
          <div className="nav-fade-right" />
        </div>
      </div>
    </div>
  );
}
