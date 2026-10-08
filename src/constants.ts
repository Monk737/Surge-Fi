import { Asset, Position, TradeHistoryItem } from './types';

export const SUPPORTED_ASSETS: Asset[] = [
  {
    symbol: 'WETH',
    name: 'Ethereum',
    price: 2450.50,
    change24h: 2.5,
    iconUrl: '/eth.svg'
  }
];

export const MOCK_POSITIONS: Position[] = [
  {
    id: 'pos_1',
    type: 'LONG',
    asset: SUPPORTED_ASSETS[0], // WETH
    collateral: 5000, // USDC
    leverage: 3,
    entryPrice: 2200.00,
    currentPrice: 2450.50,
    liquidationPrice: 1550.00,
    openDate: Date.now() - 86400000 * 2,
    status: 'OPEN'
  },
  {
    id: 'pos_2',
    type: 'SHORT',
    asset: SUPPORTED_ASSETS[0], // WETH
    collateral: 2.5, // ETH
    leverage: 2,
    entryPrice: 2600.00,
    currentPrice: 2450.50,
    liquidationPrice: 3800.00,
    openDate: Date.now() - 86400000 * 5,
    status: 'OPEN'
  },
  {
    id: 'pos_4',
    type: 'SHORT',
    asset: SUPPORTED_ASSETS[0], // WETH
    collateral: 1.2, // ETH
    leverage: 1.5,
    entryPrice: 2600.00,
    currentPrice: 2450.50,
    liquidationPrice: 4300.00,
    openDate: Date.now() - 86400000 * 7,
    status: 'OPEN'
  },
  {
    id: 'pos_7',
    type: 'LONG',
    asset: SUPPORTED_ASSETS[0], // WETH
    collateral: 1500, // USDC
    leverage: 4,
    entryPrice: 2350.00,
    currentPrice: 2450.50,
    liquidationPrice: 1800.00,
    openDate: Date.now() - 3600000 * 4, // 4 hours ago
    status: 'OPEN'
  },
  {
    id: 'pos_10',
    type: 'SHORT',
    asset: SUPPORTED_ASSETS[0], // WETH
    collateral: 0.5, // ETH
    leverage: 4,
    entryPrice: 2440.00,
    currentPrice: 2450.50,
    liquidationPrice: 2900.00,
    openDate: Date.now() - 1800000, // 30 mins ago
    status: 'OPEN'
  }
];

export const MOCK_HISTORY: TradeHistoryItem[] = [
  {
    id: 'hist_1',
    date: Date.now() - 86400000 * 10,
    type: 'LONG',
    assetSymbol: 'WETH',
    leverage: 2.5,
    collateral: 1500,
    pnl: 350.20,
    status: 'CLOSED'
  }
];

export const MOCK_WALLET_BALANCE = {
  eth: 10.5,
  usdc: 25420.50
};

export const FLASH_LOAN_FEE = 0.0009; // 0.09% Balancer fee
export const PROTOCOL_OPEN_FEE_RATE = 0.02; // 2% Protocol fee on Open
export const PROTOCOL_CLOSE_FEE_RATE = 0.05; // 5% Protocol fee on Close (Profit)