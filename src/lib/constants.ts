import { isAddress } from 'viem';

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

const factoryEnv = process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "";

// ─── Contract Addresses (Ethereum Mainnet) ─────────────────────────────────────
export const CONTRACTS = {
  POSITION_FACTORY:  (isAddress(factoryEnv, { strict: false }) ? factoryEnv : ZERO_ADDRESS) as `0x${string}`,
  WETH:              "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`,
  USDC:              "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`,
  AAVE_POOL:         "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" as `0x${string}`,
  UNISWAP_ROUTER:    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
  UNISWAP_QUOTER_V2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
  CHAINLINK_ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as `0x${string}`,
  BALANCER_VAULT:    "0xBA12222222228d8Ba445958a75a0704d566BF2C8" as `0x${string}`,
} as const;

// False until NEXT_PUBLIC_FACTORY_ADDRESS points at a deployed PositionFactory.
// Factory reads are skipped while this is false instead of polling the zero address.
export const IS_FACTORY_CONFIGURED = CONTRACTS.POSITION_FACTORY !== ZERO_ADDRESS;

// Block the factory was deployed at — the starting point for every getLogs scan
// (trade history, leaderboard, PnL). Left at 0 those scans cover the whole chain,
// which most RPC providers reject or time out on.
// Find it: etherscan.io → factory address → first transaction → block number.
const deploymentBlockEnv = process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK ?? "";
export const DEPLOYMENT_BLOCK = /^\d+$/.test(deploymentBlockEnv) ? BigInt(deploymentBlockEnv) : 0n;

export const CHAIN_ID       = 1;
export const POLL_INTERVAL  = 12_000;  // ms ~1 Ethereum block
export const STALE_TIME     = 10_000;  // ms data considered fresh

export const SUPPORTED_ASSETS = [
  {
    symbol: 'WETH',
    name: 'Ethereum',
    price: 0,       // live price comes from Chainlink at runtime
    change24h: 0,
    iconUrl: '/eth.svg'
  }
];

// ─── Position Status (mirrors PositionStatus enum in Position.sol) ─────────────
export const POSITION_STATUS = { EMPTY: 0, ACTIVE: 1, IDLE: 2 } as const;
export type PositionStatusValue = 0 | 1 | 2;

// ─── Risk Level (mirrors RiskLevel enum in Position.sol) ───────────────────────
export const RISK_LEVEL = { SAFE: 0, WARNING: 1, CRITICAL: 2, LIQUIDATABLE: 3 } as const;
export type RiskLevelValue = 0 | 1 | 2 | 3;

// ─── Fee Mode (mirrors FeeMode enum in Position.sol) ───────────────────────────
// openPosition() reverts unless the mode matches the proxy's keeper:
// STANDARD needs keeper == address(0), AGENT needs a keeper to be set.
export const FEE_MODE = { STANDARD: 0, AGENT: 1 } as const;
export type FeeModeValue = 0 | 1;

// ─── Pool Fee Tiers (must match contract's validation set exactly) ─────────────
export const POOL_FEES  = { LOWEST: 100, LOW: 500, MEDIUM: 3000, HIGH: 10000 } as const;
export type PoolFeeValue = 100 | 500 | 3000 | 10000;
export const POOL_FEE_LABELS: Record<PoolFeeValue, string> = {
  100:   "0.01% — Ultra-stable pairs",
  500:   "0.05% — WETH/USDC (Recommended)",
  3000:  "0.30% — Standard",
  10000: "1.00% — Exotic pairs",
};

// ─── Health Factor Thresholds (1e18 scale — matches Aave V3 + contract constants) ─
export const HF = {
  CRITICAL_POINT:    950_000_000_000_000_000n,    // 0.95
  LIQUIDATION_POINT: 1_000_000_000_000_000_000n,  // 1.00
  MINIMUM_POST_OPEN: 1_250_000_000_000_000_000n,  // 1.25 — HF_MINIMUM_STANDARD (default tier)
  SAFE_ZONE:         1_500_000_000_000_000_000n,  // 1.50
} as const;

// ─── Fee Config (Standard mode defaults; the contract is the source of truth) ───
// Agent mode uses a capital-based tier table instead — see lib/utils/fees.ts.
export const FEES = {
  OPEN_BPS:    200,    // 2%  — charged ON TOP of initialCapital
  CLOSE_BPS:   500,    // 5%  — on gross profit ONLY; zero fee if no profit
  DENOMINATOR: 10_000,
} as const;

// ─── Token Decimals ────────────────────────────────────────────────────────────
export const DECIMALS = { WETH: 18, USDC: 6, ETH: 18 } as const;

// Aave returns USD values with 8 decimal places (e.g. $2,000 = 200_000_000_000)
export const AAVE_BASE_DECIMALS = 8;

// ─── Slippage ──────────────────────────────────────────────────────────────────
export const DEFAULT_SLIPPAGE_BPS = 50;   // 0.5%
export const MAX_SLIPPAGE_BPS     = 300;  // 3.0%

// ─── ABIs ──────────────────────────────────────────────────────────────────────
export const ERC20_ABI = [
  { name: "approve",   type: "function", stateMutability: "nonpayable",
    inputs:  [{ name: "spender", type: "address" }, { name: "amount",  type: "uint256" }],
    outputs: [{ type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view",
    inputs:  [{ name: "owner",  type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }] },
  { name: "decimals",  type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint8" }] },
  { name: "symbol",    type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "string" }] },
  // WETH-specific — deposit() wraps ETH into WETH in the CALLER'S own wallet
  { name: "deposit",   type: "function", stateMutability: "payable",
    inputs: [], outputs: [] },
  { name: "withdraw",  type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
] as const;

export const CHAINLINK_ABI = [
  { name: "latestRoundData", type: "function", stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId",         type: "uint80"  },
      { name: "answer",          type: "int256"  },  // USD price, 8 decimals
      { name: "startedAt",       type: "uint256" },
      { name: "updatedAt",       type: "uint256" },
      { name: "answeredInRound", type: "uint80"  },
    ] },
] as const;

export const QUOTER_V2_ABI = [
  { name: "quoteExactInputSingle", type: "function", stateMutability: "nonpayable",
    inputs: [{
      name: "params", type: "tuple",
      components: [
        { name: "tokenIn",           type: "address" },
        { name: "tokenOut",          type: "address" },
        { name: "amountIn",          type: "uint256" },
        { name: "fee",               type: "uint24"  },
        { name: "sqrtPriceLimitX96", type: "uint160" },
      ],
    }],
    outputs: [
      { name: "amountOut",               type: "uint256" },
      { name: "sqrtPriceX96After",       type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32"  },
      { name: "gasEstimate",             type: "uint256" },
    ] },
] as const;
