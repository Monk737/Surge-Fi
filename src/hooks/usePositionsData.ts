import { useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { POSITION_ABI } from '../lib/abis/PositionABI';
import { POLL_INTERVAL } from '../lib/constants';

// getFullPositionData() for several proxies in a single multicall.
// Results come back in the same order as `proxies`.
export function usePositionsData(proxies: readonly Address[], enabled = true) {
  return useReadContracts({
    contracts: proxies.map(address => ({
      address,
      abi: POSITION_ABI,
      functionName: "getFullPositionData" as const,
    })),
    query: { refetchInterval: POLL_INTERVAL, enabled: enabled && proxies.length > 0 },
  });
}
