"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/utils/cn";

const directionMap = {
  up: { x: 0, y: 14 },
  left: { x: -20, y: 0 },
  right: { x: 20, y: 0 },
} as const;

export function LandingReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const prefersReduced = useReducedMotion();
  const offset = directionMap[direction];
  return (
    <motion.div
      className={cn(className)}
      initial={prefersReduced ? false : { opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
