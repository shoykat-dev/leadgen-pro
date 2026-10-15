"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { ShieldAlert, Lock, AlertTriangle, EyeOff } from "lucide-react";

interface ContentProtectionProps {
  children: React.ReactNode;
}

export function ContentProtection({ children }: ContentProtectionProps) {
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showSecurityNotice = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Safe clipboard clearing helper
  const wipeClipboard = useCallback(() => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("🔒 Content protected by LeadGen Pro DRM. Copying is prohibited.");
      }
    } catch {
      // Ignore if clipboard access is denied
    }
  }, []);

  useEffect(() => {
    // 1. Prevent Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showSecurityNotice("🔒 Right-click is disabled to protect proprietary lead data.");
      return false;
    };

    // 2. Prevent Copy & Cut Actions
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      wipeClipboard();
      if (e.clipboardData) {
        e.clipboardData.setData(
          "text/plain",
          "🔒 Content is protected by LeadGen Pro. Direct copying is strictly prohibited."
        );
      }
      showSecurityNotice("🔒 Text and data copying is disabled to protect lead records.");
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      wipeClipboard();
      showSecurityNotice("🔒 Content editing is restricted.");
      return false;
    };

    // 3. Prevent Dragging
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // 4. Keyboard Shortcuts Interception
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key detection
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        wipeClipboard();
        setIsShieldActive(true);
        showSecurityNotice("⚠️ Screenshot attempt blocked! Screen capture is prohibited.");
        return false;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isInput =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (isCtrlOrCmd) {
        const key = e.key.toLowerCase();

        // Block Ctrl+C (Copy), Ctrl+X (Cut), Ctrl+A (Select All) outside inputs
        if (!isInput && (key === "c" || key === "x" || key === "a")) {
          e.preventDefault();
          e.stopPropagation();
          wipeClipboard();
          showSecurityNotice("🔒 Keyboard copy & selection shortcuts are disabled.");
          return false;
        }

        // Block Ctrl+P (Print)
        if (key === "p") {
          e.preventDefault();
          e.stopPropagation();
          showSecurityNotice("🔒 Document printing and PDF export are strictly prohibited.");
          return false;
        }

        // Block Ctrl+S (Save Webpage)
        if (key === "s") {
          e.preventDefault();
          e.stopPropagation();
          showSecurityNotice("🔒 Saving webpage files is disabled.");
          return false;
        }

        // Block Ctrl+U (View Page Source)
        if (key === "u") {
          e.preventDefault();
          e.stopPropagation();
          showSecurityNotice("🔒 Viewing source code is restricted.");
          return false;
        }

        // Block DevTools shortcuts: Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.shiftKey && (key === "i" || key === "j" || key === "c")) {
          e.preventDefault();
          e.stopPropagation();
          showSecurityNotice("🔒 Developer inspection tools are restricted.");
          return false;
        }
      }

      // Block F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        showSecurityNotice("🔒 Developer tools are restricted.");
        return false;
      }
    };

    // 5. Anti-Screenshot & Screen Recording Blur on Window Unfocus
    // When Snipping Tool, Win+Shift+S, Lightshot, or an external screen recorder captures focus,
    // the window loses focus (blur). We immediately shield and blur the content!
    const handleWindowBlur = () => {
      setIsShieldActive(true);
    };

    const handleWindowFocus = () => {
      // Small timeout to prevent flickering during quick window interactions
      setTimeout(() => {
        setIsShieldActive(false);
      }, 100);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsShieldActive(true);
      }
    };

    // Attach listeners
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("copy", handleCopy, { capture: true });
    window.addEventListener("cut", handleCut, { capture: true });
    window.addEventListener("dragstart", handleDragStart, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", (e) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        wipeClipboard();
        setIsShieldActive(true);
      }
    });

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("copy", handleCopy, { capture: true });
      window.removeEventListener("cut", handleCut, { capture: true });
      window.removeEventListener("dragstart", handleDragStart, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [showSecurityNotice, wipeClipboard]);

  return (
    <>
      {/* Underlying Application Content (with dynamic blur on shield active) */}
      <div
        className={`min-h-full transition-all duration-200 ${
          isShieldActive ? "filter blur-2xl select-none pointer-events-none opacity-40" : ""
        }`}
      >
        {children}
      </div>

      {/* Screen Capture & Recording Privacy Shield */}
      {isShieldActive && (
        <div
          onClick={() => setIsShieldActive(false)}
          className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 cursor-pointer"
        >
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-5 shadow-lg shadow-rose-500/10">
              <EyeOff className="w-8 h-8 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Anti-Screen Capture Shield Active</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Content Protected</h2>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              This application is secured against screenshots, screen recording, and unauthorized data extraction.
              Lead details, phone numbers, and emails are protected by DRM policy.
            </p>

            <button
              onClick={() => setIsShieldActive(false)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Click to Resume Viewing</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Security Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] max-w-sm bg-slate-900 dark:bg-slate-950 border border-rose-500/40 text-white rounded-2xl p-4 shadow-2xl shadow-rose-950/50 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="h-9 w-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs font-medium text-slate-200 leading-snug">
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}
