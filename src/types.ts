export type PositionType = 'LONG' | 'SHORT';

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  iconUrl: string; // Using simple colored circles or placeholders
}

export interface Position {
  id: string;
  type: PositionType;
  asset: Asset;
  collateral: number; // USD
  leverage: number; // 1x - 5x
  entryPrice: number;
  currentPrice: number;
  liquidationPrice: number;
  openDate: number;
  status: 'OPEN' | 'CLOSING' | 'CLOSED';
}

export interface TradeHistoryItem {
  id: string;
  date: number;
  type: PositionType;
  assetSymbol: string;
  leverage: number;
  collateral: number;
  pnl: number;
  status: 'CLOSED' | 'LIQUIDATED';
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: {
    eth: number;
    usdc: number;
  };
  chainId: number;
}

export interface TransactionStep {
  id: string;
  label: string;
  status: 'PENDING' | 'LOADING' | 'COMPLETE' | 'ERROR';
}

// What the trading form hands to the open-position flow. `capital` and
// `borrowAmount` are in base units of the capital token (USDC for longs, WETH for
// shorts) and are the exact amounts the swap quote was fetched for.
export interface OpenPositionRequest {
  asset: Asset;
  type: PositionType;
  amount: number;
  leverage: number;
  liquidationPrice: number;
  poolFee: number;
  capital: bigint;
  borrowAmount: bigint;
  expectedSwapAmount: bigint;
}
