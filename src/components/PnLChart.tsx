import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PositionType } from '../types';

interface PnLChartProps {
  entryPrice: number;
  leverage: number;
  positionType: PositionType;
  liquidationPrice: number;
}

export const PnLChart: React.FC<PnLChartProps> = ({ 
  entryPrice, 
  leverage, 
  positionType,
  liquidationPrice
}) => {
  // Generate data points around the entry price
  const data = React.useMemo(() => {
    const points = [];
    const range = 0.15; // +/- 15% price movement range
    const steps = 40; // Smoother curve
    
    // Calculate start/end price for x-axis
    const startPrice = entryPrice * (1 - range);
    const endPrice = entryPrice * (1 + range);
    const stepSize = (endPrice - startPrice) / steps;

    for (let i = 0; i <= steps; i++) {
      const currentPrice = startPrice + (stepSize * i);
      const priceChangePct = (currentPrice - entryPrice) / entryPrice;
      
      let pnlPct;
      if (positionType === 'LONG') {
        pnlPct = priceChangePct * leverage;
      } else {
        pnlPct = -priceChangePct * leverage;
      }

      points.push({
        price: currentPrice,
        pnl: pnlPct * 100, // Convert to percentage
      });
    }
    return points;
  }, [entryPrice, leverage, positionType]);

  const gradientOffset = () => {
    const dataMax = Math.max(...data.map((i) => i.pnl));
    const dataMin = Math.min(...data.map((i) => i.pnl));
  
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
  
    return dataMax / (dataMax - dataMin);
  };
  
  const off = gradientOffset();

  const formatPrice = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const formatPnL = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="h-64 w-full font-mono">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor="#10b981" stopOpacity={0.25} />
              <stop offset={off} stopColor="#f43f5e" stopOpacity={0.25} />
            </linearGradient>
            <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor="#059669" stopOpacity={1} />
              <stop offset={off} stopColor="#e11d48" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis 
            dataKey="price" 
            tickFormatter={formatPrice}
            stroke="#9ca3af"
            fontSize={10}
            fontWeight="bold"
            tickLine={false}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
            minTickGap={30}
          />
          <YAxis 
            tickFormatter={formatPnL}
            stroke="#9ca3af"
            fontSize={10}
            fontWeight="bold"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              borderColor: '#000000', 
              borderWidth: '2px', 
              color: '#000000', 
              boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            itemStyle={{ color: '#000', fontWeight: '900', fontFamily: 'monospace' }}
            labelStyle={{ color: '#6b7280', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}
            labelFormatter={(v) => `Mark Price: ${formatPrice(Number(v))}`}
            formatter={(value: number) => [
              <span key="value" style={{ color: value >= 0 ? '#059669' : '#e11d48' }}>{value > 0 ? '+' : ''}{value.toFixed(2)}%</span>, 
              'Est. PnL'
            ]}
          />
          <ReferenceLine 
            x={entryPrice} 
            stroke="#000" 
            strokeWidth={1}
            strokeDasharray="4 4" 
            label={{ value: 'ENTRY', fill: '#000', fontSize: 10, position: 'insideTopLeft', fontWeight: '900', dx: 5 }} 
          />
          <ReferenceLine 
            x={liquidationPrice} 
            stroke="#e11d48" 
            strokeWidth={2} 
            label={{ value: 'LIQ', fill: '#e11d48', fontSize: 10, position: 'insideTopRight', fontWeight: '900' }} 
          />
          <Area 
            type="monotone" 
            dataKey="pnl" 
            stroke="url(#splitStroke)" 
            strokeWidth={3}
            fill="url(#splitColor)" 
            fillOpacity={1}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};