import { useState } from 'react';
import { getPublicClient, readContract, readContracts } from 'wagmi/actions';
import type { Address } from 'viem';
import { wagmiConfig } from '../lib/wagmi';
import { POSITION_FACTORY_ABI } from '../lib/abis/PositionFactoryABI';
import { POSITION_CLOSED_EVENT, POSITION_OPENED_EVENT, POSITION_REOPENED_EVENT, PROTOCOL_FEE_EVENT } from '../lib/abis/events';
import { CONTRACTS, DEPLOYMENT_BLOCK, CHAINLINK_ABI, IS_FACTORY_CONFIGURED } from '../lib/constants';
import { usdcToUsd, wethToUsd, decodeLabel } from '../lib/utils/formatters';
import { useWeb3 } from '../contexts/Web3Context';

// getAllPositions() caps `limit` at MAX_BATCH_SIZE (200) on-chain.
const POSITIONS_PAGE_SIZE = 200n;
const LOG_BATCH_SIZE = 20;

export interface TraderStats {
  owner: Address;
  totalProfitUsd: number;
  totalVolumeUsd: number;
  totalTrades: number;
  winningTrades: number;
  zeroProfitCloses: number;
  winRate: number;
  activePositions: number;
}

export interface PositionRecord {
  proxyAddress: Address;
  owner: Address;
  positionIndex: bigint;
  status: number;
  label: string;
}

export interface LeaderboardData {
  topGainers: TraderStats[];
  biggestLosers: TraderStats[];
  mostActive: TraderStats[];
  allPositions: PositionRecord[];
  totalFeesUSD: number;
  totalVolumeUSD: number;
}

const EMPTY_LEADERBOARD: LeaderboardData = {
  topGainers: [], biggestLosers: [], mostActive: [], allPositions: [], totalFeesUSD: 0, totalVolumeUSD: 0,
};

const newTrader = (owner: Address): TraderStats =>
  ({ owner, totalProfitUsd: 0, totalVolumeUsd: 0, totalTrades: 0, winningTrades: 0, zeroProfitCloses: 0, winRate: 0, activePositions: 0 });

