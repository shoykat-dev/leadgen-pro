"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !justReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-full shadow-lg border backdrop-blur-md transition-all duration-300 flex items-center gap-2 select-none animate-in fade-in slide-in-from-top-2 text-xs font-semibold"
      style={{
        backgroundColor: isOffline
          ? "rgba(245, 158, 11, 0.95)"
          : "rgba(16, 185, 129, 0.95)",
        borderColor: isOffline ? "#d97706" : "#059669",
        color: "#ffffff",
      }}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>You are offline. Some features may not work.</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Internet restored. Back online!</span>
        </>
      )}
    </div>
  );
}
