import React from 'react';
import { Check, Loader2, X } from 'lucide-react';
import type { TransactionStep } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TransactionStep[];
  title: string;
  isComplete: boolean;
  isError: boolean;
  errorMessage?: string;
  successText?: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  steps,
  title,
  isComplete,
  isError,
  errorMessage,
  successText = 'Done'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border-4 border-black w-full max-w-md shadow-neo-lg overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b-2 border-black bg-slate-50">
          <h3 className="text-2xl font-black text-black tracking-tight uppercase">{title}</h3>
        </div>
        <div className="p-6 space-y-5">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-300
                ${step.status === 'COMPLETE' ? 'bg-emerald-400 border-black' : 
                  step.status === 'ERROR' ? 'bg-rose-400 border-black' :
                  step.status === 'LOADING' ? 'bg-white border-black border-dashed animate-spin-slow' : 
                  'bg-gray-100 border-gray-300 text-gray-400'}
              `}>
                {step.status === 'COMPLETE' && <Check className="w-5 h-5 text-black" />}
                {step.status === 'ERROR' && <X className="w-5 h-5 text-black" />}
                {step.status === 'LOADING' && <Loader2 className="w-4 h-4 text-black animate-spin" />}
                {step.status === 'PENDING' && <span className="font-bold text-sm">{idx + 1}</span>}
              </div>
              <span className={`font-bold text-lg ${step.status === 'PENDING' ? 'text-gray-400' : 'text-black'}`}>
                {step.label}
              </span>
            </div>
          ))}

          {isError && errorMessage && (
            <div className="mt-4 p-4 bg-rose-50 border-2 border-rose-500 rounded-lg text-rose-900 font-bold text-sm">
              {errorMessage}
            </div>
          )}
        </div>
        
        <div className="p-6 bg-slate-50 border-t-2 border-black flex justify-end gap-3">
          {(isComplete || isError) && (
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-black text-white font-black text-lg rounded-lg border-2 border-black hover:bg-gray-800 transition-transform active:scale-95 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              {isError ? 'Close' : successText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
