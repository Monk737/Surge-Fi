import React from 'react';

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
  label?: string;
  formatValue?: (val: number) => string;
}

export const Slider: React.FC<SliderProps> = ({ 
  min, max, step, value, onChange, label, formatValue 
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {label && <label className="text-sm font-bold text-black uppercase">{label}</label>}
        <span className="text-sm font-bold text-black bg-accent px-2 border border-black rounded-sm">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <div className="relative w-full h-8 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-3 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
          {/* Active Track */}
          <div 
            className="h-full bg-black"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Thumb Input */}
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
        />
        {/* Visual Thumb */}
        <div 
          className="absolute h-6 w-6 bg-white border-2 border-black rounded-lg shadow-sm pointer-events-none transition-all duration-75"
          style={{ left: `calc(${percentage}% - 12px)` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs font-bold text-gray-500 font-mono">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
};