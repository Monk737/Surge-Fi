import React, { useEffect, useState } from "react";
import { Address } from "viem";
import { LineChart, Line, XAxis, YAxis, ReferenceArea, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { useHFHistory } from "../../hooks/useHFHistory";
import { useWeb3 } from "../../contexts/Web3Context";

interface HFChartProps {
  proxyAddress: Address;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const { hf, riskLevel, timestamp } = payload[0].payload;
    const time = format(timestamp, "HH:mm");
    const riskLabel = riskLevel === 0 ? "SAFE" : riskLevel === 1 ? "WARNING" : riskLevel === 2 ? "CRITICAL" : "LIQUIDATABLE";
    return (
      <div className="bg-white border-2 border-black p-2 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-bold mb-1">{`HF: ${hf.toFixed(3)}`}</p>
        <p>{`${riskLabel} | ${time}`}</p>
      </div>
    );
  }
  return null;
};

// Placeholder series for demo mode, generated once when the module loads.
const DEMO_HISTORY = Array.from({ length: 24 }).map((_, i) => ({
  timestamp: Date.now() - (24 - i) * 3600000,
  hf: 1.5 + Math.sin(i * 0.5) * 0.3,
  riskLevel: 0
}));

export function HFChart({ proxyAddress, height = 300 }: HFChartProps) {
  const { history } = useHFHistory(proxyAddress);
  const { isDemoMode } = useWeb3();

  const data = isDemoMode && history.length === 0 ? DEMO_HISTORY : history;
  
  const isLoading = data.length === 0;

  if (isLoading || !data.length) {
    return (
      <div className="w-full flex flex-col font-mono border-2 border-black p-4 bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ height }}>
        <h3 className="font-bold mb-4">Health Factor — Last 24h</h3>
        <div className="flex-grow flex items-center justify-center text-center">
          <p className="animate-pulse">Collecting HF data... Check back in a few blocks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col font-mono border-2 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ height }}>
      <h3 className="font-bold mb-4">Health Factor — Last 24h</h3>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(tick) => format(tick, "HH:mm")}
              stroke="#0a0a0a"
              tick={{ fontSize: 12, fontFamily: 'monospace' }}
            />
            <YAxis 
              domain={[0.5, 3.5]} 
              ticks={[1.0, 1.25, 1.5, 2.0]} 
              stroke="#0a0a0a"
              tick={{ fontSize: 12, fontFamily: 'monospace' }}
            />
            
            <ReferenceArea y1={0} y2={1.0} fill="#FF2E2E" fillOpacity={0.12} />
            <ReferenceArea y1={1.0} y2={1.25} fill="#FF6B00" fillOpacity={0.12} />
            <ReferenceArea y1={1.25} y2={1.5} fill="#ffe500" fillOpacity={0.12} />
            <ReferenceArea y1={1.5} y2={3.5} fill="#00C853" fillOpacity={0.08} />

            <ReferenceLine y={1.0} stroke="#FF2E2E" strokeDasharray="4 2" label={{ position: 'insideTopLeft', value: 'Liquidation', fill: '#FF2E2E', fontSize: 10, fontFamily: 'monospace' }} />
            <ReferenceLine y={1.25} stroke="#FF6B00" strokeDasharray="4 2" label={{ position: 'insideTopLeft', value: 'Min. Open', fill: '#FF6B00', fontSize: 10, fontFamily: 'monospace' }} />
            <ReferenceLine y={1.5} stroke="#ffe500" strokeDasharray="4 2" label={{ position: 'insideTopLeft', value: 'Safe Zone', fill: '#ffe500', fontSize: 10, fontFamily: 'monospace' }} />

            <Tooltip content={<CustomTooltip />} />
            
            <Line 
              type="monotone" 
              dataKey="hf" 
              stroke="#0a0a0a" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4, fill: "#0a0a0a" }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
