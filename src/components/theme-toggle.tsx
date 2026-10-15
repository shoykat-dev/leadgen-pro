"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, ChevronDown, Check } from "lucide-react";
import { useTheme, Theme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400">
        <Sun className="w-4 h-4" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* 1-Click Fast Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="group relative flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label="Toggle Night Mode"
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-blue-400 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
        )}
      </button>

      {/* Mini Dropdown Trigger for System / Specific choice */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-1 rounded-r-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -ml-1 border-y border-r border-slate-200 dark:border-slate-700/80 hidden sm:flex items-center justify-center"
        title="Theme options (Light, Night, System)"
        aria-label="Theme options"
      >
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-1.5 shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Theme Mode
          </div>

          <button
            type="button"
            onClick={() => {
              setTheme("light");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              theme === "light"
                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode</span>
            </span>
            {theme === "light" && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme("dark");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              theme === "dark"
                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-blue-400" />
              <span>Night Mode</span>
            </span>
            {theme === "dark" && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme("system");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              theme === "system"
                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>System Auto</span>
            </span>
            {theme === "system" && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          </button>
        </div>
      )}
    </div>
  );
}
