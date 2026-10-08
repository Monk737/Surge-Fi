import { useState, useCallback } from 'react';
import { simulateContract } from 'wagmi/actions';
import type { Address } from 'viem';
import { wagmiConfig } from '../lib/wagmi';
import { CONTRACTS, QUOTER_V2_ABI, ZERO_ADDRESS } from '../lib/constants';
import type { PoolFeeValue } from '../lib/constants';

export interface QuoteParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  fee: PoolFeeValue;
}

export function useQuoter() {
  const [isLoading, setIsLoading] = useState(false);

  const getQuote = useCallback(async (params: QuoteParams): Promise<bigint> => {
    setIsLoading(true);
    try {
      const { result } = await simulateContract(wagmiConfig, {
        address: CONTRACTS.UNISWAP_QUOTER_V2,
        abi: QUOTER_V2_ABI,
        functionName: "quoteExactInputSingle",
        args: [{
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          fee: params.fee,
          sqrtPriceLimitX96: 0n,
        }],
        account: ZERO_ADDRESS,
      });
      return result[0] as bigint;
    } catch (error: any) {
      console.error("[useQuoter] quote failed:", error?.shortMessage ?? error?.message ?? error);
      // Return 0n instead of throwing so the app doesn't fatally crash.
      // Callers must treat 0n as "no quote" and refuse to trade on it.
      return 0n;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getQuoteWithSlippage = useCallback(async (params: QuoteParams, slippageBps: number): Promise<bigint> => {
    const quote = await getQuote(params);
    return (quote * BigInt(10_000 - slippageBps)) / 10_000n;
  }, [getQuote]);

  return {
    getQuote,
    getQuoteWithSlippage,
    isLoading,
  };
}
