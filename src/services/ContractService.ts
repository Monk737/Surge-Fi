import type { Address } from 'viem';
import { CONTRACTS } from '../lib/constants';
import { encodeLabel } from '../lib/utils/formatters';
import type { PositionStatusValue } from '../lib/constants';

export const MOCK_PROXIES = [
  "0x1111111111111111111111111111111111111111" as Address,
  "0x2222222222222222222222222222222222222222" as Address,
  "0x3333333333333333333333333333333333333333" as Address,
  "0x4444444444444444444444444444444444444444" as Address,
  "0x5555555555555555555555555555555555555555" as Address,
  "0x6666666666666666666666666666666666666666" as Address,
  "0x7777777777777777777777777777777777777777" as Address,
  "0x8888888888888888888888888888888888888888" as Address,
  "0x9999999999999999999999999999999999999999" as Address,
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address,
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Address,
  "0xcccccccccccccccccccccccccccccccccccccccc" as Address,
  "0xdddddddddddddddddddddddddddddddddddddddd" as Address,
];

export const isMockProxy = (address: Address | undefined): boolean =>
  !!address && MOCK_PROXIES.some(p => p.toLowerCase() === address.toLowerCase());

const mockSummaries = MOCK_PROXIES.map((proxy, i) => {
  const status = i % 3 === 0 ? 1 : (i % 3 === 1 ? 2 : 0);
  const label = status === 1 ? `ETH Long #${i+1}` : (status === 2 ? `ETH Short #${i+1}` : "");
  return {
    proxyAddress: proxy,
    positionIndex: BigInt(i + 1),
    status: status as PositionStatusValue,
    label: encodeLabel(label),
    labelString: label || "Unnamed",
    owner: "0xMockUser" as Address,
    tier: 0
  };
});

const mockDataMap: Record<string, any> = {};
MOCK_PROXIES.forEach((proxy, i) => {
  const status = i % 3 === 0 ? 1 : (i % 3 === 1 ? 2 : 0);
  if (status === 1 || status === 2) {
    const isLong = status === 1;
    const label = isLong ? `ETH Long #${i+1}` : `ETH Short #${i+1}`;
    const hf = BigInt(1_510_000_000_000_000_000) + BigInt(i * 10_000_000_000_000_000);
    const debt = BigInt(300_000_000_000) + BigInt(i * 10_000_000_000);
    const collateral = debt * 15n / 10n;
    
    mockDataMap[proxy] = {
      totalCollateralBase: collateral,
      totalDebtBase: debt,
      availableBorrowsBase: 50_000_000_000n,
      currentLiquidationThreshold: 8500n,
      ltv: 8000n,
      healthFactor: hf,
      riskLevel: 0,
      maxLiquidatablePercent: 0n,
      positionIndex: BigInt(i + 1),
      status: status,
      label: encodeLabel(label),
      tier: 0,
    };
  } else {
    mockDataMap[proxy] = {
      totalCollateralBase: 0n,
      totalDebtBase: 0n,
      availableBorrowsBase: 0n,
      currentLiquidationThreshold: 0n,
      ltv: 0n,
      healthFactor: 0n,
      riskLevel: 0,
      maxLiquidatablePercent: 0n,
      positionIndex: BigInt(i + 1),
      status: 0,
      label: encodeLabel(""),
      tier: 0,
    };
  }
});

const mockHistory = [
  { proxy: MOCK_PROXIES[0], assetRepaid: CONTRACTS.USDC,
    netProfit: 85_000_000n,
    blockTimestamp: Math.floor(Date.now()/1000) - 86400,
    txHash: "0xabc0000000000000000000000000000000000000000000000000000000000001" },
  { proxy: MOCK_PROXIES[1], assetRepaid: CONTRACTS.WETH,
    netProfit: 12_000_000_000_000_000n,
    blockTimestamp: Math.floor(Date.now()/1000) - 172800,
    txHash: "0xabc0000000000000000000000000000000000000000000000000000000000002" },
  { proxy: MOCK_PROXIES[2], assetRepaid: CONTRACTS.USDC,
    netProfit: 0n,
    blockTimestamp: Math.floor(Date.now()/1000) - 604800,
    txHash: "0xabc0000000000000000000000000000000000000000000000000000000000003" },
];

export class ContractService {
  getMockUserPositionsSummary() {
    return [...mockSummaries];
  }

  getMockFullPositionData(proxyAddress: Address) {
    return mockDataMap[proxyAddress] || mockDataMap[MOCK_PROXIES[2]];
  }

  getMockRequiredApproval(initialCapital: bigint) {
    const platformFee    = (initialCapital * 200n) / 10_000n;
    const approvalAmount = initialCapital + platformFee;
    return { approvalAmount, platformFee };
  }

  getMockMaxFlashLoan() {
    return {
      maxFlashLoan:  2_000_000_000n,
      safeFlashLoan: 1_500_000_000n,
      maxLeverage:   3_000_000_000_000_000_000n,
      safeLeverage:  2_500_000_000_000_000_000n,
    };
  }

  getMockDebt(token: Address): bigint {
    return token === CONTRACTS.USDC ? 1_500_000_000n : 0n;
  }

  getMockTradeHistory() {
    return [...mockHistory];
  }

  simulateDelay(): Promise<void> { 
    return new Promise(r => setTimeout(r, 2000)); 
  }

  simulateOpenPosition(proxyAddress: string, params: any): Promise<void> { 
    return this.simulateDelay().then(() => {
      const isLong = params.type === 'LONG';
      const capital = Number(params.amount) * 1e8; 
      const debt = Number(params.amount) * Number(params.leverage - 1) * 1e8;

      mockDataMap[proxyAddress] = {
        ...mockDataMap[proxyAddress],
        totalCollateralBase: BigInt(Math.floor(capital + debt)),
        totalDebtBase: BigInt(Math.floor(debt)),
        healthFactor: 1_650_000_000_000_000_000n,
        status: 1,
        label: encodeLabel(`Demo ${isLong ? 'Long' : 'Short'} ${params.leverage}x`),
        riskLevel: 0
      };

      const summary = mockSummaries.find(s => s.proxyAddress === proxyAddress);
      if (summary) {
        summary.status = 1;
        summary.label = mockDataMap[proxyAddress].label;
        summary.labelString = `Demo ${isLong ? 'Long' : 'Short'} ${params.leverage}x`;
      }
    });
  }

  simulateClosePosition(proxyAddress: string): Promise<{ netProfit: bigint }> {
    return this.simulateDelay().then(() => {
      mockDataMap[proxyAddress] = {
        ...mockDataMap[proxyAddress],
        totalCollateralBase: 0n,
        totalDebtBase: 0n,
        healthFactor: 0n,
        status: 2,
      };
      const summary = mockSummaries.find(s => s.proxyAddress === proxyAddress);
      if (summary) {
        summary.status = 2;
      }
      mockHistory.unshift({
        proxy: proxyAddress as Address,
        assetRepaid: CONTRACTS.USDC,
        netProfit: 45_000_000n,
        blockTimestamp: Math.floor(Date.now() / 1000),
        txHash: `0xmocktx${Date.now()}`
      });
      return { netProfit: 45_000_000n };
    });
  }
}

export const contractService = new ContractService();
