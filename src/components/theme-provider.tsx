"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system on mount
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("leadgen_theme") as Theme | null;
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
        setThemeState(storedTheme);
      }
    } catch {
      // localStorage may fail in private mode
    }
    setMounted(true);
  }, []);

  // Update DOM classes and meta tags whenever theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const computeResolvedTheme = (t: Theme): "light" | "dark" => {
      if (t === "dark") return "dark";
      if (t === "light") return "light";
      return mediaQuery.matches ? "dark" : "light";
    };

    const applyTheme = (t: Theme) => {
      const resolved = computeResolvedTheme(t);
      setResolvedTheme(resolved);

      const root = document.documentElement;
      if (resolved === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      // Update meta tag for native browser UI controls & scrollbars
      const meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
      if (meta) {
        meta.content = t === "system" ? "light dark" : t;
      }
    };

    applyTheme(theme);

    // Listen for system theme changes when in 'system' mode
    const handleMediaChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);

    // Sync across browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "leadgen_theme") {
        const newTheme = (e.newValue as Theme) || "system";
        setThemeState(newTheme);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      if (newTheme === "system") {
        localStorage.removeItem("leadgen_theme");
      } else {
        localStorage.setItem("leadgen_theme", newTheme);
      }
    } catch {
      // ignore localStorage errors
    }
  };

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
