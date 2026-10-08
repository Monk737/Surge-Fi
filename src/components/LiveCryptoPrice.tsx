import React from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CHAINLINK_ABI, CONTRACTS } from '../lib/constants';

export const LiveCryptoPrice: React.FC = () => {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACTS.CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    query: {
      refetchInterval: 10000, 
    }
  });

  if (isLoading) return <div className="text-xs font-bold font-mono text-gray-500 animate-pulse">ETH...</div>;
  if (isError || !data) return <div className="text-xs font-bold font-mono text-red-500">ETH N/A</div>;

  // data[1] is the "answer" (the price) returned from latestRoundData
  const rawPrice = data[1] as bigint; 
  
  // Chainlink USD pairs have 8 decimals
  const formattedPrice = formatUnits(rawPrice, 8);

  // Format to standard currency layout (e.g. $3,000.50)
  const displayPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Number(formattedPrice));

  return (
    <div className="flex items-center gap-2 text-xs font-bold font-mono text-black bg-gray-100 px-3 py-1 rounded-full border-2 border-black shadow-neo-sm">
      <span className="text-green-600">●</span>
      ETH: {displayPrice}
    </div>
  );
};
