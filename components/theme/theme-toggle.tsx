"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "saas-theme";

function getTheme(): "light" | "dark" {
	if (typeof document === "undefined") return "light";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "dark" || stored === "light") return stored;
	return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
	const root = document.documentElement;
	root.classList.toggle("dark", theme === "dark");
	root.setAttribute("data-theme", theme);
	window.localStorage.setItem(STORAGE_KEY, theme);
}

interface ThemeToggleProps {
	className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setTheme(getTheme());
		setMounted(true);
	}, []);

	const toggleTheme = () => {
		const nextTheme = theme === "dark" ? "light" : "dark";
		applyTheme(nextTheme);
		setTheme(nextTheme);
	};

	const defaultClasses = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition";
	const activeClass = className !== undefined ? className : defaultClasses;

	if (!mounted) {
		return (
			<div
				className={`${activeClass} opacity-0`}
				aria-hidden
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={toggleTheme}
			aria-label="Cambiar tema"
			title="Cambiar tema"
			className={activeClass}
		>
			{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
		</button>
	);
}
