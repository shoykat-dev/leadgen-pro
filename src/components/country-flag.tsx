"use client";

import React, { useState } from "react";

interface CountryFlagProps {
  code: string;
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CountryFlag({
  code,
  name,
  className = "",
  size = "md",
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);

  if (!code || typeof code !== "string" || code.trim().length !== 2) {
    return <span className="inline-block text-sm leading-none shrink-0">🌐</span>;
  }

  const cleanCode = code.trim().toLowerCase();

  // Dimensions based on standard 4:3 country flag ratios
  const sizeClasses = {
    sm: "w-4 h-3 min-w-4",
    md: "w-5 h-3.5 min-w-5",
    lg: "w-6 h-4.5 min-w-6",
  }[size];

  if (hasError) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold font-mono bg-slate-100 text-slate-700 rounded-[2px] border border-slate-300 uppercase px-0.5 text-[9px] leading-none shrink-0 ${sizeClasses} ${className}`}
        title={name || code}
      >
        {code.toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${cleanCode}.png`}
      srcSet={`https://flagcdn.com/w80/${cleanCode}.png 2x`}
      alt={name ? `${name} flag` : `${code} flag`}
      title={name || code.toUpperCase()}
      loading="lazy"
      crossOrigin="anonymous"
      onError={() => setHasError(true)}
      className={`inline-block rounded-[2px] object-cover shadow-2xs border border-slate-300/80 shrink-0 ${sizeClasses} ${className}`}
    />
  );
}
