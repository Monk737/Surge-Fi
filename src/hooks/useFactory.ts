import { useMemo } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { decodeEventLog } from 'viem';
import type { Address } from 'viem';
import { waitForSuccess } from '../lib/wagmi';
import { POSITION_FACTORY_ABI } from '../lib/abis/PositionFactoryABI';
import { CONTRACTS, IS_FACTORY_CONFIGURED, POLL_INTERVAL, STALE_TIME, ZERO_ADDRESS } from '../lib/constants';
import type { PositionStatusValue } from '../lib/constants';
import { decodeLabel } from '../lib/utils/formatters';

export interface PositionSummary {
  proxyAddress: Address;
  owner: Address;
  positionIndex: bigint;
  status: PositionStatusValue;
  label: `0x${string}`;
  labelString: string;
  tier: number;
}

const readConfig = {
  address: CONTRACTS.POSITION_FACTORY,
  abi: POSITION_FACTORY_ABI,
} as const;

const queryConfig = {
  refetchInterval: POLL_INTERVAL,
  staleTime: STALE_TIME,
  enabled: IS_FACTORY_CONFIGURED,
} as const;

const NO_PROXIES: Address[] = [];
const NO_SUMMARIES: { summaries: PositionSummary[]; total: bigint } = { summaries: [], total: 0n };

// getUserPositionsSummary() caps `limit` at MAX_BATCH_SIZE (200) on-chain.
export const SUMMARY_PAGE_SIZE = 200n;

export function useUserPositions(user: Address | undefined) {
  const { data, refetch } = useReadContract({
    ...readConfig,
    functionName: "getUserPositions",
    args: user ? [user] : undefined,
    query: { ...queryConfig, enabled: IS_FACTORY_CONFIGURED && !!user },
  });
  const positions = useMemo(() => (data ? [...data] : NO_PROXIES), [data]);
  return { positions, refetch };
}

export function useUserPositionsSummary(user: Address | undefined, offset = 0n, limit = SUMMARY_PAGE_SIZE) {
  const { data } = useReadContract({
    ...readConfig,
    functionName: "getUserPositionsSummary",
    args: user ? [user, offset, limit] : undefined,
    query: { ...queryConfig, enabled: IS_FACTORY_CONFIGURED && !!user },
  });
  return useMemo(() => {
    if (!data) return NO_SUMMARIES;
    const summaries: PositionSummary[] = data[0].map(s => ({
      proxyAddress: s.proxyAddress,
      owner: s.owner,
      positionIndex: s.positionIndex,
      status: s.status as PositionStatusValue,
      label: s.label,
      labelString: decodeLabel(s.label),
      tier: s.tier,
    }));
    return { summaries, total: data[1] };
  }, [data]);
}

export function useFactory() {
  const { data: platformFeeRecipient } = useReadContract({
    ...readConfig,
    functionName: "platformFeeRecipient",
    query: queryConfig,
  });

  const { data: pendingFeeRecipient } = useReadContract({
    ...readConfig,
    functionName: "pendingFeeRecipient",
    query: queryConfig,
  });

  const { data: maxPositionsPerUser = 0n } = useReadContract({
    ...readConfig,
    functionName: "maxPositionsPerUser",
    query: queryConfig,
  });

  const { data: factoryPaused = false } = useReadContract({
    ...readConfig,
    functionName: "paused",
    query: queryConfig,
  });

  // When set, every newly deployed proxy gets this keeper and must open in Agent fee mode.
  const { data: protocolAgent = ZERO_ADDRESS } = useReadContract({
    ...readConfig,
    functionName: "protocolAgent",
    query: queryConfig,
  });

  const { writeContractAsync } = useWriteContract();

  const deployPosition = async (): Promise<Address> => {
    if (!IS_FACTORY_CONFIGURED) throw new Error("Factory address is not configured.");
    const hash = await writeContractAsync({
      ...readConfig,
      functionName: "deployPosition",
      args: [],
    });
    const receipt = await waitForSuccess(hash);

    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: POSITION_FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'PositionDeployed') {
          return decoded.args.positionProxy;
        }
      } catch (e) {
        // Not the event we are looking for
      }
    }
    throw new Error("Proxy address not found in logs");
  };

  const proposeFeeRecipient = async (proposed: Address) => {
    const hash = await writeContractAsync({
      ...readConfig,
      functionName: "proposeFeeRecipient",
      args: [proposed],
    });
    await waitForSuccess(hash);
  };

  const acceptFeeRecipient = async () => {
    const hash = await writeContractAsync({
      ...readConfig,
      functionName: "acceptFeeRecipient",
      args: [],
    });
    await waitForSuccess(hash);
  };

  const setMaxPositionsPerUser = async (newMax: bigint) => {
    const hash = await writeContractAsync({
      ...readConfig,
      functionName: "setMaxPositionsPerUser",
      args: [newMax],
    });
    await waitForSuccess(hash);
  };

  return {
    platformFeeRecipient,
    pendingFeeRecipient,
    maxPositionsPerUser,
    factoryPaused,
    protocolAgent,
    hasProtocolAgent: protocolAgent !== ZERO_ADDRESS,
    deployPosition,
    proposeFeeRecipient,
    acceptFeeRecipient,
    setMaxPositionsPerUser,
  };
}
