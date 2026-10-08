import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Zap, Plus, CircleDot } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Slider } from './ui/Slider';
import { PnLChart } from './PnLChart';
import { Asset, OpenPositionRequest, PositionType } from '../types';
import { usePosition } from '../hooks/usePosition';
import { useQuoter } from '../hooks/useQuoter';
import { useUserPositionsSummary } from '../hooks/useFactory';
import { CONTRACTS, DEFAULT_SLIPPAGE_BPS, MAX_SLIPPAGE_BPS, IS_FACTORY_CONFIGURED, POOL_FEES, POOL_FEE_LABELS, type PoolFeeValue } from '../lib/constants';
import { formatLeverageNumber, usdcToNumber, wethToNumber, formatWeth, formatUsdc, toUnits } from '../lib/utils/formatters';
import { estimateOpenFeeBps, AGENT_MIN_CAPITAL_USD } from '../lib/utils/fees';
import { useWeb3 } from '../contexts/Web3Context';
import { PredictedHFCard } from "./hf/PredictedHFCard";
import { HFBar } from "./hf/HFBar";
import { RiskBadge } from "./hf/RiskBadge";
import { RiskLevelValue } from "../lib/constants";
import { predictOpenHF, classifyHF, maxSafeLeverage, AAVE_LIQ_THRESHOLD, calcLiquidationPrice, liqPriceDistance, calcBreakEvenPrice, hfColor } from "../lib/utils/hfCalculations";
import { chainlinkToUsd } from "../lib/utils/formatters";
import { useReadContract, useGasPrice } from 'wagmi';
import { CHAINLINK_ABI } from '../lib/constants';
import { HFAlertBanner } from './hf/HFAlertBanner';


interface TradingFormProps {
  assets: Asset[];
  wallet: { eth: number; weth: number; usdc: number };
  onOpenPosition: (params: OpenPositionRequest) => void;
  isConnected: boolean;
}


import { InfoTooltip } from './ui/InfoTooltip';

// ETH kept back for gas when a short is funded by wrapping native ETH.
const GAS_RESERVE_ETH = 0.01;
// How often an unchanged swap quote is refreshed, so the slippage floor tracks the market.
const QUOTE_REFRESH_MS = 15_000;

