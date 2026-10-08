import { useMemo, useCallback } from 'react';
import { useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { readContract } from 'wagmi/actions';
import { maxUint256 } from 'viem';
import type { Address } from 'viem';
import { wagmiConfig, waitForSuccess } from '../lib/wagmi';
import { POSITION_ABI } from '../lib/abis/PositionABI';
import { POSITION_OPENED_EVENT, POSITION_REOPENED_EVENT } from '../lib/abis/events';
import { CONTRACTS, DEPLOYMENT_BLOCK, POLL_INTERVAL, STALE_TIME, CHAINLINK_ABI, FEE_MODE, FEES, ZERO_ADDRESS } from '../lib/constants';
import type { PositionStatusValue, RiskLevelValue, PoolFeeValue, FeeModeValue } from '../lib/constants';
import { decodeLabel, encodeLabel, calcNetEquity, calcTruePnl } from '../lib/utils/formatters';
import { contractService, isMockProxy } from '../services/ContractService';

export interface OpenParams {
  assetToSupply: Address;
  assetToBorrow: Address;
  assetToBorrowAmount: bigint;
  expectedSwapAmount: bigint;
  poolFee: number;
}

export interface CloseParams {
  assetToWithdraw: Address;
  assetToRepay: Address;
  minProfit: bigint;
  poolFee: number;
}

// What openPosition() needs from the proxy itself: the exact amount to approve
// (capital + open fee) and the fee mode its keeper requires. Reads the contract
// directly so it also works for a proxy deployed moments ago, before React has
// re-rendered with it.
export async function fetchOpenRequirements(proxy: Address, capitalAsset: Address, initialCapital: bigint) {
  const [[approvalAmount, platformFee], keeper] = await Promise.all([
    readContract(wagmiConfig, {
      address: proxy,
      abi: POSITION_ABI,
      functionName: "getRequiredApproval",
      args: [capitalAsset, initialCapital],
    }),
    readContract(wagmiConfig, {
      address: proxy,
      abi: POSITION_ABI,
      functionName: "keeper",
    }),
  ]);
  const feeMode: FeeModeValue = keeper === ZERO_ADDRESS ? FEE_MODE.STANDARD : FEE_MODE.AGENT;
  return { approvalAmount, platformFee, feeMode };
}

export function usePosition(proxyAddress: Address | undefined) {
  const publicClient = usePublicClient();

  const isMock = isMockProxy(proxyAddress);

  const readConfig = {
    address: proxyAddress,
    abi: POSITION_ABI,
    query: {
      refetchInterval: POLL_INTERVAL,
      staleTime: STALE_TIME,
      enabled: !!proxyAddress && !isMock,
    }
  };

  const { data: fullData } = useReadContract({
    ...readConfig,
    functionName: "getFullPositionData",
  });

  // Mock overrides
  const mockData: any = isMock && proxyAddress ? contractService.getMockFullPositionData(proxyAddress) : null;

  const activeFullData = isMock ? mockData : fullData;

  // A keeper means the proxy is agent-managed and must open in Agent fee mode.
  const { data: keeper = ZERO_ADDRESS } = useReadContract({
    ...readConfig,
    functionName: "keeper",
  });
  const isAgentManaged = keeper !== ZERO_ADDRESS;

  const { data: standardOpenFeeBps } = useReadContract({
    ...readConfig,
    functionName: "PROTOCOL_FEE_OPEN_STANDARD_BPS",
    query: { ...readConfig.query, refetchInterval: false, staleTime: Infinity },
  });

  const usdcDebtQuery = useReadContract({
    ...readConfig,
    functionName: "getDebt",
    args: [CONTRACTS.USDC],
  });
  const usdcDebt = isMock ? (mockData?.totalDebtBase || 0n) : (usdcDebtQuery.data || 0n);

  const wethDebtQuery = useReadContract({
    ...readConfig,
    functionName: "getDebt",
    args: [CONTRACTS.WETH],
  });
  const wethDebt = isMock ? (mockData?.totalDebtBase || 0n) : (wethDebtQuery.data || 0n); // simplified mock for WETH debt

  const { data: wethBalance = 0n } = useReadContract({
    ...readConfig,
    functionName: "getTokenBalance",
    args: [CONTRACTS.WETH],
  });

  const { data: usdcBalance = 0n } = useReadContract({
    ...readConfig,
    functionName: "getTokenBalance",
    args: [CONTRACTS.USDC],
  });

  const { data: isLiquidatable = false } = useReadContract({
    ...readConfig,
    functionName: "isLiquidatable",
  });

  const { data: clData } = useReadContract({
    address: CONTRACTS.CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: "latestRoundData",
    query: { refetchInterval: 60_000, staleTime: 30_000 }
  });
  const chainlinkAnswer = (clData as any)?.[1] ?? 0n;

  const healthFactor = activeFullData?.healthFactor ?? 0n;
  const riskLevel = (activeFullData?.riskLevel ?? 0) as RiskLevelValue;
  const status = (activeFullData?.status ?? 0) as PositionStatusValue;

  const { data: openEventLog } = useQuery({
    // status is part of the key so a reopened proxy picks up its new open event
    queryKey: ["positionOpenEvent", proxyAddress, status],
    queryFn: async () => {
      if (!proxyAddress || !publicClient) return null;
      if (isMock) return { args: { capitalDeposited: 1000000000n, assetSupplied: CONTRACTS.WETH } }; // mock open event
      const logs = await publicClient.getLogs({
        address: proxyAddress,
        events: [POSITION_OPENED_EVENT, POSITION_REOPENED_EVENT],
        fromBlock: DEPLOYMENT_BLOCK,
        toBlock: "latest",
      });
      return logs.at(-1) ?? null;
    },
    enabled: !!proxyAddress && (!!publicClient || isMock) && status === 1,
    staleTime: Infinity,
  });

  const positionDirection = useMemo(() => {
    if (usdcDebt > 0n) return "LONG";
    if (wethDebt > 0n) return "SHORT";
    return "NONE";
  }, [usdcDebt, wethDebt]);

  const labelString = useMemo(() => {
    return decodeLabel(activeFullData?.label ?? "0x" + "0".repeat(64));
  }, [activeFullData?.label]);

  const netEquityUsd = useMemo(() => {
    return calcNetEquity(activeFullData?.totalCollateralBase ?? 0n, activeFullData?.totalDebtBase ?? 0n);
  }, [activeFullData?.totalCollateralBase, activeFullData?.totalDebtBase]);

  const truePnlUsd = useMemo(() => {
    if (!openEventLog || !activeFullData || !chainlinkAnswer || chainlinkAnswer === 0n) return null;
    const args = openEventLog.args as any;
    const initialCapital = args.capitalDeposited as bigint;
    const assetSupplied = args.assetSupplied as Address;
    const isLong = assetSupplied?.toLowerCase() === CONTRACTS.WETH.toLowerCase();
    return calcTruePnl(netEquityUsd, initialCapital, isLong, chainlinkAnswer as bigint);
  }, [openEventLog, activeFullData, chainlinkAnswer, netEquityUsd]);

  const getMaxFlashLoan = useCallback(async (assetToSupply: Address, initialCapital: bigint) => {
    if (!proxyAddress) return { maxFlashLoan: 0n, safeFlashLoan: 0n, maxLeverage: 0n, safeLeverage: 0n };
    if (isMock) return contractService.getMockMaxFlashLoan();
    const data = await readContract(wagmiConfig, {
      address: proxyAddress,
      abi: POSITION_ABI,
      functionName: "getMaxFlashLoan",
      args: [assetToSupply, initialCapital],
    });
    return { maxFlashLoan: data[0], safeFlashLoan: data[1], maxLeverage: data[2], safeLeverage: data[3] };
  }, [proxyAddress, isMock]);

  const { writeContractAsync, isPending: isWriting } = useWriteContract();

  const executeWrite = async (functionName: string, args: any[] = [], value: bigint = 0n, target: Address | undefined = proxyAddress) => {
    if (!target) throw new Error("No proxy address");
    if (isMockProxy(target)) {
      if (functionName === 'closePosition' || functionName === 'emergencyClose') {
         await contractService.simulateClosePosition(target);
         return;
      }
      return; // mock success
    }
    const hash = await writeContractAsync({
      address: target,
      abi: POSITION_ABI,
      functionName: functionName as any,
      args: args as any,
      value: value === 0n ? undefined : (value as any),
    } as any);
    await waitForSuccess(hash);
  };

  // `target` lets the caller open on a proxy it has just deployed, before this hook has re-rendered with it.
  const openPosition = async (params: OpenParams, initialCapital: bigint, feeMode: FeeModeValue, target?: Address) =>
    executeWrite("openPosition", [params, initialCapital, feeMode], 0n, target ?? proxyAddress);
  const closePosition = async (params: CloseParams) => executeWrite("closePosition", [params]);
  // minOut is the minimum the collateral swap must return, in assetToRepay units.
  const emergencyClose = async (assetToWithdraw: Address, assetToRepay: Address, poolFee: PoolFeeValue, minOut: bigint) =>
    executeWrite("emergencyClose", [assetToWithdraw, assetToRepay, poolFee, minOut]);

  const setLabel = async (text: string) => executeWrite("setLabel", [encodeLabel(text)]);

  // supplyToAave pulls the tokens from the caller, so the proxy needs an ERC-20 allowance first.
  const supplyToAave = async (asset: Address, amount: bigint) => executeWrite("supplyToAave", [asset, amount]);
  // Omitting `amount` withdraws the full balance (Aave treats uint256.max as "everything").
  const withdrawFromAave = async (asset: Address, amount: bigint = maxUint256) => executeWrite("withdrawFromAave", [asset, amount]);
  const withdrawTokens = async (token: Address, amount: bigint) => executeWrite("withdrawTokens", [token, amount]);
  const withdrawETH = async () => executeWrite("withdrawETH");
  const getWETH = async (value: bigint) => executeWrite("getWETH", [], value);

  return {
    fullData: activeFullData, usdcDebt, wethDebt, wethBalance, usdcBalance, isLiquidatable,
    positionDirection, labelString, netEquityUsd, truePnlUsd, healthFactor, riskLevel, status,
    keeper, isAgentManaged, standardOpenFeeBps: Number(standardOpenFeeBps ?? FEES.OPEN_BPS), isMock,
    getMaxFlashLoan,
    openPosition, closePosition, emergencyClose, setLabel,
    supplyToAave, withdrawFromAave, withdrawTokens, withdrawETH, getWETH,
    isWriting,
  };
}
