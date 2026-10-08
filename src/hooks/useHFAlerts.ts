import { useState, useEffect, useRef } from 'react';
import { Address } from 'viem';
import { toast } from 'react-hot-toast';
import { usePositionsData } from './usePositionsData';
import { formatHFNumber, decodeLabel, riskLabel as getRiskLabel } from '../lib/utils/formatters';

export interface AlertThresholds {
  warnAt: number;
  criticalAt: number;
  cooldownMs: number;
}

export interface AlertRecord {
  id: string;
  proxyAddress: Address;
  proxyLabel: string;
  riskLevel: number;
  hf: number;
  timestamp: number;
  acknowledged: boolean;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  warnAt: 1.6,
  criticalAt: 1.3,
  cooldownMs: 300_000,
};

export function useHFAlerts(userProxies: Address[], pollingEnabled = true) {
  const [alertHistory, setAlertHistory] = useState<AlertRecord[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  
  const lastAlertTimes = useRef<Record<string, number>>({});

  // Initialization from localStorage
  useEffect(() => {
    try {
      const storedThresholds = localStorage.getItem("surge_alert_thresholds");
      if (storedThresholds) setAlertThresholds({ ...DEFAULT_THRESHOLDS, ...JSON.parse(storedThresholds) });

      const storedHistory = localStorage.getItem("surge_alert_history");
      if (storedHistory) setAlertHistory(JSON.parse(storedHistory));

      const storedNotifications = localStorage.getItem("surge_notifications_enabled");
      if (storedNotifications) setNotificationsEnabled(JSON.parse(storedNotifications));

      const storedLastTimes = localStorage.getItem("surge_last_alert_times");
      if (storedLastTimes) lastAlertTimes.current = JSON.parse(storedLastTimes);
    } catch (e) {
      console.error("Failed to parse alert storage", e);
    }
  }, []);

  const saveThresholds = (t: AlertThresholds) => {
    setAlertThresholds(t);
    localStorage.setItem("surge_alert_thresholds", JSON.stringify(t));
  };

  const clearAlerts = () => {
    setAlertHistory([]);
    localStorage.removeItem("surge_alert_history");
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    setNotificationsEnabled(enabled);
    localStorage.setItem("surge_notifications_enabled", JSON.stringify(enabled));
  };

  const triggerAlert = (proxyAddress: Address, riskLevel: number, hfNum: number, labelString: string) => {
    lastAlertTimes.current[proxyAddress.toLowerCase()] = Date.now();
    localStorage.setItem("surge_last_alert_times", JSON.stringify(lastAlertTimes.current));

    const hfStr = hfNum.toFixed(3);

    // Toast
    if (riskLevel === 1) {
      toast(`⚠ ${labelString}: HF ${hfStr} — WARNING`, { duration: 8000 });
    } else if (riskLevel === 2) {
      toast.error(`⚡ ${labelString}: HF ${hfStr} — CRITICAL`, { duration: 15000 });
    } else if (riskLevel >= 3) {
      toast.error(`🔴 ${labelString} — LIQUIDATABLE NOW!`, { duration: Infinity, id: proxyAddress });
    }

    // Browser Notification
    if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      const riskText = getRiskLabel(riskLevel as any);
      new Notification(`Surge Finance: ${riskText}`, {
        body: `${labelString} — HF ${hfStr}`,
        icon: "/favicon.svg",
        tag: proxyAddress,
      });
    }

    // Append to history
    const newRecord: AlertRecord = {
      id: `${proxyAddress}-${Date.now()}`,
      proxyAddress,
      proxyLabel: labelString,
      riskLevel,
      hf: hfNum,
      timestamp: Date.now(),
      acknowledged: false,
    };

    setAlertHistory(prev => {
      const updated = [newRecord, ...prev].slice(0, 50);
      localStorage.setItem("surge_alert_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Poll position data for all user proxies
  const { data: positionsData } = usePositionsData(userProxies, pollingEnabled);

  useEffect(() => {
    if (!positionsData || positionsData.length === 0) return;

    userProxies.forEach((proxyAddress, index) => {
      const result = positionsData[index];
      if (!result || result.status !== "success" || !result.result) return;

      const fullData = result.result as any;
      const status = Number(fullData.status);
      
      if (status !== 1) return; // 1 = ACTIVE

      const healthFactor = fullData.healthFactor as bigint;
      const riskLevel = Number(fullData.riskLevel);
      const labelString = decodeLabel(fullData.label as string);
      const hfNum = formatHFNumber(healthFactor);

      const lastAlertTime = lastAlertTimes.current[proxyAddress.toLowerCase()] || 0;
      if (Date.now() - lastAlertTime < alertThresholds.cooldownMs) {
        return; // Cooldown active
      }

      if (hfNum <= alertThresholds.criticalAt && riskLevel >= 2) {
        triggerAlert(proxyAddress, riskLevel, hfNum, labelString);
      } else if (hfNum <= alertThresholds.warnAt && riskLevel >= 1) {
        triggerAlert(proxyAddress, riskLevel, hfNum, labelString);
      }
    });
  }, [positionsData, userProxies, alertThresholds]);

  return {
    alertHistory,
    clearAlerts,
    requestNotifications,
    notificationsEnabled,
    alertThresholds,
    setAlertThresholds: saveThresholds,
  };
}
