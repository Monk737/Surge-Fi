import React from "react";
import { hfToAngle } from "../../lib/utils/hfCalculations";
import { formatHF } from "../../lib/utils/formatters";

interface HFGaugeProps {
  hf: bigint;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function HFGauge({ hf, size = "md", showLabel = true }: HFGaugeProps) {
  const width = size === "sm" ? 120 : size === "md" ? 200 : 280;
  const height = width / 2;
  const radius = width / 2 - 10;
  const cx = width / 2;
  const cy = height;

  const hfNumber = Number(hf) / 1e18;
  const riskLevelValue = hfNumber < 1 ? 3 : hfNumber < 1.25 ? 2 : hfNumber < 1.5 ? 1 : 0;
  const riskLabels = ["SAFE", "WARNING", "CRITICAL", "LIQUIDATABLE"] as const;
  const riskColors = ["#00C853", "#ffe500", "#FF6B00", "#FF2E2E"] as const;
  
  const rotateAngle = hfToAngle(hfNumber) - 180;

  const drawArc = (startAngle: number, endAngle: number, color: string) => {
    const startRad = (startAngle - 180) * Math.PI / 180;
    const endRad = (endAngle - 180) * Math.PI / 180;
    
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    
    return <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`} fill={color} stroke="#000" strokeWidth="2" />;
  };

  const getTickTransform = (tickHF: number) => {
    const angle = ((Math.min(Math.max(tickHF, 0.5), 3.0) - 0.5) / 2.5) * 180 - 180;
    const rad = angle * Math.PI / 180;
    const tx = cx + radius * Math.cos(rad);
    const ty = cy + radius * Math.sin(rad);
    const txInner = cx + (radius - 5) * Math.cos(rad);
    const tyInner = cy + (radius - 5) * Math.sin(rad);
    return { x1: txInner, y1: tyInner, x2: tx, y2: ty, textX: cx + (radius + 12) * Math.cos(rad), textY: cy + (radius + 12) * Math.sin(rad) };
  };

  return (
    <div className="flex flex-col items-center justify-center font-mono">
      <div style={{ width, height: height + 20, position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height + 25}`} className="overflow-visible" style={{ width: '100%', height: '100%' }}>
          {drawArc(0, 36, "#FF2E2E")}     {/* 0.5 to 1.0 */}
          {drawArc(36, 54, "#FF6B00")}    {/* 1.0 to 1.25 */}
          {drawArc(54, 72, "#ffe500")}    {/* 1.25 to 1.5 */}
          {drawArc(72, 180, "#00C853")}   {/* 1.5 to 3.0 */}
          
          <path d={`M ${cx - radius/2} ${cy} A ${radius/2} ${radius/2} 0 0 1 ${cx + radius/2} ${cy} Z`} fill="#fff" stroke="#000" strokeWidth="2" />
          <line x1={cx - radius/2} y1={cy} x2={cx + radius/2} y2={cy} stroke="#000" strokeWidth="2" />
          
          {[1.0, 1.25, 1.5].map(tickHF => {
            const t = getTickTransform(tickHF);
            return (
              <g key={tickHF}>
                <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#000" strokeWidth="2" />
                <text x={t.textX} y={t.textY} fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fill="#000">
                  {tickHF.toFixed(2)}
                </text>
              </g>
            );
          })}
          
          <g style={{ transform: `rotate(${rotateAngle}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>
             <line x1={cx} y1={cy} x2={cx + radius - 2} y2={cy} stroke="#000" strokeWidth="2" />
             <circle cx={cx} cy={cy} r="4" fill="#000" />
          </g>
        </svg>
        
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center text-center">
          <div className="font-bold font-mono" style={{ fontSize: size === 'sm' ? '16px' : size === 'md' ? '24px' : '32px' }}>
            {formatHF(hf)}
          </div>
        </div>
      </div>
      {showLabel && (
        <div className="mt-2 font-mono text-sm font-bold" style={{ color: riskColors[riskLevelValue] }}>
          {riskLabels[riskLevelValue]}
        </div>
      )}
    </div>
  );
}
