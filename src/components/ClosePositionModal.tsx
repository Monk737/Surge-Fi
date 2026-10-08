import React from 'react';
import { X, ArrowRight, AlertTriangle } from 'lucide-react';
import { Position } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { FLASH_LOAN_FEE, PROTOCOL_CLOSE_FEE_RATE } from '../constants';

interface ClosePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  position: Position | null;
}

export const ClosePositionModal: React.FC<ClosePositionModalProps> = ({ 
  isOpen, onClose, onConfirm, position 
}) => {
  if (!isOpen || !position) return null;

  // Calculation Logic
  const { collateral, leverage, entryPrice, currentPrice, type, asset } = position;
  const isLong = type === 'LONG';
  const collateralSymbol = isLong ? 'USDC' : 'ETH';
  
  // Calculate raw PnL and return amount in Collateral Token Units
  let grossPnlNative = 0;
  
  if (isLong) {
      // Long WETH (Collateral USDC)
      const totalSizeUSDC = collateral * leverage;
      const sizeInETH = totalSizeUSDC / entryPrice;
      const priceDiff = currentPrice - entryPrice;
      const pnlUSD = priceDiff * sizeInETH;
      grossPnlNative = pnlUSD;
  } else {
      // Short WETH (Collateral ETH)
      // Total Size in ETH = collateral * leverage
      // We sold (collateral * leverage) ETH for USDC at entryPrice.
      // We now buy back that ETH at currentPrice.
      
      const totalETHLocked = collateral * leverage;
      const usdcHeld = totalETHLocked * entryPrice;
      const ethPurchased = usdcHeld / currentPrice;
      const debtETH = collateral * (leverage - 1);
      const grossEthAfterRepay = ethPurchased - debtETH;
      
      // PnL is difference between what we have now vs what we started with
      grossPnlNative = grossEthAfterRepay - collateral;
  }
  
  const isProfit = grossPnlNative > 0;
  const borrowedAmountNative = collateral * (leverage - 1);

  // Fee Calculations (in Native Token)
  const flashLoanFee = borrowedAmountNative * FLASH_LOAN_FEE;
  // Protocol Fee: 5% of profit only
  const protocolFee = isProfit ? grossPnlNative * PROTOCOL_CLOSE_FEE_RATE : 0;
  
  // Net Calculation
  const totalFees = flashLoanFee + protocolFee;
  const netPnlNative = grossPnlNative - totalFees;
  const finalReturn = collateral + netPnlNative;
  const returnAmount = Math.max(0, finalReturn);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border-4 border-black rounded-xl shadow-neo-lg max-w-md w-full overflow-hidden relative animate-in zoom-in">
        
        {/* Header */}
        <div className="bg-gray-50 border-b-2 border-black p-4 flex justify-between items-center">
          <h3 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
            Close Position
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Asset Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <img src={asset.iconUrl} alt={asset.symbol} className="w-10 h-10 rounded-full border-2 border-black" />
               <div>
                 <div className="font-black text-lg">{asset.symbol}</div>
                 <Badge variant={isLong ? 'success' : 'danger'}>{leverage}x {type}</Badge>
               </div>
            </div>
            <div className="text-right">
               <div className="text-xs font-bold text-gray-500 uppercase">Collateral</div>
               <div className="font-mono font-bold text-lg">
                 {collateral.toLocaleString()} {collateralSymbol}
               </div>
            </div>
          </div>

          <div className="h-px bg-gray-200" />

          {/* PnL Analysis */}
          <div className="space-y-3">
             <div className="flex justify-between items-center text-sm">
               <span className="font-bold text-gray-600">Gross PnL</span>
               <span className={`font-mono font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {isProfit ? '+' : ''}{grossPnlNative.toLocaleString(undefined, { maximumFractionDigits: 4 })} {collateralSymbol}
               </span>
             </div>

             <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-2">
               <div className="flex justify-between items-center text-xs text-rose-800">
                 <span className="font-bold flex items-center gap-1">Flash Loan Fee <span className="opacity-70">(0.09%)</span></span>
                 <span className="font-mono">-{flashLoanFee.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
               </div>
               <div className="flex justify-between items-center text-xs text-rose-800">
                 <span className="font-bold flex items-center gap-1">
                    Protocol Fee 
                    {isProfit ? <span className="opacity-70">({PROTOCOL_CLOSE_FEE_RATE * 100}% on Profit)</span> : <span className="opacity-70">(No Profit)</span>}
                 </span>
                 <span className="font-mono">-{protocolFee.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
               </div>
             </div>

             <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-300">
               <span className="font-black text-black">Net PnL</span>
               <span className={`font-mono font-bold ${netPnlNative >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {netPnlNative >= 0 ? '+' : ''}{netPnlNative.toLocaleString(undefined, { maximumFractionDigits: 4 })} {collateralSymbol}
               </span>
             </div>
          </div>

          {/* Final Return */}
          <div className="bg-gray-900 text-white p-4 rounded-lg border-2 border-black shadow-sm">
             <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-xs font-bold uppercase mb-1">Estimated Return</div>
                  <div className="text-2xl font-black text-accent">{returnAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {collateralSymbol}</div>
                </div>
             </div>
             
             {finalReturn <= 0 && (
                <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-rose-300 flex items-center gap-1">
                   <AlertTriangle className="w-3 h-3" />
                   Total Loss. No collateral returned.
                </div>
             )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
             <Button variant="secondary" onClick={onClose} className="w-full">
               Cancel
             </Button>
             <Button variant="primary" onClick={onConfirm} className="w-full">
               Confirm Close
             </Button>
          </div>

        </div>
      </div>
    </div>
  );
};