async function fetchAllPositionAddresses(): Promise<Address[]> {
  const addresses: Address[] = [];
  for (let offset = 0n; ; offset += POSITIONS_PAGE_SIZE) {
    const [page, total] = await readContract(wagmiConfig, {
      address: CONTRACTS.POSITION_FACTORY,
      abi: POSITION_FACTORY_ABI,
      functionName: "getAllPositions",
      args: [offset, POSITIONS_PAGE_SIZE],
    });
    addresses.push(...page);
    if (page.length === 0 || BigInt(addresses.length) >= total) return addresses;
  }
}

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { isDemoMode } = useWeb3();

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        setProgress({ loaded: 100, total: 100 });
        const mockGainers = [
          { owner: "0xMockUser1" as Address, totalProfitUsd: 15400, totalVolumeUsd: 500000, totalTrades: 12, winningTrades: 9, zeroProfitCloses: 3, winRate: 75, activePositions: 2 },
          { owner: "0xMockUser2" as Address, totalProfitUsd: 8200, totalVolumeUsd: 200000, totalTrades: 5, winningTrades: 4, zeroProfitCloses: 1, winRate: 80, activePositions: 1 },
          { owner: "0xMockUser3" as Address, totalProfitUsd: 4100, totalVolumeUsd: 80000, totalTrades: 3, winningTrades: 3, zeroProfitCloses: 0, winRate: 100, activePositions: 0 },
        ];
        setData({
          topGainers: mockGainers,
          biggestLosers: [
            { owner: "0xMockLoser1" as Address, totalProfitUsd: -5000, totalVolumeUsd: 120000, totalTrades: 8, winningTrades: 2, zeroProfitCloses: 6, winRate: 25, activePositions: 1 },
          ],
          mostActive: mockGainers,
          allPositions: [
            { proxyAddress: "0x1111111111111111111111111111111111111111" as Address, owner: "0xMockUser1" as Address, positionIndex: 1n, status: 1, label: "ETH Long #1" },
            { proxyAddress: "0x2222222222222222222222222222222222222222" as Address, owner: "0xMockUser2" as Address, positionIndex: 2n, status: 1, label: "ETH Short #2" },
          ],
          totalFeesUSD: 12450.50,
          totalVolumeUSD: 2450000.00
        });
        setLastUpdated(new Date());
        return;
      }

      if (!IS_FACTORY_CONFIGURED) {
        setData(EMPTY_LEADERBOARD);
        return;
      }

      const client = getPublicClient(wagmiConfig);
      
      const addresses = await fetchAllPositionAddresses();
      setProgress({ loaded: 0, total: addresses.length });
      
      const allClosedLogs: any[] = [];
      const allOpenedLogs: any[] = [];
      const allFeeLogs: any[] = [];

      for (let i = 0; i < addresses.length; i += LOG_BATCH_SIZE) {
        const batch = addresses.slice(i, i + LOG_BATCH_SIZE);
        const [closedLogs, openedLogs, feeLogs] = await Promise.all([
          client.getLogs({ address: batch, event: POSITION_CLOSED_EVENT, fromBlock: DEPLOYMENT_BLOCK, toBlock: "latest" }),
          client.getLogs({ address: batch, events: [POSITION_OPENED_EVENT, POSITION_REOPENED_EVENT], fromBlock: DEPLOYMENT_BLOCK, toBlock: "latest" }),
          client.getLogs({ address: batch, event: PROTOCOL_FEE_EVENT, fromBlock: DEPLOYMENT_BLOCK, toBlock: "latest" }),
        ]);
        allClosedLogs.push(...closedLogs);
        allOpenedLogs.push(...openedLogs);
        allFeeLogs.push(...feeLogs);
        setProgress(p => ({ ...p, loaded: Math.min(p.loaded + LOG_BATCH_SIZE, p.total) }));
      }

      const clData = await readContract(wagmiConfig, { 
        address: CONTRACTS.CHAINLINK_ETH_USD, 
        abi: CHAINLINK_ABI, 
        functionName: "latestRoundData" 
      });
      const clAnswer = clData[1];

      const details = await readContracts(wagmiConfig, {
        contracts: addresses.map(proxy => ({
          address: CONTRACTS.POSITION_FACTORY,
          abi: POSITION_FACTORY_ABI,
          functionName: "getPositionDetails" as const,
          args: [proxy] as const,
        })),
      });

      const traders: Record<string, TraderStats> = {};
      let totalFeesUSD = 0;
      let totalVolumeUSD = 0;

      // Fees
      for (const log of allFeeLogs) {
        const amt = log.args.amount as bigint;
        const tok = log.args.token as Address;
        if (tok.toLowerCase() === CONTRACTS.USDC.toLowerCase()) totalFeesUSD += usdcToUsd(amt);
        if (tok.toLowerCase() === CONTRACTS.WETH.toLowerCase()) totalFeesUSD += wethToUsd(amt, clAnswer);
      }

      // Volume
      for (const log of allOpenedLogs) {
        const cap = log.args.capitalDeposited as bigint;
        const tok = log.args.assetSupplied as Address;
        // Capital is paid in the borrowed asset: USDC when WETH is supplied (long), WETH otherwise (short).
        let vol = 0;
        if (tok.toLowerCase() === CONTRACTS.WETH.toLowerCase()) vol = usdcToUsd(cap);
        else vol = wethToUsd(cap, clAnswer);
        totalVolumeUSD += vol;
        
        const owner = log.args.owner as Address;
        if (!traders[owner]) traders[owner] = newTrader(owner);
        traders[owner].totalVolumeUsd += vol;
      }

      // Profits & Trades
      for (const log of allClosedLogs) {
        const owner = log.args.owner as Address;
        if (!traders[owner]) traders[owner] = newTrader(owner);
        
        const profit = log.args.netProfit as bigint;
        const rep = log.args.assetRepaid as Address;
        const pUsd = rep.toLowerCase() === CONTRACTS.USDC.toLowerCase() ? usdcToUsd(profit) : wethToUsd(profit, clAnswer);
        
        traders[owner].totalTrades += 1;
        if (pUsd > 0) {
          traders[owner].totalProfitUsd += pUsd;
          traders[owner].winningTrades += 1;
        } else {
          traders[owner].zeroProfitCloses += 1;
        }
      }

      const allPositions: PositionRecord[] = addresses.map((addr, i) => {
        const summary = details[i]?.status === "success" ? details[i].result : undefined;
        const owner = summary?.owner as Address | undefined;
        if (owner && summary?.status === 1) {
          if (!traders[owner]) traders[owner] = newTrader(owner);
          traders[owner].activePositions += 1;
        }
        return {
          proxyAddress: addr,
          owner: owner ?? ("" as Address),
          positionIndex: summary?.positionIndex ?? 0n,
          status: summary?.status ?? 0,
          label: summary ? decodeLabel(summary.label) : "Unnamed",
        };
      });

      const traderList = Object.values(traders).map(t => {
        t.winRate = t.totalTrades > 0 ? (t.winningTrades / t.totalTrades) * 100 : 0;
        return t;
      });

      const topGainers = [...traderList].sort((a,b) => b.totalProfitUsd - a.totalProfitUsd);
      const biggestLosers = [...traderList].sort((a,b) => b.zeroProfitCloses - a.zeroProfitCloses);
      const mostActive = [...traderList].sort((a,b) => b.totalTrades - a.totalTrades);

      setData({
        topGainers, biggestLosers, mostActive, allPositions, totalFeesUSD, totalVolumeUSD
      });
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError("Could not load leaderboard data from the network. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return { fetchLeaderboard, data, isLoading, error, progress, lastUpdated };
}
