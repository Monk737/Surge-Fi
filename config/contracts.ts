// PositionFactory ABI
export const POSITION_FACTORY_ABI = [
  "function initialize(address _beacon, address _initialOwner)",
  "function pause() external",
  "function unpause() external",
  "function setBeacon(address _newBeacon) external",
  "function deployPosition() external returns (address positionProxy)",
  "function getUserPositions(address user) external view returns (address[])",
  "function getLatestUserPosition(address user) external view returns (address)",
  "function getAllPositions() external view returns (address[])",
  "function getTotalPositions() external view returns (uint256)",
  "event PositionDeployed(address indexed user, address indexed positionProxy, uint256 timestamp)",
  "event BeaconUpdated(address indexed oldBeacon, address indexed newBeacon)"
];

// Position ABI
export const POSITION_CONTRACT_ABI = [
  "function initialize(address _owner, address _feeRecipient)",
  "function pause() external",
  "function unpause() external",
  "function openPosition(tuple(address assetToSupply, address assetToBorrow, uint256 assetToBorrowAmount, uint256 initialCapital, uint256 expectedSwapAmount) params) external",
  "function closePosition(tuple(address assetToWithdraw, address assetToRepay) params) external",
  "function supplyToAave(address assetToSupply, uint256 amount) external",
  "function withdrawFromAave(address assetToWithdraw) external",
  "function withdrawETH() external",
  "function withdrawTokens(address token, uint256 amount) external",
  "function getWETH() external payable",
  "function getHealthFactor() public view returns (uint256)",
  "function getLiquidationRisk() public view returns (uint8)",
  "function getMaxLiquidatablePercent() public view returns (uint256)",
  "function isLiquidatable() public view returns (bool)",
  "function getFullPositionData() public view returns (tuple(uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor, uint8 riskLevel, uint256 maxLiquidatablePercent))",
  "function getTokenBalance(address token) public view returns (uint256)",
  "function getDebt(address token) public view returns (uint256 debt)",
  "function paused() public view returns (bool)",
  "event ProtocolFeeCollected(address indexed token, uint256 amount, string action)",
  "event PositionOpened(address indexed owner, address assetSupplied, uint256 initialCapital, uint256 healthFactor)",
  "event PositionClosed(address indexed owner, address assetRepaid, uint256 profit)",
  "event HealthFactorWarning(uint256 indexed healthFactor, uint8 riskLevel)"
];

export const CONTRACT_ADDRESSES = {
  factoryProxy: "0x2345678901234567890123456789012345678901", // Placeholder
};

// Mock Address using a valid 40-character hex string (checksummed for safety) to ensure Ethers treats it as an address, not a name
export const POSITION_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";
export const MOCK_USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export const MOCK_WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
