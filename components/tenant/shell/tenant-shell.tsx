"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
interface TenantShellProps {
  children: React.ReactNode;
}

export function TenantShell({ children }: TenantShellProps) {
  const pathname = usePathname();
  const [scrollY, setScrollY] = useState(0);
  const bgLayerRef = useRef<HTMLDivElement | null>(null);
  const normalizedPath = String(pathname || "").toLowerCase();
  const hideMenuPatternLayer = normalizedPath.endsWith("/login") || normalizedPath.endsWith("/admin");

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!bgLayerRef.current) return;
    bgLayerRef.current.style.transform = `translateY(${-scrollY * 0.1}px)`;
  }, [scrollY]);

  useEffect(() => {
    const handleVisualLock = () => {
      const contentLayer = document.getElementById("app-content-layer");
      const uiLayer = document.getElementById("app-ui-layer");

      if (!contentLayer || !uiLayer) return;

      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isIPad = /iPad|Macintosh/.test(navigator.userAgent) && isTouchDevice;

      if (!isIPad && !isTouchDevice) {
        const dpr = window.devicePixelRatio || 1;
        const inverseScale = 1 / dpr;

        const supportsZoom = "zoom" in document.body.style;

        if (supportsZoom) {
          document.body.style.setProperty("zoom", String(inverseScale));

          contentLayer.style.transform = "";
          contentLayer.style.width = "100%";
          contentLayer.style.height = "";
          contentLayer.style.overflowY = "";

          uiLayer.style.transform = "";
          uiLayer.style.width = "100%";
          uiLayer.style.height = "100%";
        } else {
          const transformProps = `scale(${inverseScale})`;
          const originProps = "top left";
          const widthProps = `${dpr * 100}vw`;
          const heightProps = `${dpr * 100}vh`;

          contentLayer.style.transform = transformProps;
          contentLayer.style.transformOrigin = originProps;
          contentLayer.style.width = widthProps;
          contentLayer.style.minHeight = heightProps;

          uiLayer.style.transform = transformProps;
          uiLayer.style.transformOrigin = originProps;
          uiLayer.style.width = widthProps;
          uiLayer.style.height = heightProps;
        }

        uiLayer.style.position = "fixed";
        uiLayer.style.top = "0";
        uiLayer.style.left = "0";
        uiLayer.style.pointerEvents = "none";
        uiLayer.style.zIndex = "9999";

        document.body.style.overflowX = "hidden";
      } else {
        document.body.style.removeProperty("zoom");
        document.body.style.overflowX = "";

        contentLayer.style.transform = "";
        contentLayer.style.transformOrigin = "";
        contentLayer.style.width = "";
        contentLayer.style.height = "";
        contentLayer.style.minHeight = "";

        uiLayer.style.transform = "";
        uiLayer.style.transformOrigin = "";
        uiLayer.style.position = "fixed";
        uiLayer.style.width = "100%";
        uiLayer.style.height = "100%";
        uiLayer.style.pointerEvents = "none";
        uiLayer.style.zIndex = "9999";
      }
    };

    window.addEventListener("resize", handleVisualLock);
    const timerId = window.setTimeout(handleVisualLock, 100);

    return () => {
      window.removeEventListener("resize", handleVisualLock);
      window.clearTimeout(timerId);
    };
  }, [pathname]);

  return (
    <div className="tenant-shell-root">
      <div
        ref={bgLayerRef}
        className={`app-bg-layer tenant-shell-bg-layer ${hideMenuPatternLayer ? "is-hidden" : ""}`}
      />

      <div
        id="app-content-layer"
        className="app-wrapper tenant-content-layer"
      >
        {children}
      </div>

      <div id="app-ui-layer" className="tenant-ui-layer">
        <div id="navbar-portal-root" className="tenant-portal-navbar" />
        <div id="cart-portal-root" className="tenant-portal-cart" />
        <div id="modal-root" className="tenant-portal-modal" />
      </div>
    </div>
  );
}
