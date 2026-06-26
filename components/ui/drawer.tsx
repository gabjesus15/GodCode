"use client";
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/utils/cn";

type DrawerDirection = "bottom" | "left" | "right";

interface DrawerProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  direction?: DrawerDirection;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  contentClassName?: string;
  containerClassName?: string;
  dismissible?: boolean;
}

const directionStyles: Record<DrawerDirection, { content: string; inner: string; handle: boolean }> = {
  bottom: {
    content:
      "fixed bottom-0 left-0 right-0 z-[150] mt-24 flex max-h-[85vh] flex-col rounded-t-[20px] border-t border-zinc-200 bg-white p-6 shadow-2xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-950",
    inner: "mx-auto w-full max-w-md overflow-y-auto",
    handle: true,
  },
  left: {
    content:
      "fixed inset-y-0 left-0 z-[150] flex h-full w-[min(100vw-3rem,320px)] max-w-[85vw] flex-col overflow-y-auto border-r border-zinc-200 bg-white p-4 shadow-2xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 sm:w-72 sm:p-6",
    inner: "w-full",
    handle: false,
  },
  right: {
    content:
      "fixed inset-y-0 right-0 z-[150] flex h-full w-[min(100vw-3rem,380px)] max-w-[90vw] flex-col overflow-y-auto border-l border-zinc-200 bg-white p-4 shadow-2xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 sm:p-6",
    inner: "w-full flex-1 overflow-y-auto",
    handle: false,
  },
};

export function Drawer({
  children,
  open,
  onOpenChange,
  direction = "bottom",
  title,
  description,
  footer,
  contentClassName,
  containerClassName,
  dismissible = true,
  ...props
}: DrawerProps) {
  const styles = directionStyles[direction];

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={direction}
      dismissible={dismissible}
      {...props}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm" />
        <DrawerPrimitive.Content className={cn(styles.content, containerClassName)}>
          {styles.handle ? (
            <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          ) : null}
          <div className={cn(styles.inner, contentClassName)}>
            {title || description ? (
              <header className="mb-4 space-y-1">
                {title ? (
                  <DrawerPrimitive.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {title}
                  </DrawerPrimitive.Title>
                ) : null}
                {description ? (
                  <DrawerPrimitive.Description className="text-sm text-zinc-500 dark:text-zinc-400">
                    {description}
                  </DrawerPrimitive.Description>
                ) : null}
              </header>
            ) : (
              <DrawerPrimitive.Title className="sr-only">
                Menú de navegación
              </DrawerPrimitive.Title>
            )}
            {children}
            {footer ? <footer className="mt-4 shrink-0 border-t border-zinc-100 pt-4 dark:border-zinc-800">{footer}</footer> : null}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
