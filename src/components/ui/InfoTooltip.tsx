import React from 'react';
import { Info } from 'lucide-react';

export const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative flex items-center ml-1 inline-flex">
    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-black transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-white text-[10px] font-mono leading-tight rounded-md border border-gray-700 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] text-center normal-case">
      {text}
    </div>
  </div>
);
