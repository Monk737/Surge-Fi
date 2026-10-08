// Mirrors contracts/Postion.sol. Enums are uint8 on the wire:
//   PositionStatus { EMPTY, ACTIVE, IDLE }      PositionTier { STANDARD, CONSERVATIVE, ADVANCED }
//   FeeMode        { STANDARD, AGENT }          RiskLevel    { SAFE, WARNING, CRITICAL, LIQUIDATABLE }
export const POSITION_ABI = [
  // ─── Initializer ──────────────────────────────────────────────────────────
  {
    "name": "initialize",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "owner_",         "type": "address" },
      { "name": "feeRecipient_",  "type": "address" },
      { "name": "positionIndex_", "type": "uint256" }
    ],
    "outputs": []
  },

  // ─── Public State Variable Getters ────────────────────────────────────────
  { "name": "owner",          "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "feeRecipient",   "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "positionIndex",  "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "status",         "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint8"   }] },
  { "name": "label",          "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "bytes32" }] },
  { "name": "tier",           "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint8"   }] },
  { "name": "factory",        "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "pendingOwner",   "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "ownershipTransferUnlockTime", "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "keeper",         "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "feeMode",        "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint8"   }] },
  { "name": "agentCloseBps",  "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint16"  }] },

  // ─── Public Immutables & Constants ────────────────────────────────────────
  { "name": "WETH_ADDRESS",                    "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "VAULT",                           "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "AAVE_POOL_ADDRESS",               "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "ROUTER",                          "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "PROTOCOL_FEE_OPEN_STANDARD_BPS",  "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "PROTOCOL_FEE_CLOSE_STANDARD_BPS", "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "MAX_PROTOCOL_FEE_BPS",            "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "HF_CRITICAL_POINT",               "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "HF_LIQUIDATION_POINT",            "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "HF_MINIMUM_ADVANCED",             "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "HF_MINIMUM_STANDARD",             "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "HF_SAFE_ZONE",                    "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "HF_MINIMUM_CONSERVATIVE",         "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "LEVERAGE_1X",                     "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "OWNERSHIP_TRANSFER_TIMELOCK",     "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "FLASH_LOAN_BUFFER_BPS",           "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },

  // ─── Ownership Transfer (24h timelock) ────────────────────────────────────
  {
    "name": "proposeOwnershipTransfer",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "newOwner_", "type": "address" }],
    "outputs": []
  },
  { "name": "acceptOwnership",         "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  { "name": "cancelOwnershipTransfer", "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  {
    "name": "getOwnershipTransferState",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "name": "state",
        "type": "tuple",
        "components": [
          { "name": "pendingOwner",     "type": "address" },
          { "name": "unlockTime",       "type": "uint256" },
          { "name": "secondsRemaining", "type": "uint256" },
          { "name": "isActive",         "type": "bool"    },
          { "name": "isExecutable",     "type": "bool"    }
        ]
      }
    ]
  },

  // ─── Keeper / Label / Tier / Fee Recipient ────────────────────────────────
  {
    "name": "setKeeper",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "keeper_", "type": "address" }],
    "outputs": []
  },
  {
    "name": "setKeeperFromFactory",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "keeper_", "type": "address" }],
    "outputs": []
  },
  {
    "name": "setLabel",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "label_", "type": "bytes32" }],
    "outputs": []
  },
  {
    "name": "setTier",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "tier_", "type": "uint8" }],
    "outputs": []
  },
  {
    "name": "updateFeeRecipient",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "newRecipient_", "type": "address" }],
    "outputs": []
  },

  // ─── Open Position ────────────────────────────────────────────────────────
  {
    "name": "openPosition",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "components": [
          { "name": "assetToSupply",       "type": "address" },
          { "name": "assetToBorrow",       "type": "address" },
          { "name": "assetToBorrowAmount", "type": "uint256" },
          { "name": "expectedSwapAmount",  "type": "uint256" },
          { "name": "poolFee",             "type": "uint24"  }
        ]
      },
      { "name": "initialCapital_", "type": "uint256" },
      { "name": "feeMode_",        "type": "uint8"   }
    ],
    "outputs": []
  },

  // ─── Close Position ───────────────────────────────────────────────────────
  {
    "name": "closePosition",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "components": [
          { "name": "assetToWithdraw", "type": "address" },
          { "name": "assetToRepay",    "type": "address" },
          { "name": "minProfit",       "type": "uint256" },
          { "name": "poolFee",         "type": "uint24"  }
        ]
      }
    ],
    "outputs": []
  },

  // ─── Emergency Close ──────────────────────────────────────────────────────
  {
    "name": "emergencyClose",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "assetToWithdraw_", "type": "address" },
      { "name": "assetToRepay_",    "type": "address" },
      { "name": "poolFee_",         "type": "uint24"  },
      { "name": "minOut_",          "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "name": "checkEmergencyApproval",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "assetToRepay_", "type": "address" }],
    "outputs": [
      { "name": "sufficient",     "type": "bool"    },
      { "name": "currentDebt",    "type": "uint256" },
      { "name": "ownerAllowance", "type": "uint256" }
    ]
  },

  // ─── Utility Functions ────────────────────────────────────────────────────
  {
    "name": "repayDebt",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "asset_",  "type": "address" },
      { "name": "amount_", "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "name": "supplyToAave",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "asset_",  "type": "address" },
      { "name": "amount_", "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "name": "withdrawFromAave",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "asset_",  "type": "address" },
      { "name": "amount_", "type": "uint256" }
    ],
    "outputs": [{ "name": "withdrawn", "type": "uint256" }]
  },
  {
    "name": "withdrawTokens",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "token_",  "type": "address" },
      { "name": "amount_", "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "name": "withdrawETH",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [],
    "outputs": []
  },
  {
    "name": "getWETH",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [],
    "outputs": []
  },

  // ─── Balancer Flash Loan Callback ─────────────────────────────────────────
  {
    "name": "receiveFlashLoan",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "tokens",     "type": "address[]" },
      { "name": "amounts",    "type": "uint256[]" },
      { "name": "feeAmounts", "type": "uint256[]" },
      { "name": "userData",   "type": "bytes"     }
    ],
    "outputs": []
  },

  // ─── View: Health & Risk ──────────────────────────────────────────────────
  {
    "name": "getHealthFactor",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "getLiquidationRisk",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint8" }]
  },
  {
    "name": "getMaxLiquidatablePercent",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "isLiquidatable",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bool" }]
  },
  {
    "name": "getTierMinimumHF",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },

  // ─── View: Full Position Snapshot (single Aave call) ──────────────────────
  {
    "name": "getFullPositionData",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "name": "data",
        "type": "tuple",
        "components": [
          { "name": "totalCollateralBase",         "type": "uint256" },
          { "name": "totalDebtBase",               "type": "uint256" },
          { "name": "availableBorrowsBase",        "type": "uint256" },
          { "name": "currentLiquidationThreshold", "type": "uint256" },
          { "name": "ltv",                         "type": "uint256" },
          { "name": "healthFactor",                "type": "uint256" },
          { "name": "riskLevel",                   "type": "uint8"   },
          { "name": "maxLiquidatablePercent",      "type": "uint256" },
          { "name": "positionIndex",               "type": "uint256" },
          { "name": "status",                      "type": "uint8"   },
          { "name": "label",                       "type": "bytes32" },
          { "name": "tier",                        "type": "uint8"   }
        ]
      }
    ]
  },

  // ─── View: Frontend Helpers ───────────────────────────────────────────────
  {
    "name": "getRequiredApproval",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "asset_",          "type": "address" },
      { "name": "initialCapital_", "type": "uint256" }
    ],
    "outputs": [
      { "name": "approvalAmount", "type": "uint256" },
      { "name": "platformFee",    "type": "uint256" }
    ]
  },
  {
    "name": "getMaxFlashLoan",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "assetToSupply_",  "type": "address" },
      { "name": "initialCapital_", "type": "uint256" }
    ],
    "outputs": [
      { "name": "maxFlashLoan",  "type": "uint256" },
      { "name": "safeFlashLoan", "type": "uint256" },
      { "name": "maxLeverage",   "type": "uint256" },
      { "name": "safeLeverage",  "type": "uint256" }
    ]
  },
  {
    "name": "getFlashLoanBoundsByTier",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "assetToSupply_",  "type": "address" },
      { "name": "initialCapital_", "type": "uint256" },
      { "name": "tier_",           "type": "uint8"   }
    ],
    "outputs": [
      { "name": "safeFlashLoan", "type": "uint256" },
      { "name": "safeLeverage",  "type": "uint256" }
    ]
  },
  {
    "name": "getAaveLiquidationInfo",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "asset_", "type": "address" }],
    "outputs": [{ "name": "liquidationBonusBps", "type": "uint256" }]
  },
  {
    "name": "getTokenBalance",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "token_", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "getDebt",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "token_", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  },

  { "type": "receive", "stateMutability": "payable" },

  // ─── Events ───────────────────────────────────────────────────────────────
  {
    "name": "ProtocolFeeCollected",
    "type": "event",
    "inputs": [
      { "name": "token",  "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "isOpen", "type": "bool",    "indexed": false }
    ]
  },
  {
    "name": "PositionOpened",
    "type": "event",
    "inputs": [
      { "name": "owner",            "type": "address", "indexed": true  },
      { "name": "positionIndex",    "type": "uint256", "indexed": true  },
      { "name": "assetSupplied",    "type": "address", "indexed": false },
      { "name": "capitalDeposited", "type": "uint256", "indexed": false },
      { "name": "healthFactor",     "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "PositionReopened",
    "type": "event",
    "inputs": [
      { "name": "owner",            "type": "address", "indexed": true  },
      { "name": "positionIndex",    "type": "uint256", "indexed": true  },
      { "name": "assetSupplied",    "type": "address", "indexed": false },
      { "name": "capitalDeposited", "type": "uint256", "indexed": false },
      { "name": "healthFactor",     "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "PositionClosed",
    "type": "event",
    "inputs": [
      { "name": "owner",         "type": "address", "indexed": true  },
      { "name": "positionIndex", "type": "uint256", "indexed": true  },
      { "name": "assetRepaid",   "type": "address", "indexed": false },
      { "name": "netProfit",     "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "HealthFactorWarning",
    "type": "event",
    "inputs": [
      { "name": "healthFactor", "type": "uint256", "indexed": true  },
      { "name": "riskLevel",    "type": "uint8",   "indexed": false }
    ]
  },
  {
    "name": "LabelUpdated",
    "type": "event",
    "inputs": [{ "name": "label", "type": "bytes32", "indexed": true }]
  },
  {
    "name": "TierUpdated",
    "type": "event",
    "inputs": [
      { "name": "oldTier", "type": "uint8", "indexed": true },
      { "name": "newTier", "type": "uint8", "indexed": true }
    ]
  },
  {
    "name": "FundsDeposited",
    "type": "event",
    "inputs": [
      { "name": "token",  "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "FundsWithdrawn",
    "type": "event",
    "inputs": [
      { "name": "token",  "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "ETHWithdrawn",
    "type": "event",
    "inputs": [{ "name": "amount", "type": "uint256", "indexed": false }]
  },
  {
    "name": "ETHReceived",
    "type": "event",
    "inputs": [
      { "name": "sender", "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "FeeRecipientUpdated",
    "type": "event",
    "inputs": [
      { "name": "oldRecipient", "type": "address", "indexed": true },
      { "name": "newRecipient", "type": "address", "indexed": true }
    ]
  },
  {
    "name": "EmergencyDeficitCovered",
    "type": "event",
    "inputs": [
      { "name": "token",   "type": "address", "indexed": true  },
      { "name": "deficit", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "OwnershipTransferProposed",
    "type": "event",
    "inputs": [
      { "name": "proposed",       "type": "address", "indexed": true  },
      { "name": "unlockTime",     "type": "uint256", "indexed": false },
      { "name": "positionStatus", "type": "uint8",   "indexed": false }
    ]
  },
  { "name": "OwnershipTransferCancelled", "type": "event", "inputs": [] },
  {
    "name": "OwnershipTransferred",
    "type": "event",
    "inputs": [
      { "name": "oldOwner", "type": "address", "indexed": true },
      { "name": "newOwner", "type": "address", "indexed": true }
    ]
  },
  {
    "name": "DebtRepaid",
    "type": "event",
    "inputs": [
      { "name": "token",  "type": "address", "indexed": true  },
      { "name": "repaid", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "KeeperUpdated",
    "type": "event",
    "inputs": [
      { "name": "oldKeeper", "type": "address", "indexed": true },
      { "name": "newKeeper", "type": "address", "indexed": true }
    ]
  },

  // ─── Custom Errors (needed to decode reverts) ─────────────────────────────
  { "name": "PositionNotOwner",                        "type": "error", "inputs": [] },
  { "name": "PositionNotBalancerVault",                "type": "error", "inputs": [] },
  { "name": "PositionUnauthorizedFlashLoan",           "type": "error", "inputs": [] },
  { "name": "PositionInvalidAddress",                  "type": "error", "inputs": [] },
  { "name": "PositionZeroAmount",                      "type": "error", "inputs": [] },
  {
    "name": "PositionHealthFactorTooLow",
    "type": "error",
    "inputs": [
      { "name": "current", "type": "uint256" },
      { "name": "minimum", "type": "uint256" }
    ]
  },
  { "name": "PositionNoDebtToClose",                   "type": "error", "inputs": [] },
  { "name": "PositionInvalidPoolFee",                  "type": "error", "inputs": [] },
  { "name": "PositionAlreadyActive",                   "type": "error", "inputs": [] },
  { "name": "PositionNotActive",                       "type": "error", "inputs": [] },
  { "name": "PositionCannotChangeTierWhileActive",     "type": "error", "inputs": [] },
  { "name": "PositionInvalidIndex",                    "type": "error", "inputs": [] },
  { "name": "PositionUnauthorized",                    "type": "error", "inputs": [] },
  { "name": "PositionFeeTooHigh",                      "type": "error", "inputs": [] },
  { "name": "PositionInvalidFlashLoanCallback",        "type": "error", "inputs": [] },
  {
    "name": "PositionUnexpectedFlashLoanToken",
    "type": "error",
    "inputs": [
      { "name": "got",      "type": "address" },
      { "name": "expected", "type": "address" }
    ]
  },
  {
    "name": "PositionInsufficientToRepay",
    "type": "error",
    "inputs": [
      { "name": "recovered", "type": "uint256" },
      { "name": "required",  "type": "uint256" }
    ]
  },
  { "name": "PositionInvalidLTV",                      "type": "error", "inputs": [] },
  { "name": "PositionTransferMismatch",                "type": "error", "inputs": [] },
  {
    "name": "PositionUnexpectedFlashFee",
    "type": "error",
    "inputs": [{ "name": "fee", "type": "uint256" }]
  },
  { "name": "PositionNoPendingOwner",                  "type": "error", "inputs": [] },
  { "name": "PositionNotPendingOwner",                 "type": "error", "inputs": [] },
  { "name": "PositionAlreadyPending",                  "type": "error", "inputs": [] },
  { "name": "PositionFlashLoanFailed",                 "type": "error", "inputs": [] },
  { "name": "PositionOwnerSyncFailed",                 "type": "error", "inputs": [] },
  {
    "name": "PositionTransferTimelockNotExpired",
    "type": "error",
    "inputs": [
      { "name": "unlockTime",  "type": "uint256" },
      { "name": "currentTime", "type": "uint256" }
    ]
  },
  { "name": "PositionCannotTransferWhileActive",       "type": "error", "inputs": [] },
  { "name": "PositionFactoryPaused",                   "type": "error", "inputs": [] },
  { "name": "PositionCannotWithdrawAToken",            "type": "error", "inputs": [] },
  { "name": "PositionNotAuthorized",                   "type": "error", "inputs": [] },
  { "name": "PositionKeeperLockedWhileActive",         "type": "error", "inputs": [] },
  { "name": "PositionCapitalBelowAgentMinimum",        "type": "error", "inputs": [] },
  { "name": "PositionFeeModeAgentRequiresKeeper",      "type": "error", "inputs": [] },
  { "name": "PositionIdleHasOpenDebt",                 "type": "error", "inputs": [] },
  { "name": "PositionCapitalTooSmall",                 "type": "error", "inputs": [] },
  { "name": "PositionNotIdle",                         "type": "error", "inputs": [] },
  { "name": "PositionFeeModeStandardRequiresNoKeeper", "type": "error", "inputs": [] }

] as const;

export type PositionAbiType = typeof POSITION_ABI;
