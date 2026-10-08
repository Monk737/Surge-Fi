import React from "react";
import { RiskLevelValue } from "../../lib/constants";

interface RiskBadgeProps {
  riskLevel: RiskLevelValue;
  size?: "xs" | "sm" | "md";
  pulse?: boolean;
}

export function RiskBadge({ riskLevel, size = "md", pulse = false }: RiskBadgeProps) {
  const configs = {
    0: { bg: "bg-green-500", text: "text-black", label: "✓ SAFE" },
    1: { bg: "bg-amber-400", text: "text-black", label: "⚠ WARNING" },
    2: { bg: "bg-orange-500", text: "text-black", label: "⚡ CRITICAL" },
    3: { bg: "bg-red-500", text: "text-white", label: "🔴 LIQUIDATABLE" },
  };

  const config = configs[riskLevel] || configs[0];
  const sizeClasses = {
    xs: "text-xs px-2 py-0.5",
    sm: "text-sm px-3 py-1",
    md: "text-base px-4 py-1.5",
  };

  const shouldPulse = pulse && riskLevel >= 2;

  return (
    <div 
      className={`inline-flex items-center font-mono font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] 
        ${config.bg} ${config.text} ${sizeClasses[size]} 
        ${shouldPulse ? "animate-pulse" : ""}`}
    >
      {config.label}
    </div>
  );
}
