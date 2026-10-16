"use client";

import React from "react";

interface ContentProtectionProps {
  children: React.ReactNode;
}

/**
 * ContentProtection pass-through.
 * All DRM, anti-screenshot shields, clipboard wipes, and copy restrictions are completely removed.
 */
export function ContentProtection({ children }: ContentProtectionProps) {
  return <>{children}</>;
}
