"use client";

import { useEffect, useRef } from "react";

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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeCategory && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(
        `.tab-item[data-id="${activeCategory}"]`
      ) as HTMLElement | null;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeCategory]);

  const handleClick = (id: string) => {
    onCategoryClick(id);
  };

  return (
    <div className="navbar-wrapper">
      <div className="navbar-main-row">
        <div className="navbar-tabs-area">
          <div className="nav-fade-left" />
          <nav className="navbar-container" ref={scrollRef as React.RefObject<HTMLDivElement>}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                data-id={cat.id}
                onClick={() => handleClick(cat.id)}
                className={`tab-item ${activeCategory === cat.id ? "active" : ""}`}
              >
                {cat.name}
              </button>
            ))}
          </nav>
          <div className="nav-fade-right" />
        </div>
      </div>
    </div>
  );
}
