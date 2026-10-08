import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Reads the RPC endpoint from the environment, e.g.:
//   node --env-file=.env.local test-quoter.ts
const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_URL ?? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`)
});

async function main() {
  try {
    const result = await client.simulateContract({
      address: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      abi: [{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IQuoterV2.QuoteExactInputSingleParams","name":"params","type":"tuple"}],"name":"quoteExactInputSingle","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceX96After","type":"uint160"},{"internalType":"uint32","name":"initializedTicksCrossed","type":"uint32"},{"internalType":"uint256","name":"gasEstimate","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}],
      functionName: 'quoteExactInputSingle',
      args: [{
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        amountIn: 2000000n,
        fee: 500,
        sqrtPriceLimitX96: 0n,
      }],
      account: '0x0000000000000000000000000000000000000000'
    });
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
