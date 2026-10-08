import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useWeb3 } from '../contexts/Web3Context';
import { formatVolume, truncateAddress } from '../lib/utils/formatters';

type LeaderboardTab = 'GAINERS' | 'LOSERS' | 'ACTIVE' | 'ALL';

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: 'GAINERS', label: '🏆 Top Gainers' },
  { id: 'LOSERS',  label: '💀 Zero Profit Closes' },
  { id: 'ACTIVE',  label: '🔥 Most Active' },
  { id: 'ALL',     label: '📊 All Proxies' },
];

const STATUS_LABELS = ['EMPTY', 'ACTIVE', 'IDLE'];
const ROW_LIMIT = 20;

const rankLabel = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`);

export const LeaderboardPage: React.FC = () => {
  const { fetchLeaderboard, data, isLoading, error, progress } = useLeaderboard();
  const { isDemoMode } = useWeb3();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('GAINERS');

  useEffect(() => {
    fetchLeaderboard();
  }, [isDemoMode]);

  const traders = !data ? []
    : activeTab === 'GAINERS' ? data.topGainers
    : activeTab === 'LOSERS'  ? data.biggestLosers
    : data.mostActive;
  const isEmpty = !data || (activeTab === 'ALL' ? data.allPositions.length === 0 : traders.length === 0);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center border-b-4 border-black pb-4">
        <h1 className="text-4xl font-black uppercase tracking-tight">Leaderboard</h1>
        <button
          onClick={fetchLeaderboard}
          disabled={isLoading}
          className="px-4 py-2 border-2 border-black font-bold shadow-neo-sm bg-white hover:bg-gray-50 active:translate-y-0.5 disabled:opacity-50"
        >
          {isLoading ? `Loading ${progress.loaded}/${progress.total}...` : 'Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-lg p-4 text-rose-900 font-bold text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#ffe500]"><div className="text-sm font-bold">Total Positions</div><div className="text-2xl font-black">{data.allPositions.length}</div></Card>
          <Card className="bg-blue-50"><div className="text-sm font-bold">Total Traders</div><div className="text-2xl font-black">{data.topGainers.length}</div></Card>
          <Card className="bg-green-50"><div className="text-sm font-bold">Protocol Fees</div><div className="text-2xl font-black">{formatVolume(data.totalFeesUSD)}</div></Card>
          <Card className="bg-purple-50"><div className="text-sm font-bold">Total Volume</div><div className="text-2xl font-black">{formatVolume(data.totalVolumeUSD)}</div></Card>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-black border-2 border-black rounded-lg transition-transform hover:-translate-y-1 ${activeTab === tab.id ? 'bg-accent shadow-neo' : 'bg-white shadow-neo-sm'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b-2 border-black">
            {activeTab === 'ALL' ? (
              <tr>
                <th className="p-4 font-bold">#</th>
                <th className="p-4 font-bold">Proxy</th>
                <th className="p-4 font-bold">Owner</th>
                <th className="p-4 font-bold text-right">Status</th>
              </tr>
            ) : (
              <tr>
                <th className="p-4 font-bold">Rank</th>
                <th className="p-4 font-bold">Trader</th>
                <th className="p-4 font-bold">{activeTab === 'LOSERS' ? 'Zero-Profit' : 'Trades'}</th>
                <th className="p-4 font-bold text-right">{activeTab === 'GAINERS' ? 'Total Profit' : activeTab === 'ACTIVE' ? 'Volume' : 'Win Rate'}</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y-2 divide-gray-100">
            {isEmpty && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 font-bold">
                  {isLoading ? 'Loading...' : 'Nothing to show yet.'}
                </td>
              </tr>
            )}
            {data && activeTab === 'ALL' && data.allPositions.slice(0, 100).map(p => (
              <tr key={p.proxyAddress}>
                <td className="p-4 font-black">{p.positionIndex > 0n ? `#${p.positionIndex}` : '—'}</td>
                <td className="p-4 font-mono">{truncateAddress(p.proxyAddress)} <span className="text-gray-500 font-sans text-sm">{p.label}</span></td>
                <td className="p-4 font-mono">{p.owner ? truncateAddress(p.owner) : '—'}</td>
                <td className="p-4 text-right font-bold">{STATUS_LABELS[p.status] ?? '—'}</td>
              </tr>
            ))}
            {data && activeTab !== 'ALL' && traders.slice(0, ROW_LIMIT).map((t, i) => (
              <tr key={t.owner}>
                <td className="p-4 font-black">{rankLabel(i)}</td>
                <td className="p-4 font-mono">{truncateAddress(t.owner)}</td>
                <td className="p-4">{activeTab === 'LOSERS' ? t.zeroProfitCloses : t.totalTrades}</td>
                {activeTab === 'GAINERS' && <td className="p-4 text-right font-black text-green-600">+{formatVolume(t.totalProfitUsd)}</td>}
                {activeTab === 'ACTIVE'  && <td className="p-4 text-right font-black">{formatVolume(t.totalVolumeUsd)}</td>}
                {activeTab === 'LOSERS'  && <td className="p-4 text-right font-black">{t.winRate.toFixed(0)}%</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
