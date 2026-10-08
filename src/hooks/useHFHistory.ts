import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { useWatchContractEvent } from 'wagmi';
import { usePosition } from './usePosition';
import { POSITION_ABI } from '../lib/abis/PositionABI';
import { formatHFNumber } from '../lib/utils/formatters';

export interface HFDataPoint {
  timestamp: number;
  hf: number;
  riskLevel: number;
}

const MAX_ENTRIES = 288;
const MIN_WRITE_INTERVAL = 30000;

export function useHFHistory(proxyAddress: Address | undefined) {
  const [history, setHistory] = useState<HFDataPoint[]>([]);
  const { healthFactor, riskLevel, status, isMock } = usePosition(proxyAddress);
  
  useEffect(() => {
    if (!proxyAddress) return;
    const key = "surge_hf_history_" + proxyAddress.toLowerCase();
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(item => 
            item && typeof item.timestamp === 'number' && typeof item.hf === 'number' && typeof item.riskLevel === 'number'
          );
          setHistory(valid);
        }
      }
    } catch (e) {
      console.error("Failed to parse HF history", e);
    }
  }, [proxyAddress]);

  useEffect(() => {
    if (!proxyAddress || status !== 1) return;

    const now = Date.now();
    setHistory(prev => {
      const lastEntry = prev[prev.length - 1];
      if (lastEntry && now - lastEntry.timestamp < MIN_WRITE_INTERVAL) {
        return prev;
      }
      
      const newEntry: HFDataPoint = {
        timestamp: now,
        hf: formatHFNumber(healthFactor),
        riskLevel
      };
      
      const nextHistory = [...prev, newEntry].slice(-MAX_ENTRIES);
      localStorage.setItem("surge_hf_history_" + proxyAddress.toLowerCase(), JSON.stringify(nextHistory));
      return nextHistory;
    });
  }, [proxyAddress, status, healthFactor, riskLevel]);

  useWatchContractEvent({
    address: proxyAddress,
    abi: POSITION_ABI,
    eventName: "HealthFactorWarning",
    enabled: !!proxyAddress && !isMock,
    onLogs: (logs) => {
      if (!proxyAddress) return;
      const now = Date.now();
      const newEntries = logs.map(log => ({
        timestamp: now,
        hf: formatHFNumber(log.args.healthFactor as bigint),
        riskLevel: log.args.riskLevel as number
      }));
      
      setHistory(prev => {
        const nextHistory = [...prev, ...newEntries].slice(-MAX_ENTRIES);
        localStorage.setItem("surge_hf_history_" + proxyAddress.toLowerCase(), JSON.stringify(nextHistory));
        return nextHistory;
      });
    }
  });

  const clearHistory = () => {
    if (!proxyAddress) return;
    localStorage.removeItem("surge_hf_history_" + proxyAddress.toLowerCase());
    setHistory([]);
  };

  return { history, clearHistory };
}
