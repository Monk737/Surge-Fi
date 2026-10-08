import re

with open("src/services/ContractService.ts", "r") as f:
    content = f.read()

proxies = [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444",
    "0x5555555555555555555555555555555555555555",
    "0x6666666666666666666666666666666666666666",
    "0x7777777777777777777777777777777777777777",
    "0x8888888888888888888888888888888888888888",
    "0x9999999999999999999999999999999999999999",
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "0xcccccccccccccccccccccccccccccccccccccccc",
    "0xdddddddddddddddddddddddddddddddddddddddd"
]

import_lines = []
for i, p in enumerate(proxies):
    import_lines.append(f'const MOCK_PROXY_{i+1} = "{p}" as Address;')

import_block = "\n".join(import_lines)

summaries = []
for i in range(13):
    status = "1" if i % 3 == 0 else "0"
    label = f'Demo Pos #{i+1}' if status == "1" else 'Unnamed'
    label_enc = f'encodeLabel("{label}" if status == "1" else "")'
    summaries.append(f'  {{ proxyAddress: MOCK_PROXY_{i+1}, positionIndex: {i+1}n, status: {status} as PositionStatusValue,\n    label: encodeLabel("{label}" if {status} === 1 else ""), labelString: "{label}", owner: "0xMockUser" as Address }},')

summaries_block = "\n".join(summaries)


data_map = []
for i in range(13):
    status = "1" if i % 3 == 0 else "0"
    if status == "1":
        label = f'Demo Pos #{i+1}'
        hf = 1_510_000_000_000_000_000 + i * 10_000_000_000_000_000
        debt = 300_000_000_000 + i * 10_000_000_000
        collateral = debt * 15 // 10
        data_map.append(f'''  [MOCK_PROXY_{i+1}]: {{
      totalCollateralBase: {collateral}n,
      totalDebtBase:       {debt}n,
      availableBorrowsBase: 50_000_000_000n,
      currentLiquidationThreshold: 8500n,
      ltv: 8000n,
      healthFactor: {hf}n,
      riskLevel: 0,
      maxLiquidatablePercent: 0n,
      positionIndex: {i+1}n,
      status: 1,
      label: encodeLabel("{label}"),
  }},''')
    else:
        data_map.append(f'''  [MOCK_PROXY_{i+1}]: {{
      totalCollateralBase: 0n,
      totalDebtBase: 0n,
      availableBorrowsBase: 0n,
      currentLiquidationThreshold: 0n,
      ltv: 0n,
      healthFactor: 0n,
      riskLevel: 0,
      maxLiquidatablePercent: 0n,
      positionIndex: {i+1}n,
      status: 0,
      label: encodeLabel(""),
  }},''')

data_map_block = "\n".join(data_map)

# Replace the blocks using regex
content = re.sub(r'const MOCK_PROXY_1.*as Address;\n', import_block + "\n", content, flags=re.DOTALL)
# It's better to just rewrite the file from scratch up to a certain point.
