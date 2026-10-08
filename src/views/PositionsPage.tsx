import React, { useEffect, useState } from 'react';
import { ArrowUpRight, History, PieChart, Wallet, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { RealPositionView } from '../components/RealPositionView';
import { Badge } from '../components/ui/Badge';
import { useWeb3 } from '../contexts/Web3Context';
import { usePublicClient } from 'wagmi';
import { CONTRACTS, DEPLOYMENT_BLOCK } from '../lib/constants';
import { POSITION_CLOSED_EVENT } from '../lib/abis/events';
import { useUserPositionsSummary } from '../hooks/useFactory';
import { usePositionsData } from '../hooks/usePositionsData';
import { usdAaveToNumber, decodeLabel, formatUsdc, formatWeth } from '../lib/utils/formatters';
import { HFBar } from "../components/hf/HFBar";
import { RiskBadge } from "../components/hf/RiskBadge";
import { hfColor, classifyHF } from "../lib/utils/hfCalculations";
import { formatHF, formatHFNumber } from "../lib/utils/formatters";


interface TradeHistoryLog {
  id: string;
  date: number;
  type: string;
  assetSymbol: string;
  netProfit: bigint;
  status: string;
  txHash: string;
  label: string;
}


const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative flex items-center ml-1 inline-flex">
    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-black transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-white text-[10px] font-mono leading-tight rounded-md border border-gray-700 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] text-center normal-case">
      {text}
    </div>
  </div>
);

