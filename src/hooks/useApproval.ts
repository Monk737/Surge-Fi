import { useWriteContract } from 'wagmi';
import { readContract } from 'wagmi/actions';
import type { Address } from 'viem';
import { wagmiConfig, waitForSuccess } from '../lib/wagmi';
import { CONTRACTS, ERC20_ABI } from '../lib/constants';

export function useApproval() {
  const { writeContractAsync, isPending: isApproving } = useWriteContract();

  const checkAllowance = async (token: Address, owner: Address, spender: Address): Promise<bigint> => {
    return readContract(wagmiConfig, {
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, spender],
    });
  };

  const approveToken = async (token: Address, spender: Address, amount: bigint): Promise<void> => {
    const hash = await writeContractAsync({
      address: token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount],
    });
    await waitForSuccess(hash);
  };

  const isApproved = async (token: Address, owner: Address, spender: Address, required: bigint): Promise<boolean> => {
    const allowance = await checkAllowance(token, owner, spender);
    return allowance >= required;
  };

  const getTokenBalance = async (token: Address, owner: Address): Promise<bigint> => {
    return readContract(wagmiConfig, {
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner],
    });
  };

  // Wraps native ETH into WETH in the caller's own wallet.
  const wrapEth = async (amount: bigint): Promise<void> => {
    const hash = await writeContractAsync({
      address: CONTRACTS.WETH,
      abi: ERC20_ABI,
      functionName: "deposit",
      args: [],
      value: amount,
    });
    await waitForSuccess(hash);
  };

  return {
    checkAllowance,
    approveToken,
    isApproved,
    getTokenBalance,
    wrapEth,
    isApproving,
  };
}
