import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { IS_FACTORY_CONFIGURED } from '../lib/constants';

// Makes a misconfigured or paused deployment obvious on mainnet, instead of it
// looking like an empty account.
export const ConfigNotice: React.FC = () => {
  const { isDemoMode, factory } = useWeb3();
  if (isDemoMode) return null;

  const message = !IS_FACTORY_CONFIGURED
    ? "Live trading is unavailable: no contract address is configured for this deployment. Switch to DEMO to explore the interface."
    : factory.factoryPaused
      ? "The protocol is currently paused. New positions cannot be opened; existing positions can still be closed."
      : null;
  if (!message) return null;

  return (
    <div className="mb-8 bg-amber-100 border-2 border-black rounded-lg p-4 font-bold text-sm shadow-neo-sm">
      ⚠ {message}
    </div>
  );
};
