import React from "react";
import { hfColor } from "../../lib/utils/hfCalculations";
import { formatHF } from "../../lib/utils/formatters";

interface HFBarProps {
  hf: bigint;
  showTicks?: boolean;
  height?: number;
}

export function HFBar({ hf, showTicks = true, height = 20 }: HFBarProps) {
  const hfNumber = Number(hf) / 1e18;
  const clampedHF = Math.min(Math.max(hfNumber, 0.5), 3.0);
  const leftPos = ((clampedHF - 0.5) / 2.5) * 100;

  return (
    <div className="w-full flex flex-col font-mono">
      <div className="relative w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ height }}>
        <div className="absolute top-0 bottom-0 flex w-full">
          <div style={{ width: '20%', backgroundColor: '#FF2E2E' }} className="border-r-2 border-black"></div>
          <div style={{ width: '10%', backgroundColor: '#FF6B00' }} className="border-r-2 border-black"></div>
          <div style={{ width: '10%', backgroundColor: '#ffe500' }} className="border-r-2 border-black"></div>
          <div style={{ width: '60%', backgroundColor: '#00C853' }}></div>
        </div>
        
        <div 
          className="absolute top-0 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-black z-10"
          style={{ 
            left: `calc(${leftPos}% - 6px)`,
            transition: 'left 0.5s ease' 
          }}
        />
        <div 
          className="absolute bottom-0 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-black z-10"
          style={{ 
            left: `calc(${leftPos}% - 6px)`,
            transition: 'left 0.5s ease' 
          }}
        />
      </div>

      <div className="relative w-full h-6 mt-1 text-xs">
        <div className="absolute left-0">0.5</div>
        <div className="absolute right-0">3.0</div>
        
        {showTicks && (
          <>
            <div className="absolute flex flex-col items-center" style={{ left: '20%', transform: 'translateX(-50%)' }}>
              <div className="w-px h-2 bg-black mb-1"></div>
              <span>1.0</span>
            </div>
            <div className="absolute flex flex-col items-center" style={{ left: '30%', transform: 'translateX(-50%)' }}>
              <div className="w-px h-2 bg-black mb-1"></div>
              <span>1.25</span>
            </div>
            <div className="absolute flex flex-col items-center" style={{ left: '40%', transform: 'translateX(-50%)' }}>
              <div className="w-px h-2 bg-black mb-1"></div>
              <span>1.5</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