export const TradingForm: React.FC<TradingFormProps> = ({ 
  assets, wallet, onOpenPosition, isConnected 
}) => {
  
  const { data: gasPrice } = useGasPrice({ query: { refetchInterval: 12000 } });
const { data: clData } = useReadContract({
    address: CONTRACTS.CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: "latestRoundData",
    query: { refetchInterval: 60_000, staleTime: 30_000 }
  });
  const chainlinkAnswer = (clData as any)?.[1] ?? 0n;
  const [hfUnderstood, setHfUnderstood] = useState(false);

  const { address, userProxies, selectedProxyIndex, setSelectedProxyIndex, deployAndSelectProxy, factory, isDemoMode, contractService } = useWeb3();
  const selectedProxy = userProxies[selectedProxyIndex];
  
  const position = usePosition(selectedProxy);
  const { getMaxFlashLoan } = position;
  const { getQuoteWithSlippage } = useQuoter();

  const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[0]);
  const [positionType, setPositionType] = useState<PositionType>('LONG');
  const [amount, setAmount] = useState<number>(0);
  const [leverage, setLeverage] = useState<number>(2);
  const [showFeeDetails, setShowFeeDetails] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [slippageBps, setSlippageBps] = useState<number>(DEFAULT_SLIPPAGE_BPS);
  const [poolFee, setPoolFee] = useState<PoolFeeValue>(POOL_FEES.LOW); // 500

  // Max Leverage Bounds
  const [maxLev, setMaxLev] = useState<number>(4);
  const [safeLev, setSafeLev] = useState<number>(3);
  const [expectedSwap, setExpectedSwap] = useState<bigint>(0n);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [quoteTick, setQuoteTick] = useState(0);

  useEffect(() => {
    setAmount(0);
  }, [positionType]);

  const isLong = positionType === 'LONG';
  const collateralSymbol = isLong ? 'USDC' : 'WETH';
  // Shorts are funded in WETH. Native ETH counts too: the open flow wraps any shortfall.
  const availableBalance = isLong ? wallet.usdc : wallet.weth + Math.max(wallet.eth - GAS_RESERVE_ETH, 0);
  const executionPrice = assets.find(a => a.symbol === selectedAsset.symbol)?.price ?? 0;

  const ethPrice = chainlinkAnswer ? chainlinkToUsd(chainlinkAnswer) : executionPrice;
  const priceReady = ethPrice > 0;
  const predictedHF = predictOpenHF(leverage, isLong);
  const hfClass = classifyHF(predictedHF);
  const maxSafeLev = maxSafeLeverage(isLong);
  const isHFBlocked = hfClass === "BLOCKED";
  
  const sliderAbsoluteMax = maxLev || 4;
  const sliderMax = Math.min(sliderAbsoluteMax, maxSafeLev);
  const sliderMin = 1.1;
  const getLevPct = (lev: number) => ((lev - sliderMin) / (sliderMax - sliderMin)) * 100;
  
  const lt = isLong ? AAVE_LIQ_THRESHOLD.WETH : AAVE_LIQ_THRESHOLD.USDC;
  const levCrit = maxSafeLev;
  const levWarn = 1.5 / (1.5 - lt);
  const levSafe = 2.0 / (2.0 - lt);

  const displayAssetSymbol = selectedAsset.symbol;

  // Capital is paid in the token that gets flash-borrowed: USDC for a long, WETH for a short.
  // These base-unit amounts are what gets quoted AND what gets sent, so the two cannot drift.
  const capitalToken = isLong ? CONTRACTS.USDC : CONTRACTS.WETH;
  const supplyToken  = isLong ? CONTRACTS.WETH : CONTRACTS.USDC;
  const capitalBN    = toUnits(amount, isLong ? 6 : 18);
  const leverageX100 = BigInt(Math.round(leverage * 100));
  const borrowBN     = leverageX100 > 100n ? (capitalBN * (leverageX100 - 100n)) / 100n : 0n;

  // Open-fee estimate. Accounts with a keeper pay the Agent tier; a brand-new account
  // inherits the factory's protocol agent as its keeper. The contract's
  // getRequiredApproval() has the final say when the transaction is built.
  const agentMode   = selectedProxy ? position.isAgentManaged : factory.hasProtocolAgent;
  const capitalUsd  = isLong ? amount : amount * ethPrice;
  const openFeeBps  = estimateOpenFeeBps(agentMode, capitalUsd, position.standardOpenFeeBps);
  const belowAgentMinimum = agentMode && amount > 0 && priceReady && openFeeBps === null;
  const feeBN       = (capitalBN * BigInt(openFeeBps ?? 0)) / 10_000n;
  const approvalReq = { amount: capitalBN + feeBN, fee: feeBN };

  // Leverage bounds for the selected account, capital and direction
  useEffect(() => {
    if (!selectedProxy || capitalBN === 0n) {
      setMaxLev(4);
      setSafeLev(3);
      return;
    }
    
    let cancelled = false;
    const fetchBounds = async () => {
      try {
        const bounds = await getMaxFlashLoan(supplyToken, capitalBN);
        if (cancelled) return;
        const safe = formatLeverageNumber(bounds.safeLeverage);
        const max = formatLeverageNumber(bounds.maxLeverage);
        setSafeLev(safe);
        setMaxLev(max);
        setLeverage(current => (current > max ? max : current));
      } catch (e) {
        console.error("Bounds error", e);
      }
    };
    fetchBounds();
    return () => { cancelled = true; };
  }, [capitalBN, supplyToken, selectedProxy, getMaxFlashLoan]);

  // Drop the old quote as soon as an input changes, so a stale one can never be submitted.
  useEffect(() => {
    setExpectedSwap(0n);
    setQuoteFailed(false);
  }, [capitalBN, borrowBN, capitalToken, poolFee, slippageBps]);

  useEffect(() => {
    const timer = setInterval(() => setQuoteTick(t => t + 1), QUOTE_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // Quote estimation
  useEffect(() => {
    if (capitalBN === 0n || isDemoMode) return;
    let cancelled = false;
    const fetchQuote = async () => {
      const quote = await getQuoteWithSlippage({
        tokenIn: capitalToken,
        tokenOut: supplyToken,
        amountIn: capitalBN + borrowBN,
        fee: poolFee
      }, slippageBps);
      if (cancelled) return;
      setExpectedSwap(quote);
      setQuoteFailed(quote === 0n);
    };
    const timer = setTimeout(fetchQuote, 500); // debounce
    return () => { cancelled = true; clearTimeout(timer); };
  }, [capitalBN, borrowBN, capitalToken, supplyToken, poolFee, slippageBps, isDemoMode, getQuoteWithSlippage, quoteTick]);

  const quoteReady = isDemoMode || expectedSwap > 0n;

  const totalPositionSize = amount * leverage; 
  const borrowedAmount = totalPositionSize - amount; 
  
  const protocolFeeNum = isLong ? usdcToNumber(approvalReq.fee) : wethToNumber(approvalReq.fee);
  const flashLoanFee = 0; // Balancer V2 is free
  const estGasFeeNative = React.useMemo(() => {
    // Standard gas limit for Surge atomic open (Flash loan + Swap + Supply + Borrow)
    const ATOMIC_TX_GAS_LIMIT = 550_000n;
    if (!gasPrice) return isLong ? 15 : (ethPrice > 0 ? 15 / ethPrice : 0); // Fallback if loading
    
    const ethCost = Number(gasPrice * ATOMIC_TX_GAS_LIMIT) / 1e18;
    return isLong ? ethCost * ethPrice : ethCost;
  }, [gasPrice, isLong, ethPrice]);
  const swapFeeNum = totalPositionSize * (poolFee / 1000000); // poolFee is e.g. 500 for 0.05%
  
  const totalFeesNative = flashLoanFee + protocolFeeNum + estGasFeeNative + swapFeeNum;
  
  const liqPrice = calcLiquidationPrice(ethPrice, predictedHF, isLong);

  const breakevenDeltaPct = 0.025 / leverage;

  let estRiskLabel = "SAFE";
  let estRiskColor = "text-emerald-400";
  let estRiskBg = "bg-emerald-500/20";
  if (leverage >= maxLev - 0.1) {
    estRiskLabel = "CRITICAL";
    estRiskColor = "text-rose-500";
    estRiskBg = "bg-rose-500/20";
  } else if (leverage > safeLev) {
    estRiskLabel = "WARNING";
    estRiskColor = "text-amber-400";
    estRiskBg = "bg-amber-400/20";
  }
  const breakEvenPrice = isLong
    ? executionPrice * (1 + breakevenDeltaPct)
    : executionPrice * (1 - breakevenDeltaPct);

  // The wallet has to cover the capital plus the open fee charged on top of it.
  const insufficientBalance = amount * (1 + (openFeeBps ?? 0) / 10_000) > availableBalance;

  // First reason the form cannot be submitted right now; shown on the button.
  const submitBlock =
      !isConnected                                          ? 'CONNECT WALLET TO TRADE'
    : !isDemoMode && !IS_FACTORY_CONFIGURED                 ? 'CONTRACTS NOT CONFIGURED'
    : !isDemoMode && factory.factoryPaused                  ? 'PROTOCOL PAUSED'
    : !isDemoMode && !!selectedProxy && position.status === 1 ? 'ACCOUNT ALREADY HAS AN OPEN POSITION'
    : belowAgentMinimum                                     ? `MINIMUM $${AGENT_MIN_CAPITAL_USD} CAPITAL`
    : insufficientBalance                                   ? 'INSUFFICIENT BALANCE'
    : !priceReady                                           ? 'WAITING FOR ETH PRICE'
    : amount > 0 && !quoteReady                             ? (quoteFailed ? 'NO SWAP QUOTE AVAILABLE' : 'FETCHING QUOTE...')
    : null;

  const handleSubmit = async () => {
    onOpenPosition({
      asset: selectedAsset,
      type: positionType,
      amount,
      leverage,
      liquidationPrice: liqPrice,
      poolFee,
      capital: capitalBN,
      borrowAmount: borrowBN,
      expectedSwapAmount: expectedSwap,
    });
  };

  const { summaries: liveSummaries } = useUserPositionsSummary(isDemoMode ? undefined : address);
  const summaries = isDemoMode ? contractService.getMockUserPositionsSummary() : liveSummaries;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-6">
        
        {/* MULTI-PROXY TAB STRIP */}
        {isConnected && userProxies.length > 0 && (
          <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
            {summaries.map((summary, idx) => (
              <button
                key={summary.proxyAddress}
                onClick={() => setSelectedProxyIndex(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-bold border-2 border-b-0 transition-all ${
                  selectedProxyIndex === idx 
                    ? 'bg-white border-black text-black pt-3 -mb-1 z-10 relative' 
                    : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${summary.status === 1 ? 'bg-green-500' : summary.status === 2 ? 'bg-blue-500' : 'bg-gray-400'}`} />
                {summary.labelString || `Pos #${summary.positionIndex}`}
              </button>
            ))}
            <button
              onClick={() => deployAndSelectProxy()}
              className="flex items-center gap-1 px-4 py-2 rounded-t-lg font-bold border-2 border-b-0 border-gray-300 bg-gray-50 text-gray-500 hover:text-black hover:border-black transition-all"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        )}

        <Card title="Open Position" className={`h-full ${isConnected && userProxies.length > 0 ? 'rounded-tl-none border-t-0' : ''}`}>
          {/* Position Type Toggle */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setPositionType('LONG')}
              className={`flex items-center justify-center gap-2 py-4 rounded-lg font-black border-2 transition-all shadow-neo-sm ${
                positionType === 'LONG' 
                  ? 'bg-emerald-400 text-black border-black' 
                  : 'bg-white text-gray-500 border-gray-300 hover:border-black hover:text-black'
              }`}
            >
              <TrendingUp className="w-5 h-5" /> LONG
            </button>
            <button
              onClick={() => setPositionType('SHORT')}
              className={`flex items-center justify-center gap-2 py-4 rounded-lg font-black border-2 transition-all shadow-neo-sm ${
                positionType === 'SHORT' 
                  ? 'bg-rose-400 text-black border-black' 
                  : 'bg-white text-gray-500 border-gray-300 hover:border-black hover:text-black'
              }`}
            >
              <TrendingDown className="w-5 h-5" /> SHORT
            </button>
          </div>

          {/* Asset Selection */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
               <label className="block text-sm font-bold text-black uppercase">Target Asset</label>
               <div className="text-xs font-bold text-gray-500">
                  Current Price: <span className="text-black font-mono">{priceReady ? `$${ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</span>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className={`flex items-center gap-2 p-3 rounded-lg border-2 border-black bg-blue-50 text-black shadow-neo-sm cursor-default`}>
                <img src={selectedAsset.iconUrl} alt={selectedAsset.symbol} className="w-6 h-6 rounded-full border border-black" />
                <span className="font-bold">{displayAssetSymbol}</span>
                <span className="ml-auto text-xs font-bold bg-white px-2 py-1 rounded border border-black text-gray-600">
                  {isLong ? 'Long w/ USDC' : 'Short w/ WETH'}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-black uppercase">Collateral ({collateralSymbol})</label>
              <span className="text-xs font-bold text-gray-500 cursor-pointer hover:text-black" onClick={() => setAmount(availableBalance * 0.98)}>
                Bal: {availableBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-white border-2 border-black rounded-lg px-4 py-4 text-lg font-bold text-black focus:ring-4 focus:ring-accent/50 outline-none transition-all shadow-sm placeholder:text-gray-300"
                placeholder="0.00"
              />
            </div>
            {!isLong && (
              <div className="mt-2 text-xs font-bold text-gray-500">
                Shorts are funded in WETH. Any shortfall is wrapped from your ETH automatically.
              </div>
            )}
          </div>

          {/* Leverage Slider */}
          <div className="mb-8 p-4 bg-gray-50 border-2 border-black rounded-xl relative">
            <div className="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>Leverage</span>
              <span className={leverage > maxSafeLev ? "text-rose-500" : "text-emerald-500"}>Max Safe: {maxSafeLev.toFixed(2)}x</span>
            </div>
            
            <div className="relative pt-2 pb-8">
              <Slider
                label="Leverage Factor"
                min={sliderMin}
                max={sliderMax}
                step={0.01}
                value={leverage}
                onChange={setLeverage}
                formatValue={(val) => `${val.toFixed(2)}x`}
              />
              
              <div className="absolute w-full mt-2 h-4 text-[10px] font-bold">
                 {levCrit >= sliderMin && levCrit <= sliderMax && (
                   <div className="absolute flex flex-col items-end text-red-600" style={{ right: 0 }}>
                     <div className="w-px h-1.5 bg-red-600 mb-0.5 mr-[14px]"></div>
                     ⛔ Max
                   </div>
                 )}
                 {levWarn >= sliderMin && levWarn <= sliderMax && (
                   <div className="absolute flex flex-col items-center text-amber-500" style={{ left: `${getLevPct(levWarn)}%`, transform: 'translateX(-50%)' }}>
                     <div className="w-px h-1.5 bg-amber-500 mb-0.5"></div>
                     ⚠ Warn
                   </div>
                 )}
                 {levSafe >= sliderMin && levSafe <= sliderMax && (
                   <div className="absolute flex flex-col items-center text-emerald-500" style={{ left: `${getLevPct(levSafe)}%`, transform: 'translateX(-50%)' }}>
                     <div className="w-px h-1.5 bg-emerald-500 mb-0.5"></div>
                     ✓ Safe
                   </div>
                 )}
              </div>
            </div>
          </div>

          {leverage > 1 && (
            <div className="mb-8">
               <PredictedHFCard leverage={leverage} isLong={isLong} currentEthPrice={ethPrice} openFeeBps={200} />
            </div>
          )}

          {/* Advanced Settings */}
          <div className="mb-6">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm font-black text-black uppercase flex items-center gap-1 mb-3 transition-colors hover:text-gray-700"
            >
              <CircleDot className="w-3 h-3" /> Advanced Settings {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showAdvanced && (
              <div className="p-4 bg-white border-2 border-black rounded-lg space-y-4 shadow-neo-sm animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center">Max Slippage Tolerance <InfoTooltip text="Your transaction will revert if the price changes unfavourably by more than this percentage." /></label>
                  <div className="relative">
                    <input type="number" step="0.1" value={slippageBps / 100} max={MAX_SLIPPAGE_BPS / 100} min="0.01" onChange={e => setSlippageBps(Math.min(Math.max(Math.round((Number(e.target.value) || 0) * 100), 1), MAX_SLIPPAGE_BPS))} className="w-full border-2 border-gray-300 rounded p-2 text-sm font-mono focus:border-black outline-none" />
                    <span className="absolute right-3 top-2 text-gray-500 font-bold">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center">Uniswap V3 Pool Fee Tier <InfoTooltip text="Select the fee tier of the liquidity pool to route the flash loan swap through. 0.05% is highly recommended for USDC/WETH." /></label>
                  <select value={poolFee} onChange={e => setPoolFee(Number(e.target.value) as PoolFeeValue)} className="w-full border-2 border-gray-300 rounded p-2 text-sm font-bold focus:border-black outline-none bg-white">
                    <option value="100">0.01% Fee Tier</option>
                    <option value="500">0.05% Fee Tier (Recommended)</option>
                    <option value="3000">0.30% Fee Tier</option>
                    <option value="10000">1.00% Fee Tier</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="bg-black text-white rounded-xl p-5 mb-6 space-y-3 border-2 border-black shadow-neo">
            <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-800">
              <span className="text-gray-400 font-bold uppercase flex items-center">Estimated Risk <InfoTooltip text="Combined risk profile factoring in your leverage and market volatility." /></span>
              <div className={`flex items-center gap-2 px-2 py-0.5 rounded border border-gray-700 ${estRiskBg}`}>
                <div className={`w-2 h-2 rounded-full bg-current ${estRiskColor} ${estRiskLabel === 'CRITICAL' ? 'animate-pulse' : ''}`} />
                <span className={`font-black text-xs tracking-wider ${estRiskColor}`}>{estRiskLabel}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 flex items-center">Total Position Size <InfoTooltip text="Your initial capital multiplied by the leverage factor." /></span>
              <span className="font-mono font-bold text-accent">
                {totalPositionSize.toLocaleString(undefined, { maximumFractionDigits: 4 })} {collateralSymbol}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 flex items-center">Est. Liquidation Price <InfoTooltip text="If the asset price reaches this point, Aave will liquidate your collateral." /></span>
              <span className="font-mono font-bold text-rose-400">
                ${liqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Fees Breakdown Toggle */}
            <div className="relative">
              <button 
                onClick={() => setShowFeeDetails(!showFeeDetails)}
                className="w-full flex justify-between items-center text-sm group focus:outline-none"
              >
                <span className="text-gray-400 flex items-center gap-2 group-hover:text-white transition-colors border-b border-dashed border-gray-600 group-hover:border-white">
                  Fees (Est.) <InfoTooltip text="Detailed breakdown of all protocols fees involved in atomic routing." />
                  {showFeeDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </span>
                <span className="font-mono">~{totalFeesNative.toFixed(4)} {collateralSymbol}</span>
              </button>

              {showFeeDetails && (
                <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-gray-700 space-y-2 text-xs animate-in fade-in slide-in-from-top-1">
                  <div className="flex justify-between text-gray-400 mb-2">
                     <span className="flex items-center gap-1">Flash Loan Fee <InfoTooltip text="Flashloan Fee is free in V1. From V2, a flash fee will be charged at 0.5% of the total flashloan amount." /></span>
                     <span className="font-mono text-emerald-400 font-bold">Free <span className="text-[10px]">(V1 Offer)</span></span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                     <span className="flex items-center gap-1">Network Gas Fee (Est.) <InfoTooltip text="Estimated Ethereum network fee to execute the multi-step atomic transaction (Flash loan, swap, Aave deposit & borrow)." /></span>
                     <span className="font-mono text-white">{estGasFeeNative.toFixed(4)} {collateralSymbol}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                     <span className="flex items-center gap-1">Protocol Fee {((openFeeBps ?? 0) / 100).toFixed(2).replace(/\.?0+$/, '')}%{agentMode ? ' · Agent' : ''} (Initial Capital) <InfoTooltip text="Surge charges its origination fee purely on your initial deposited capital, NOT on your total leveraged size. Agent-managed accounts pay a capital-based tier instead of the standard rate." /></span>
                     <span className="font-mono text-white">{protocolFeeNum.toFixed(4)} {collateralSymbol}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                     <span className="flex items-center gap-1">Uniswap Fee <span className="text-gray-600">({(poolFee / 10000).toFixed(2)}%)</span></span>
                     <span className="font-mono text-white">{swapFeeNum.toFixed(4)} {collateralSymbol}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 border-t border-gray-800 pt-2 mt-2">
                     <span className="text-accent">Required Approval</span>
                     <span className="font-mono text-white">
                       {isLong ? formatUsdc(approvalReq.amount) : formatWeth(approvalReq.amount)}
                     </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isHFBlocked ? (
            <div className="space-y-2">
              <Button disabled className="w-full py-4 text-lg border-red-500 border-2 bg-gray-100 text-red-500" variant="danger">
                ⛔ Leverage too high — HF would be {predictedHF.toFixed(3)}
              </Button>
              <div className="text-center text-xs text-red-500 font-bold">
                Reduce leverage to max {maxSafeLev.toFixed(2)}× for this direction
              </div>
            </div>
          ) : hfClass === "CRITICAL" ? (
            <div className="space-y-4">
              <HFAlertBanner riskLevel={2} hf={BigInt(Math.floor(predictedHF * 1e18))} />
              <label className="flex items-center gap-2 text-sm font-bold bg-orange-50 p-3 border-2 border-orange-400 rounded cursor-pointer text-black">
                <input type="checkbox" checked={hfUnderstood} onChange={e => setHfUnderstood(e.target.checked)} className="w-5 h-5 accent-orange-500" />
                I understand my HF will be {predictedHF.toFixed(3)}
              </label>
              <Button 
                onClick={handleSubmit} 
                className="w-full py-4 text-lg border-orange-500"
                disabled={!!submitBlock || amount <= 0 || !hfUnderstood}
                variant="danger"
              >
                <AlertTriangle className="w-5 h-5 inline mr-2" />
                {submitBlock ?? 'Open Position (High Risk ⚡)'}
              </Button>
            </div>
          ) : hfClass === "WARNING" ? (
            <div className="space-y-2">
              <div className="text-sm font-bold text-amber-500">
                ⚠ Moderate risk. Consider lower leverage for more safety buffer.
              </div>
              <Button 
                onClick={handleSubmit} 
                className="w-full py-4 text-lg border-amber-500"
                disabled={!!submitBlock || amount <= 0}
                variant="warning"
              >
                {submitBlock ?? `OPEN ${positionType} POSITION`}
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleSubmit} 
              className="w-full py-4 text-lg"
              disabled={!!submitBlock || amount <= 0}
              variant={isLong ? 'success' : 'danger'}
            >
              {submitBlock ?? `OPEN ${positionType} POSITION`}
            </Button>
          )}
        </Card>
      </div>

            {/* Right Column: Visualization */}
      <div className="lg:col-span-5 space-y-6">
        {!priceReady && (
          <Card title="Waiting for ETH price">
            <div className="text-center py-8 text-gray-500 font-bold animate-pulse">
              Loading the live ETH/USD price. Simulations appear once it arrives.
            </div>
          </Card>
        )}
        {priceReady && (<>
        <Card title={<span className="flex items-center gap-2">PnL Simulation <InfoTooltip text="Simulated Profit & Loss across different price targets based on your current settings." /></span>} className="flex flex-col border-4">
          <div className="flex-grow min-h-[250px] flex flex-col justify-center">
             <div className="relative mb-2 h-64 w-full">
               <PnLChart
                  entryPrice={ethPrice}
                  leverage={leverage}
                  positionType={positionType}
                  liquidationPrice={liqPrice}
               />
             </div>
          </div>
        </Card>

        {/* 1. Price Stress Test Matrix (HERO) */}
        <Card title={<span className="flex items-center gap-2">Price Stress Test <InfoTooltip text="Dynamic matrix simulating your Health Factor and PnL against significant immediate market swings." /></span>} className="bg-[#ffe500] border-4 border-black shadow-[6px_6px_0px_0px_#000]">
          <div className="overflow-x-auto border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] bg-black text-white">
            <table className="w-full text-center font-mono text-sm border-collapse">
              <thead className="bg-[#111] text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 border-r-2 border-b-2 border-gray-800 w-1/4">ETH Price</th>
                  <th className="py-3 border-r-2 border-b-2 border-gray-800 w-1/4">Est. PnL</th>
                  <th className="py-3 border-r-2 border-b-2 border-gray-800 w-1/4">Est. HF</th>
                  <th className="py-3 border-b-2 border-gray-800 w-1/4">Risk State</th>
                </tr>
              </thead>
              <tbody>
                {[0.20, 0.10, 0, -0.10, -0.20].map((change, i) => {
                  const newPrice = ethPrice * (1 + change);
                  let pnlUsd = 0;
                  let newHf = 0;
                  
                  if (isLong) {
                    const wethAmt = (amount * leverage) / ethPrice;
                    const valueUsd = wethAmt * newPrice;
                    const debtUsd = amount * (leverage - 1);
                    pnlUsd = valueUsd - debtUsd - amount;
                    newHf = debtUsd > 0 ? (valueUsd * AAVE_LIQ_THRESHOLD.WETH) / debtUsd : 99;
                  } else {
                    const usdcAmt = (amount * leverage) * ethPrice;
                    const debtWeth = amount * (leverage - 1);
                    const debtUsd = debtWeth * newPrice;
                    pnlUsd = usdcAmt - debtUsd - (amount * ethPrice);
                    newHf = debtUsd > 0 ? (usdcAmt * AAVE_LIQ_THRESHOLD.USDC) / debtUsd : 99;
                  }

                  const rowHfClass = classifyHF(newHf);
                  const isCurrent = change === 0;
                  
                  const riskLevelMap: Record<string, RiskLevelValue> = {
                    SAFE: 0, WARNING: 1, CRITICAL: 2, LIQUIDATABLE: 3, BLOCKED: 3
                  };
                  const rLevel = riskLevelMap[rowHfClass] ?? 0;

                  return (
                    <tr key={i} className={`border-b-2 border-gray-800 transition-colors ${isCurrent ? 'bg-gray-900 shadow-[inset_4px_0_0_#ffe500,inset_-4px_0_0_#ffe500]' : 'hover:bg-gray-800'}`}>
                      <td className="py-3 border-r-2 border-gray-800 font-black flex flex-col items-center justify-center relative">
                        {isCurrent && <div className="absolute top-0 left-0 w-full text-[8px] bg-[#ffe500] text-black py-0.5 leading-none tracking-widest uppercase">Current</div>}
                        <div className={isCurrent ? "mt-3" : ""}>${newPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                        {!isCurrent && (
                           <div className={`text-[10px] px-1.5 rounded-sm border border-black mt-1 inline-block ${change > 0 ? 'bg-emerald-400 text-black' : 'bg-rose-400 text-black'}`}>
                             {change > 0 ? '+' : ''}{(change * 100).toFixed(0)}%
                           </div>
                        )}
                      </td>
                      <td className="py-3 border-r-2 border-gray-800 align-middle">
                        <div className={`inline-flex items-center justify-center px-2 py-1 rounded border-2 border-black font-black text-xs ${pnlUsd > 0 ? 'bg-emerald-400 text-black shadow-[2px_2px_0_0_#000]' : pnlUsd < 0 ? 'bg-rose-400 text-black shadow-[2px_2px_0_0_#000]' : 'bg-gray-700 text-white'}`}>
                          {pnlUsd > 0 ? '+' : ''}{pnlUsd.toLocaleString(undefined, {maximumFractionDigits: 0})} USD
                        </div>
                      </td>
                      <td className="py-3 border-r-2 border-gray-800 align-middle font-black" style={{color: hfColor(newHf)}}>
                        {newHf > 10 ? '∞' : newHf.toFixed(2)}
                      </td>
                      <td className="py-3 align-middle">
                        <RiskBadge riskLevel={rLevel} size="sm" pulse={rLevel >= 2} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        </>)}

        {/* 2. Surge Protection Layer */}
        <Card title={<span className="flex items-center gap-2">Surge Protection Layer <InfoTooltip text="Visual breakdown of how Surge Finance buffers your positions compared to raw Aave liquidation limits." /></span>} className="bg-white">
          <div className="text-sm text-gray-600 mb-4 font-medium">
            Unlike raw Aave which liquidates you immediately at HF 1.0 (with a 5% penalty), Surge introduces a protective <strong>Emergency Exit Zone</strong>.
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Raw Aave V3</div>
              <div className="h-6 w-full flex rounded border-2 border-black overflow-hidden font-mono text-[10px] font-bold text-center leading-5 text-white">
                <div className="w-[80%] bg-emerald-500 border-r-2 border-black flex items-center justify-center">Safe (HF &gt; 1.0)</div>
                <div className="w-[20%] bg-red-600 flex items-center justify-center">5% Penalty</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Surge Protocol</div>
              <div className="h-6 w-full flex rounded border-2 border-black overflow-hidden font-mono text-[10px] font-bold text-center leading-5 text-white">
                <div className="w-[60%] bg-emerald-500 border-r-2 border-black flex items-center justify-center">Safe</div>
                <div className="w-[10%] bg-amber-400 text-black border-r-2 border-black flex items-center justify-center">Warn</div>
                <div className="w-[10%] bg-orange-500 border-r-2 border-black flex items-center justify-center tooltip" title="Exit before Aave liquidates you!">Escape</div>
                <div className="w-[20%] bg-red-600 flex items-center justify-center">Aave Liq.</div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-500 mt-1 px-1">
                <span>HF &gt; 1.5</span>
                <span>1.25</span>
                <span>1.0</span>
              </div>
            </div>
          </div>
        </Card>

        

      </div>
    </div>
  );
};
