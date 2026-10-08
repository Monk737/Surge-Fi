import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useFactory, useUserPositions } from '../hooks/useFactory';
import { ContractService, contractService, MOCK_PROXIES } from '../services/ContractService';
import { parseContractError } from '../lib/utils/errors';
import type { Address } from 'viem';
import toast from 'react-hot-toast';

interface Web3ContextType {
  address: Address | undefined;
  isConnected: boolean;
  userProxies: Address[];
  selectedProxyIndex: number;
  selectedProxy: Address | undefined;
  hasNoProxies: boolean;
  totalProxies: number;
  setSelectedProxyIndex: (index: number) => void;
  refreshProxies: () => Promise<Address[]>;
  deployAndSelectProxy: () => Promise<void>;
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  factory: ReturnType<typeof useFactory>;
  contractService: ContractService;
}

const Web3Context = createContext<Web3ContextType>({} as Web3ContextType);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected, chainId } = useAccount();

  const [isDemoMode, setDemoMode] = useState(false);
  const [selectedProxyIndex, setSelectedProxyIndexState] = useState(0);

  const factory = useFactory();

  const { positions: realProxies, refetch: refetchProxies } = useUserPositions(isDemoMode ? undefined : address);
  const userProxies = isDemoMode ? MOCK_PROXIES : realProxies;
  // Demo and mainnet lists differ in length, so never index past the end of the current one.
  const safeProxyIndex = selectedProxyIndex < userProxies.length ? selectedProxyIndex : 0;
  const selectedProxy = userProxies[safeProxyIndex];

  useEffect(() => {
    if (isConnected && chainId !== 1 && !isDemoMode) {
      toast.error("Please switch to Ethereum Mainnet");
    }
  }, [chainId, isConnected, isDemoMode]);

  useEffect(() => {
    if (address && !isDemoMode) {
      const saved = localStorage.getItem(`surge_proxy_idx_${address}`);
      if (saved) {
        const idx = parseInt(saved, 10);
        if (idx < userProxies.length) setSelectedProxyIndexState(idx);
        else setSelectedProxyIndexState(0);
      }
    }
  }, [address, isDemoMode, userProxies.length]);

  useEffect(() => {
    if (!isConnected && !isDemoMode) {
      setSelectedProxyIndexState(0);
    }
  }, [isConnected, isDemoMode]);

  const setSelectedProxyIndex = (index: number) => {
    setSelectedProxyIndexState(index);
    if (address && !isDemoMode) {
      localStorage.setItem(`surge_proxy_idx_${address}`, index.toString());
    }
  };

  const refreshProxies = async (): Promise<Address[]> => {
    if (isDemoMode) return MOCK_PROXIES;
    const { data } = await refetchProxies();
    return data ? [...data] : [];
  };

  const deployAndSelectProxy = async () => {
    if (isDemoMode) return;
    try {
      const newProxy = await factory.deployPosition();
      const proxies = await refreshProxies();
      const idx = proxies.findIndex(p => p.toLowerCase() === newProxy.toLowerCase());
      if (idx !== -1) setSelectedProxyIndex(idx);
      toast.success("New position account created");
    } catch (e: any) {
      toast.error(parseContractError(e));
    }
  };

  return (
    <Web3Context.Provider value={{
      address,
      isConnected: isConnected || isDemoMode,
      userProxies,
      selectedProxyIndex: safeProxyIndex,
      selectedProxy,
      hasNoProxies: userProxies.length === 0,
      totalProxies: userProxies.length,
      setSelectedProxyIndex,
      refreshProxies,
      deployAndSelectProxy,
      isDemoMode,
      setDemoMode,
      factory,
      contractService,
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
