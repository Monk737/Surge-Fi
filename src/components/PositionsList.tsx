import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Position } from '../types';
import { ClosePositionModal } from './ClosePositionModal';

interface PositionsListProps {
  positions: Position[];
  onClosePosition: (id: string) => void;
  walletBalance: number; // NOTE: Not used anymore in modal, or ignored
}

export const PositionsList: React.FC<PositionsListProps> = ({ positions, onClosePosition, walletBalance }) => {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  const handleCloseClick = (position: Position) => {
    setSelectedPosition(position);
  };

  const handleConfirmClose = () => {
    if (selectedPosition) {
      onClosePosition(selectedPosition.id);
      setSelectedPosition(null);
    }
  };

  if (positions.length === 0) {
    return (
      <Card title="Active Positions" className="mt-8">
        <div className="text-center py-12 text-gray-500">
          <p className="font-medium">No active positions found.</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card title="Active Positions" className="mt-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-black text-xs font-bold text-black uppercase tracking-wider bg-gray-50">
                <th className="py-3 pl-4">Asset</th>
                <th className="py-3">Position Size (Notional)</th>
                <th className="py-3">Entry / Mark</th>
                <th className="py-3">Liq. Price</th>
                <th className="py-3">Est. PnL (USD)</th>
                <th className="py-3">Status</th>
                <th className="py-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y-2 divide-gray-100">
              {positions.map((pos) => {
                const isLong = pos.type === 'LONG';
                
                // PnL Calculation
                // Long (Collateral USDC): (Current - Entry) * (Collateral * Lev / Entry)
                // Short (Collateral ETH): (Entry - Current) * (Collateral * Lev)
                
                const pnlValueUSD = isLong
                  ? (pos.currentPrice - pos.entryPrice) * (pos.collateral * pos.leverage / pos.entryPrice)
                  : (pos.entryPrice - pos.currentPrice) * (pos.collateral * pos.leverage);
                  
                const collateralUSD = isLong 
                  ? pos.collateral 
                  : pos.collateral * pos.currentPrice;
                  
                const pnlPercent = (pnlValueUSD / collateralUSD) * 100;
                const isProfit = pnlValueUSD >= 0;

                return (
                  <tr key={pos.id} className="hover:bg-[#ffe500] transition-colors font-medium">
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-black bg-white flex items-center justify-center font-bold text-sm shadow-neo-sm">
                          {pos.asset.symbol[0]}
                        </div>
                        <div>
                          <div className="font-bold text-black flex items-center gap-2">
                            {pos.asset.symbol}
                            <Badge variant={isLong ? 'success' : 'danger'}>
                              {pos.leverage}x {pos.type}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{new Date(pos.openDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-mono">
                      <div className="text-black font-bold">
                        {isLong 
                          ? `$${(pos.collateral * pos.leverage).toLocaleString()}`
                          : `${(pos.collateral * pos.leverage).toFixed(2)} ETH`
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        Coll: {pos.collateral.toLocaleString()} {isLong ? 'USDC' : 'ETH'}
                      </div>
                    </td>
                    <td className="py-4 font-mono">
                      <div className="text-black">${pos.entryPrice.toLocaleString()}</div>
                      <div className="text-xs text-blue-600 font-bold">${pos.currentPrice.toLocaleString()}</div>
                    </td>
                    <td className="py-4 font-mono text-rose-600 font-bold">
                      ${pos.liquidationPrice.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <div className={`font-black ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isProfit ? '+' : ''}{pnlValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                      </div>
                      <div className={`text-xs font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-4">
                       <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold bg-emerald-100 px-2 py-1 rounded border border-emerald-300 w-fit">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                         ACTIVE
                       </div>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => handleCloseClick(pos)}>
                        Close
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <ClosePositionModal 
        isOpen={!!selectedPosition}
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
        onConfirm={handleConfirmClose}
      />
    </>
  );
};