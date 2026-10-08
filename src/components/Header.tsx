import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../contexts/Web3Context';
import { AlertTriangle, Activity } from 'lucide-react';
import { LiveCryptoPrice } from './LiveCryptoPrice';
import { useHFAlerts } from "../hooks/useHFAlerts";
import { riskLabel, formatHF, formatHFNumber } from "../lib/utils/formatters";
import { hfColor } from "../lib/utils/hfCalculations";
import { usePositionsData } from "../hooks/usePositionsData";
import { Bell, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";


export const Header: React.FC = () => {
  const { isDemoMode, setDemoMode, userProxies, factory, isConnected } = useWeb3();
  
  // Demo proxies are placeholder addresses, so there is nothing to poll for them.
  const { alertHistory, requestNotifications, notificationsEnabled } = useHFAlerts(userProxies, !isDemoMode);
  const [showNotifications, setShowNotifications] = useState(false);

  // Poll full data for user proxies to find worstRiskLevel and worstHF
  const { data: positionsData } = usePositionsData(userProxies, !isDemoMode);

  let worstRiskLevel = 0;
  let worstHF = 0n;
  let activeCount = 0;
  let warningOrWorseCount = 0;

  if (positionsData) {
    positionsData.forEach(result => {
      if (result.status === "success" && result.result) {
        const data = result.result as any;
        if (Number(data.status) === 1) { // ACTIVE
          activeCount++;
          const rl = Number(data.riskLevel);
          const hf = data.healthFactor as bigint;
          if (rl >= 1) warningOrWorseCount++;
          if (rl > worstRiskLevel || (rl === worstRiskLevel && (worstHF === 0n || hf < worstHF))) {
            worstRiskLevel = rl;
            worstHF = hf;
          }
        }
      }
    });
  }
  
  const unreadAlertsCount = alertHistory.filter(a => !a.acknowledged).length;


  return (
    <header className="sticky top-0 z-40 bg-white border-b-4 border-black mb-8 px-4 py-3 flex items-center justify-between shadow-neo-sm">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-2xl font-black uppercase tracking-tighter hover:text-accent transition-colors">
          SURGE_
        </Link>

        <nav className="flex flex-wrap items-center gap-4 font-bold text-sm">
          <Link href="/" className="hover:text-accent transition-colors">Home</Link>
          <Link href="/positions" className="hover:text-accent transition-colors">Positions</Link>
          <Link href="/leaderboard" className="hover:text-accent transition-colors">🏆 Leaderboard</Link>
          <Link href="/docs" className="hover:text-accent transition-colors">Docs</Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <LiveCryptoPrice />

        {worstRiskLevel >= 1 && (
          <Link href="/positions">
            {worstRiskLevel === 1 ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border-2 border-amber-500 bg-amber-100 font-bold text-xs text-black shadow-neo-sm transition-transform hover:-translate-y-0.5">
                <Activity className="w-3 h-3" />
                ⚠ HF Warning {warningOrWorseCount > 1 ? `(${warningOrWorseCount})` : ''}
              </div>
            ) : worstRiskLevel === 2 ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border-2 border-red-500 bg-red-100 font-bold text-xs text-red-600 shadow-neo-sm transition-transform hover:-translate-y-0.5 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                ⚡ HF Critical: {formatHF(worstHF)}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border-2 border-black bg-red-600 font-bold text-xs text-white shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse transition-transform hover:-translate-y-0.5">
                <AlertTriangle className="w-3 h-3 animate-ping" />
                🔴 LIQUIDATION RISK
              </div>
            )}
          </Link>
        )}

        {/* NOTIFICATION BELL ICON */}
        <div className="relative">
          <button 
            onClick={() => {
              if (!notificationsEnabled) requestNotifications();
              else setShowNotifications(!showNotifications);
            }}
            className="relative p-2 rounded-lg border-2 border-black hover:bg-gray-100 transition-colors shadow-neo-sm bg-white"
            title={notificationsEnabled ? "Notifications" : "Enable notifications"}
          >
            {notificationsEnabled ? <Bell className="w-5 h-5 text-black" /> : <BellOff className="w-5 h-5 text-gray-400" />}
            {unreadAlertsCount > 0 && notificationsEnabled && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border border-black animate-pulse" />
            )}
          </button>

          {showNotifications && notificationsEnabled && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white border-2 border-black shadow-neo rounded-xl overflow-hidden z-50 flex flex-col">
              <div className="bg-black text-white p-3 font-bold text-sm border-b-2 border-black flex justify-between items-center">
                <span>Recent Alerts</span>
                {unreadAlertsCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full border border-black">
                    {unreadAlertsCount} New
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y-2 divide-gray-100">
                {alertHistory.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm font-bold">No recent alerts.</div>
                ) : (
                  alertHistory.slice(0, 5).map(alert => (
                    <div key={alert.id} className="p-3 hover:bg-gray-50 transition-colors flex flex-col gap-1 text-sm font-mono">
                      <div className="flex justify-between items-center">
                        <span className="font-bold truncate" title={alert.proxyLabel}>{alert.proxyLabel}</span>
                        <span className="text-[10px] text-gray-400">{formatDistanceToNow(alert.timestamp)} ago</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: hfColor(alert.hf) }} className="font-bold">HF {alert.hf.toFixed(3)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${alert.riskLevel === 3 ? 'border-red-500 bg-red-100 text-red-600' : alert.riskLevel === 2 ? 'border-orange-500 bg-orange-100 text-orange-600' : 'border-amber-500 bg-amber-100 text-amber-600'}`}>
                          {riskLabel(alert.riskLevel as any)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t-2 border-black bg-gray-50 flex justify-center">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-gray-600 hover:text-black">
                  <input 
                    type="checkbox" 
                    checked={notificationsEnabled} 
                    onChange={() => requestNotifications()} 
                    className="accent-black w-3 h-3"
                  />
                  Browser notifications enabled
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="hidden md:block bg-gray-100 border-2 border-black px-3 py-1.5 rounded-lg text-xs font-bold font-mono shadow-neo-sm">
              {userProxies.length > 0 ? `${userProxies.length} Positions` : <span className="text-gray-400">No Positions</span>}
            </div>
          )}

          <div className="flex items-center gap-2 bg-gray-100 border-2 border-black p-1 rounded-lg shadow-neo-sm">
            <button
              onClick={() => setDemoMode(true)}
              className={`px-3 py-1 text-xs font-bold rounded ${isDemoMode ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
            >
              DEMO
            </button>
            <button
              onClick={() => setDemoMode(false)}
              className={`px-3 py-1 text-xs font-bold rounded ${!isDemoMode ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
            >
              MAINNET
            </button>
          </div>

          <ConnectButton 
            chainStatus="icon" 
            showBalance={false}
            accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }} 
          />
        </div>
      </div>
    </header>
  );
};