export const PositionsPage: React.FC = () => {
  const { address, isConnected, isDemoMode, userProxies, contractService } = useWeb3();
  const publicClient = usePublicClient();
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryLog[]>([]);
  const [historyError, setHistoryError] = useState(false);

  // 1. TOP STATS AGGREGATION
  let totalCollateral = 0;
  let totalDebt = 0;
  let activeCount = 0;

  const { summaries: liveSummaries } = useUserPositionsSummary(isDemoMode ? undefined : address);
  const summaries = isDemoMode ? contractService.getMockUserPositionsSummary() : liveSummaries;

  const activeSummaries = summaries.filter(s => s.status === 1);
  const { data: positionsData } = usePositionsData(activeSummaries.map(s => s.proxyAddress), !isDemoMode);

  const enrichedSummaries = summaries.map(s => {
    if (s.status !== 1) return { ...s, healthFactor: 0n, riskLevel: 0 };
    if (isDemoMode) {
      const mockData = contractService.getMockFullPositionData(s.proxyAddress);
      return {
        ...s,
        healthFactor: mockData.healthFactor,
        riskLevel: mockData.riskLevel,
      };
    }
    const idx = activeSummaries.findIndex(a => a.proxyAddress === s.proxyAddress);
    const data = positionsData?.[idx]?.result as any;
    return {
      ...s,
      healthFactor: data?.healthFactor ?? 0n,
      riskLevel: data ? Number(data.riskLevel) : 0,
    };
  });

  const activeEnriched = enrichedSummaries.filter(s => s.status === 1 && s.healthFactor > 0n);

  let worstProxy: any = null;
  let worstHF = 0n;
  let worstRiskLevel = 0;
  
  const riskCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let totalHFNum = 0;

  activeEnriched.forEach(s => {
    riskCounts[s.riskLevel as keyof typeof riskCounts] = (riskCounts[s.riskLevel as keyof typeof riskCounts] || 0) + 1;
    totalHFNum += formatHFNumber(s.healthFactor);
    if (!worstProxy || s.healthFactor < worstHF) {
      worstProxy = s;
      worstHF = s.healthFactor;
      worstRiskLevel = s.riskLevel;
    }
  });

  const avgHF = activeEnriched.length > 0 ? totalHFNum / activeEnriched.length : 0;
  
  if (isDemoMode) {
    totalCollateral = 5000;
    totalDebt = 3000;
    activeCount = 1;
  } else {
    activeCount = activeSummaries.length;
    // Aave reports both figures in USD with 8 decimals.
    positionsData?.forEach(entry => {
      if (entry.status !== "success") return;
      totalCollateral += usdAaveToNumber(entry.result.totalCollateralBase);
      totalDebt += usdAaveToNumber(entry.result.totalDebtBase);
    });
  }

  const netEquity = totalCollateral - totalDebt;

  // 2. FETCH TRADE HISTORY
  useEffect(() => {
    const fetchHistory = async () => {
      if (isDemoMode) {
        const mockEvents = contractService.getMockTradeHistory();
        setTradeHistory(mockEvents.map((m, i) => ({
          id: `mock_${i}`,
          date: m.blockTimestamp * 1000,
          type: m.assetRepaid === CONTRACTS.USDC ? 'LONG' : 'SHORT',
          assetSymbol: m.assetRepaid === CONTRACTS.USDC ? 'WETH' : 'USDC',
          netProfit: m.netProfit,
          status: 'CLOSED',
          txHash: m.txHash,
          label: 'Mock Trade'
        })));
        return;
      }

      if (!publicClient || userProxies.length === 0) {
        setTradeHistory([]);
        return;
      }

      try {
        setHistoryError(false);
        const logs = await publicClient.getLogs({
          address: userProxies,
          event: POSITION_CLOSED_EVENT,
          fromBlock: DEPLOYMENT_BLOCK,
          toBlock: "latest",
        });

        const history: TradeHistoryLog[] = await Promise.all(logs.map(async (log, idx) => {
          const block = await publicClient.getBlock({ blockHash: log.blockHash });
          const isLong = log.args.assetRepaid?.toLowerCase() === CONTRACTS.USDC.toLowerCase();
          
          return {
            id: `${log.transactionHash}_${idx}`,
            date: Number(block.timestamp) * 1000,
            type: isLong ? 'LONG' : 'SHORT',
            assetSymbol: isLong ? 'WETH' : 'USDC',
            netProfit: log.args.netProfit || 0n,
            status: 'CLOSED',
            txHash: log.transactionHash,
            label: `Pos #${log.args.positionIndex}`
          };
        }));
        
        setTradeHistory(history.reverse());
      } catch (e) {
        console.error("Failed to fetch history logs", e);
        setHistoryError(true);
      }
    };
    fetchHistory();
  }, [publicClient, userProxies, isDemoMode]);

  const [openAccordionIdx, setOpenAccordionIdx] = useState<number>(0);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-12 rounded-xl text-center border-4 border-black shadow-neo-lg max-w-md">
          <Wallet className="w-16 h-16 text-black mx-auto mb-6" />
          <h2 className="text-3xl font-black text-black mb-4">WALLET NOT CONNECTED</h2>
          <p className="text-gray-600 font-medium mb-0">Please connect your wallet to view your active positions and history.</p>
        </div>
      </div>
    );
  }

  // Sort summaries: ACTIVE(1) first, IDLE(2) second, EMPTY(0) last
  const sortedSummaries = [...enrichedSummaries].sort((a, b) => {
    if (a.status === 1 && b.status !== 1) return -1;
    if (a.status !== 1 && b.status === 1) return 1;
    if (a.status === 2 && b.status === 0) return -1;
    if (a.status === 0 && b.status === 2) return 1;
    return 0;
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-black uppercase tracking-tight">Portfolio Overview</h1>
      </div>

      {/* Stats Grid */}

      {/* SECTION D: GLOBAL HF STATUS BAR */}
      {activeEnriched.length > 0 && (
        <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="font-bold font-mono text-sm mb-2">
            Portfolio HF <InfoTooltip text="The average Health Factor across all your active proxies. Keep this above 1.50 for safety." /> : {avgHF.toFixed(3)} avg across {activeEnriched.length} active positions
          </div>
          <HFBar hf={BigInt(Math.floor(avgHF * 1e18))} height={12} showTicks={false} />
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 hide-scrollbar">
            {activeEnriched.map(s => {
              const hfNum = formatHFNumber(s.healthFactor);
              return (
                <div key={s.proxyAddress} className="flex items-center gap-1 bg-gray-50 border border-gray-300 rounded-full px-2 py-1 flex-shrink-0" title={`${s.labelString}: ${hfNum.toFixed(3)}`}>
                  <div className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: hfColor(hfNum) }} />
                  <span className="text-xs font-mono">{s.labelString}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION A: RISK OVERVIEW GRID */}
      {activeEnriched.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="border-2 border-green-500 bg-green-50 p-4 rounded-xl relative shadow-neo-sm">
            <div className="text-xs font-bold text-green-800 uppercase mb-1">✓ Safe Positions</div>
            <div className="text-2xl font-black text-green-700">{riskCounts[0]}</div>
          </div>
          <div className="border-2 border-amber-500 bg-amber-50 p-4 rounded-xl relative shadow-neo-sm">
            <div className="text-xs font-bold text-amber-800 uppercase mb-1">⚠ Warning Positions</div>
            <div className="text-2xl font-black text-amber-700">{riskCounts[1]}</div>
          </div>
          <div className="border-2 border-orange-500 bg-orange-50 p-4 rounded-xl relative shadow-neo-sm">
            {riskCounts[2] > 0 && <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-black" />}
            <div className="text-xs font-bold text-orange-800 uppercase mb-1">⚡ Critical Positions</div>
            <div className="text-2xl font-black text-orange-700">{riskCounts[2]}</div>
          </div>
          <div className="border-2 border-red-500 bg-red-50 p-4 rounded-xl relative shadow-neo-sm">
            {riskCounts[3] > 0 && <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-black" />}
            <div className="text-xs font-bold text-red-800 uppercase mb-1">🔴 At Risk Positions</div>
            <div className="text-2xl font-black text-red-700">{riskCounts[3]}</div>
          </div>
        </div>
      )}

      {/* SECTION B: WORST POSITION ALERT */}
      {worstProxy && worstRiskLevel >= 2 && (
        <div className="mt-6 bg-red-100 border-2 border-red-500 p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] flex flex-col md:flex-row items-center justify-between">
          <div>
            <div className="font-bold text-red-800 text-lg mb-1">⚡ Position at Risk: {worstProxy.labelString}</div>
            <div className="text-red-700 font-mono text-sm">
              Health Factor: {formatHF(worstHF)} — {worstRiskLevel === 2 ? 'CRITICAL' : 'LIQUIDATABLE'}
            </div>
          </div>
          <button 
            className="mt-4 md:mt-0 bg-white border-2 border-red-500 text-red-600 font-bold px-4 py-2 hover:bg-red-50 transition-colors shadow-sm"
            onClick={() => {
              const idx = sortedSummaries.findIndex(s => s.proxyAddress === worstProxy.proxyAddress);
              if (idx !== -1) setOpenAccordionIdx(idx);
            }}
          >
            View Position →
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50">
          <div className="text-gray-600 font-bold text-xs mb-1 uppercase flex items-center">Total Collateral <InfoTooltip text="Total USD value of all assets supplied across your active proxies." /></div>
          <div className="text-2xl font-black text-black tracking-tight">${totalCollateral.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="bg-rose-50">
          <div className="text-gray-600 font-bold text-xs mb-1 uppercase flex items-center">Total Debt <InfoTooltip text="Total USD value of all assets borrowed from Aave." /></div>
          <div className="text-2xl font-black text-black tracking-tight">${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="bg-emerald-50">
          <div className="text-gray-600 font-bold text-xs mb-1 uppercase flex items-center">Net Equity <InfoTooltip text="Total Collateral minus Total Debt. This is your effective balance." /></div>
          <div className="text-2xl font-black text-black tracking-tight">${netEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="bg-[#ffe500]">
          <div className="text-gray-600 font-bold text-xs mb-1 uppercase flex items-center">Active Positions <InfoTooltip text="Number of proxy accounts currently holding active debt." /></div>
          <div className="text-2xl font-black text-black tracking-tight">{activeCount}</div>
        </Card>
      </div>

      {/* MULTI-PROXY ACCORDION */}
      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-black uppercase">Your Proxy Accounts</h2>
        {sortedSummaries.length === 0 ? (
          <Card><div className="text-center text-gray-500 py-8 font-bold">No proxy accounts found.</div></Card>
        ) : (
          sortedSummaries.map((summary, idx) => (
            <div key={summary.proxyAddress} className="border-2 border-black rounded-lg overflow-hidden shadow-neo-sm bg-white">
              <button 
                onClick={() => setOpenAccordionIdx(openAccordionIdx === idx ? -1 : idx)}
                className={`w-full flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 hover:bg-[#ffe500] transition-colors border-l-4 ${
                  summary.status === 1 ? (
                    summary.riskLevel === 0 ? 'border-l-green-500' :
                    summary.riskLevel === 1 ? 'border-l-amber-500' :
                    summary.riskLevel === 2 ? 'border-l-orange-500 animate-pulse' :
                    'border-l-red-500 animate-pulse'
                  ) : 'border-l-gray-300'
                }`}
              >
                <div className="flex items-center gap-4 mb-2 md:mb-0">
                  <div className={`w-3 h-3 rounded-full border border-black ${summary.status === 1 ? 'bg-green-500' : summary.status === 2 ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  <span className="font-black text-lg">{summary.labelString || `Position #${summary.positionIndex}`}</span>
                  <Badge variant={summary.status === 1 ? 'success' : 'neutral'}>
                    {summary.status === 1 ? 'ACTIVE' : summary.status === 2 ? 'IDLE' : 'EMPTY'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  {summary.status === 1 && (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end w-24">
                        <span className="font-bold font-mono text-sm" style={{ color: hfColor(formatHFNumber(summary.healthFactor)) }}>
                          {formatHF(summary.healthFactor)}
                        </span>
                        <div className="w-full mt-1">
                          <HFBar hf={summary.healthFactor} height={6} showTicks={false} />
                        </div>
                      </div>
                      <RiskBadge riskLevel={summary.riskLevel as any} size="xs" pulse={summary.riskLevel >= 2} />
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500 font-mono text-sm font-bold">
                    {summary.proxyAddress.slice(0,6)}...{summary.proxyAddress.slice(-4)}
                    {openAccordionIdx === idx ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>
              </button>
              
              {openAccordionIdx === idx && (
                <div className="p-4 border-t-2 border-black bg-white">
                  <RealPositionView proxyAddress={summary.proxyAddress} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Trade History */}
      <Card title="Trade History" className="mt-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-black text-xs font-bold text-black uppercase tracking-wider bg-gray-50">
                <th className="py-3 pl-4">Date</th>
                <th className="py-3">Type</th>
                <th className="py-3">Proxy</th>
                <th className="py-3">Net Profit</th>
                <th className="py-3 pr-4">Tx</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y-2 divide-gray-100">
              {tradeHistory.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500 font-bold">{historyError ? "Trade history could not be loaded from the network. It will retry when you reopen this page." : "No history found."}</td></tr>
              ) : (
                tradeHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors font-medium">
                    <td className="py-4 pl-4 text-gray-600 font-mono">
                      {new Date(item.date).toLocaleString()}
                    </td>
                    <td className="py-4">
                      <span className={`text-xs font-black ${item.type === 'LONG' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-black">{item.label}</td>
                    <td className={`py-4 font-bold font-mono ${item.netProfit > 0n ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {item.netProfit > 0n ? '+' : ''}
                      {item.type === 'LONG' ? formatUsdc(item.netProfit) : formatWeth(item.netProfit)}
                    </td>
                    <td className="py-4 pr-4">
                      <a href={`https://etherscan.io/tx/${item.txHash}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-mono text-xs">
                        {item.txHash.slice(0,8)}...
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};
