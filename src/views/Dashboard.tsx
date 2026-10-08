import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { TradingForm } from '../components/TradingForm';
import { PositionsList } from '../components/PositionsList';
import { TransactionModal } from '../components/TransactionModal';
import { SUPPORTED_ASSETS, CONTRACTS, CHAINLINK_ABI, ERC20_ABI } from '../lib/constants';
import { parseContractError } from '../lib/utils/errors';
import type { OpenPositionRequest, TransactionStep } from '../types';
import { usePosition, fetchOpenRequirements } from '../hooks/usePosition';
import { useWeb3 } from '../contexts/Web3Context';
import { useApproval } from '../hooks/useApproval';
import { formatUnits } from 'viem';
import { useBalance, useReadContract } from 'wagmi';

// Price shown in demo mode when no RPC is reachable. Never used for live trading.
const DEMO_ETH_PRICE = 2450.50;

export const Dashboard: React.FC = () => {
  const [isTransacting, setIsTransacting] = useState(false);
  const [transactionTitle, setTransactionTitle] = useState('');
  const [successText, setSuccessText] = useState('Done');
  const [activeStep, setActiveStep] = useState<TransactionStep[]>([]);
  const [isTxComplete, setIsTxComplete] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();
  const queryClient = useQueryClient();
  const { address, isDemoMode, userProxies, selectedProxyIndex, factory, isConnected, contractService, refreshProxies, setSelectedProxyIndex } = useWeb3();
  const targetProxy = userProxies[selectedProxyIndex];

  const { openPosition } = usePosition(targetProxy);
  const { isApproved, approveToken, getTokenBalance, wrapEth } = useApproval();

  // Fetch Live ETH Price
  const { data: clData } = useReadContract({
    address: CONTRACTS.CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    query: { refetchInterval: 10000 }
  });
  // 0 means "not loaded yet" — the form refuses to trade until a real price arrives.
  const liveEthPrice = clData ? Number(formatUnits((clData as any)[1] as bigint, 8)) : (isDemoMode ? DEMO_ETH_PRICE : 0);

  // Fetch balances
  const { data: ethBalanceData } = useBalance({ address });
  const { data: usdcBalanceData } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  const { data: wethBalanceData } = useReadContract({
    address: CONTRACTS.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const walletBalance = {
    eth: ethBalanceData ? Number(formatUnits(ethBalanceData.value, 18)) : (isDemoMode ? 10.5 : 0),
    weth: wethBalanceData !== undefined ? Number(formatUnits(wethBalanceData, 18)) : 0,
    usdc: usdcBalanceData !== undefined ? Number(formatUnits(usdcBalanceData, 6)) : (isDemoMode ? 25000 : 0)
  };

  const handleOpenPositionWrapper = async (params: OpenPositionRequest) => {
    setIsTransacting(true);
    setIsTxComplete(false);
    setIsError(false);
    setErrorMessage("");
    setTransactionTitle(`Opening ${params.leverage}x ${params.type} on ${params.asset.symbol}`);
    setSuccessText("View Position");

    let steps: TransactionStep[] = [
      { id: '1', label: 'Sign Transaction', status: 'LOADING' },
      { id: '2', label: 'Execute Flash Loan (Proxy)', status: 'PENDING' },
      { id: '3', label: 'Confirming on Blockchain', status: 'PENDING' }
    ];

    if (!isDemoMode && !targetProxy) {
      steps = [
         { id: '0', label: 'Deploying Smart Account', status: 'LOADING' },
         ...steps.map(s => ({...s, status: 'PENDING'} as TransactionStep))
      ];
    }
    setActiveStep(steps);

    try {
      const updateStep = (id: string, status: 'LOADING' | 'COMPLETE') => {
        steps = steps.map(s => s.id === id ? { ...s, status } : s);
        const currentIndex = steps.findIndex(s => s.id === id);
        if (status === 'COMPLETE' && currentIndex + 1 < steps.length) {
            steps[currentIndex + 1].status = 'LOADING';
        }
        setActiveStep([...steps]);
      }

      if (isDemoMode) {
        updateStep('1', 'COMPLETE');
        await new Promise(r => setTimeout(r, 800));
        updateStep('2', 'COMPLETE');
        await contractService.simulateOpenPosition(targetProxy || userProxies[0], params);
        updateStep('3', 'COMPLETE');
      } else {
        if (!address) throw new Error("Wallet not connected");
        let activeProxy = targetProxy;

        if (!activeProxy) {
           setTransactionTitle(`Deploying Account & Opening ${params.leverage}x ${params.type}`);
           activeProxy = await factory.deployPosition();
           const proxies = await refreshProxies();
           const idx = proxies.findIndex(p => p.toLowerCase() === activeProxy.toLowerCase());
           if (idx !== -1) setSelectedProxyIndex(idx);
           updateStep('0', 'COMPLETE');
        }

        // Capital is paid in the token that gets flash-borrowed:
        // USDC for a long (WETH is supplied), WETH for a short (USDC is supplied).
        const isLong = params.type === 'LONG';
        const capitalToken = isLong ? CONTRACTS.USDC : CONTRACTS.WETH;
        const supplyToken  = isLong ? CONTRACTS.WETH : CONTRACTS.USDC;

        // The contract decides the fee (and so the approval) and which fee mode this proxy must use.
        const { approvalAmount, feeMode } = await fetchOpenRequirements(activeProxy, capitalToken, params.capital);

        if (!isLong) {
          const wethBalance = await getTokenBalance(CONTRACTS.WETH, address);
          if (wethBalance < approvalAmount) {
            setTransactionTitle(`Wrapping ETH to WETH`);
            await wrapEth(approvalAmount - wethBalance);
          }
        }

        setTransactionTitle(`Approving ${isLong ? 'USDC' : 'WETH'} for ${params.leverage}x ${params.type}`);
        const approved = await isApproved(capitalToken, address, activeProxy, approvalAmount);
        if (!approved) {
           await approveToken(capitalToken, activeProxy, approvalAmount);
        }

        updateStep('1', 'COMPLETE');

        setTransactionTitle(`Executing Flashloan & Opening Position`);
        await openPosition({
          assetToSupply: supplyToken,
          assetToBorrow: capitalToken,
          assetToBorrowAmount: params.borrowAmount,
          expectedSwapAmount: params.expectedSwapAmount,
          poolFee: params.poolFee
        }, params.capital, feeMode, activeProxy);

        updateStep('2', 'COMPLETE');
        updateStep('3', 'COMPLETE');
        queryClient.invalidateQueries();
      }

      setIsTxComplete(true);
    } catch (e: any) {
      console.error(e);
      const currentIdx = steps.findIndex(s => s.status === 'LOADING');
      if (currentIdx !== -1) steps[currentIdx].status = 'ERROR';
      setActiveStep([...steps]);
      setIsError(true);
      setErrorMessage(parseContractError(e));
    }
  };

  const handleClosePositionWrapper = async (id: string) => {
    setIsTransacting(true);
    setIsTxComplete(false);
    setIsError(false);
    setErrorMessage("");
    setTransactionTitle('Closing Position');
    setSuccessText("Done");

    const steps: TransactionStep[] = [
      { id: '1', label: 'Sign Transaction', status: 'LOADING' },
      { id: '2', label: 'Flash Loan Repayment', status: 'PENDING' },
      { id: '3', label: 'Confirming on Blockchain', status: 'PENDING' }
    ];
    setActiveStep(steps);

    try {
      const updateStep = (idx: number, status: 'COMPLETE') => {
        steps[idx].status = status;
        if (idx + 1 < steps.length) steps[idx + 1].status = 'LOADING';
        setActiveStep([...steps]);
      }

      updateStep(0, 'COMPLETE');
      await new Promise(r => setTimeout(r, 800));
      updateStep(1, 'COMPLETE');
      await new Promise(r => setTimeout(r, 800));
      updateStep(2, 'COMPLETE');

      setIsTxComplete(true);
    } catch (e: any) {
      const currentIdx = steps.findIndex(s => s.status === 'LOADING');
      if (currentIdx !== -1) steps[currentIdx].status = 'ERROR';
      setActiveStep([...steps]);
      setIsError(true);
      setErrorMessage(parseContractError(e));
    }
  };

  const handleModalClose = () => {
    setIsTransacting(false);
    if (isTxComplete && successText === "View Position") router.push('/positions');
  };

  const assets = SUPPORTED_ASSETS.map(a => a.symbol === 'WETH' ? { ...a, price: liveEthPrice } : a);

  return (
    <div className="space-y-8 animate-in fade-in">
      {!isConnected && (
        <div className="bg-accent border-2 border-black rounded-xl p-8 md:p-12 text-center mb-8 shadow-neo-lg">
          <h1 className="text-5xl md:text-6xl font-black mb-4 text-black tracking-tight">
            ONE-CLICK DEFI LEVERAGE TRADING
          </h1>
          <p className="text-black text-xl font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
            Access institutional-grade leverage using untapped DeFi flash loans.
            Open long/short positions with up to 5x leverage in a single click with Surge Finance.
          </p>
          <div className="flex justify-center gap-4">
            <p className="font-bold">Please connect your wallet in the top right to start trading.</p>
          </div>
        </div>
      )}

      <TradingForm
        assets={assets}
        wallet={walletBalance}
        onOpenPosition={handleOpenPositionWrapper}
        isConnected={isConnected}
      />

      {isConnected && isDemoMode && (
        <PositionsList
          positions={[]} // Mock positions handling removed for simplicity here as it's fully implemented in /positions
          onClosePosition={handleClosePositionWrapper}
          walletBalance={walletBalance.usdc}
        />
      )}

      <TransactionModal
        isOpen={isTransacting}
        onClose={handleModalClose}
        steps={activeStep}
        title={transactionTitle}
        isComplete={isTxComplete}
        isError={isError}
        errorMessage={errorMessage}
        successText={successText}
      />
    </div>
  );
};
