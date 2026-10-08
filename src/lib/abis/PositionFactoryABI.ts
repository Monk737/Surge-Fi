// Mirrors contracts/PositionFactory.sol (plus the Ownable2Step / Pausable / UUPS members it inherits).
export const POSITION_FACTORY_ABI = [
  // ─── Initializer ──────────────────────────────────────────────────────────
  {
    "name": "initialize",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "beacon_",       "type": "address" },
      { "name": "initialOwner_", "type": "address" },
      { "name": "feeRecipient_", "type": "address" }
    ],
    "outputs": []
  },
  { "name": "reinitializeDeployCounter", "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },

  // ─── Public State Variable Getters ────────────────────────────────────────
  { "name": "beacon",                     "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "platformFeeRecipient",       "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "pendingFeeRecipient",        "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "maxPositionsPerUser",        "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "maxTotalPositions",          "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "totalPositionsEverDeployed", "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "pendingBeacon",              "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "beaconUpdateUnlockTime",     "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "emergencyBeacon",            "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "pauseGuardian",              "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "pendingUpgradeImpl",         "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "upgradeUnlockTime",          "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "protocolAgent",              "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "paused",                     "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "bool"    }] },
  { "name": "owner",                      "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "pendingOwner",               "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
  { "name": "BEACON_TIMELOCK",            "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "UPGRADE_TIMELOCK",           "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "name": "MAX_BATCH_SIZE",             "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  {
    "name": "userPositions",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "user",  "type": "address" },
      { "name": "index", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "address" }]
  },
  {
    "name": "allPositions",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "index", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "address" }]
  },
  {
    "name": "positionToOwner",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "proxy", "type": "address" }],
    "outputs": [{ "name": "", "type": "address" }]
  },
  {
    "name": "isRegisteredPosition",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "proxy", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }]
  },

  // ─── User Write Functions ─────────────────────────────────────────────────
  {
    "name": "deployPosition",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs":  [],
    "outputs": [{ "name": "positionProxy", "type": "address" }]
  },
  {
    "name": "syncPositionOwner",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "proxy_", "type": "address" }],
    "outputs": []
  },

  // ─── Admin: Pause ─────────────────────────────────────────────────────────
  { "name": "pause",               "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  { "name": "unpause",             "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  {
    "name": "setPauseGuardian",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "guardian_", "type": "address" }],
    "outputs": []
  },
  { "name": "removePauseGuardian", "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },

  // ─── Admin: Limits ────────────────────────────────────────────────────────
  {
    "name": "setMaxPositionsPerUser",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "newMax_", "type": "uint256" }],
    "outputs": []
  },
  {
    "name": "setMaxTotalPositions",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "newMax_", "type": "uint256" }],
    "outputs": []
  },

  // ─── Admin: Beacon (48h timelock) ─────────────────────────────────────────
  {
    "name": "proposeBeacon",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "newBeacon_", "type": "address" }],
    "outputs": []
  },
  { "name": "executeBeaconUpdate", "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  { "name": "cancelBeaconUpdate",  "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  {
    "name": "setEmergencyBeacon",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "emergencyBeacon_", "type": "address" }],
    "outputs": []
  },
  { "name": "executeEmergencyBeaconOverride", "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  { "name": "isEmergencyBeaconReady",         "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "bool" }] },

  // ─── Admin: Fee Recipient ─────────────────────────────────────────────────
  {
    "name": "proposeFeeRecipient",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "proposed_", "type": "address" }],
    "outputs": []
  },
  { "name": "acceptFeeRecipient",        "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  { "name": "cancelPendingFeeRecipient", "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  {
    "name": "updateProxyFeeRecipient",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "proxy_",        "type": "address" },
      { "name": "newRecipient_", "type": "address" }
    ],
    "outputs": []
  },
  {
    "name": "batchUpdateFeeRecipient",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "proxies_", "type": "address[]" }],
    "outputs": []
  },

  // ─── Admin: Protocol Agent (keeper) ───────────────────────────────────────
  {
    "name": "setProtocolAgent",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "agent_", "type": "address" }],
    "outputs": []
  },
  {
    "name": "batchSetKeeper",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "proxies_", "type": "address[]" }],
    "outputs": []
  },

  // ─── Admin: Rescue ────────────────────────────────────────────────────────
  {
    "name": "rescueETH",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [],
    "outputs": []
  },
  {
    "name": "rescueTokens",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "token_",  "type": "address" },
      { "name": "amount_", "type": "uint256" }
    ],
    "outputs": []
  },

  // ─── Admin: Ownership & Upgrades (48h timelock) ───────────────────────────
  {
    "name": "transferOwnership",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "newOwner_", "type": "address" }],
    "outputs": []
  },
  { "name": "acceptOwnership",   "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  { "name": "renounceOwnership", "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  {
    "name": "proposeUpgrade",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "newImpl_", "type": "address" }],
    "outputs": []
  },
  { "name": "cancelUpgrade",     "type": "function", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  {
    "name": "upgradeToAndCall",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      { "name": "newImplementation", "type": "address" },
      { "name": "data",              "type": "bytes"   }
    ],
    "outputs": []
  },

  // ─── View Functions ───────────────────────────────────────────────────────
  {
    "name": "getUserPositions",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "user_", "type": "address" }],
    "outputs": [{ "name": "", "type": "address[]" }]
  },
  {
    "name": "getUserPositionCount",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "user_", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "getLatestUserPosition",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "user_", "type": "address" }],
    "outputs": [{ "name": "", "type": "address" }]
  },
  {
    "name": "getPositionByIndex",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "user_",  "type": "address" },
      { "name": "index_", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "address" }]
  },
  {
    "name": "isUserPosition",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "user_",  "type": "address" },
      { "name": "proxy_", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool" }]
  },
  {
    "name": "getPositionOwner",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "proxy_", "type": "address" }],
    "outputs": [{ "name": "", "type": "address" }]
  },
  {
    "name": "getPositionDetails",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "proxy_", "type": "address" }],
    "outputs": [
      {
        "name": "summary",
        "type": "tuple",
        "components": [
          { "name": "proxyAddress",  "type": "address" },
          { "name": "owner",         "type": "address" },
          { "name": "positionIndex", "type": "uint256" },
          { "name": "status",        "type": "uint8"   },
          { "name": "label",         "type": "bytes32" },
          { "name": "tier",          "type": "uint8"   }
        ]
      }
    ]
  },
  {
    "name": "getUserPositionsSummary",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "user_",   "type": "address" },
      { "name": "offset_", "type": "uint256" },
      { "name": "limit_",  "type": "uint256" }
    ],
    "outputs": [
      {
        "name": "summaries",
        "type": "tuple[]",
        "components": [
          { "name": "proxyAddress",  "type": "address" },
          { "name": "owner",         "type": "address" },
          { "name": "positionIndex", "type": "uint256" },
          { "name": "status",        "type": "uint8"   },
          { "name": "label",         "type": "bytes32" },
          { "name": "tier",          "type": "uint8"   }
        ]
      },
      { "name": "total", "type": "uint256" }
    ]
  },
  {
    "name": "getAllPositions",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "offset_", "type": "uint256" },
      { "name": "limit_",  "type": "uint256" }
    ],
    "outputs": [
      { "name": "result", "type": "address[]" },
      { "name": "total",  "type": "uint256"   }
    ]
  },
  {
    "name": "getTotalPositions",
    "type": "function",
    "stateMutability": "view",
    "inputs":  [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },

  { "type": "receive", "stateMutability": "payable" },

  // ─── Events ───────────────────────────────────────────────────────────────
  {
    "name": "PositionDeployed",
    "type": "event",
    "inputs": [
      { "name": "user",          "type": "address", "indexed": true  },
      { "name": "positionProxy", "type": "address", "indexed": true  },
      { "name": "positionIndex", "type": "uint256", "indexed": true  },
      { "name": "feeRecipient",  "type": "address", "indexed": false },
      { "name": "timestamp",     "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "BeaconUpdated",
    "type": "event",
    "inputs": [
      { "name": "oldBeacon", "type": "address", "indexed": true  },
      { "name": "newBeacon", "type": "address", "indexed": true  }
    ]
  },
  {
    "name": "BeaconUpdateProposed",
    "type": "event",
    "inputs": [
      { "name": "pendingBeacon", "type": "address", "indexed": true  },
      { "name": "unlockTime",    "type": "uint256", "indexed": false }
    ]
  },
  { "name": "BeaconUpdateCancelled", "type": "event", "inputs": [] },
  {
    "name": "ETHRescued",
    "type": "event",
    "inputs": [
      { "name": "to",     "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "TokensRescued",
    "type": "event",
    "inputs": [
      { "name": "token",  "type": "address", "indexed": true  },
      { "name": "to",     "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "MaxPositionsPerUserUpdated",
    "type": "event",
    "inputs": [
      { "name": "oldMax", "type": "uint256", "indexed": false },
      { "name": "newMax", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "MaxTotalPositionsUpdated",
    "type": "event",
    "inputs": [
      { "name": "oldMax", "type": "uint256", "indexed": false },
      { "name": "newMax", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "FeeRecipientProposed",
    "type": "event",
    "inputs": [{ "name": "proposed", "type": "address", "indexed": true }]
  },
  {
    "name": "FeeRecipientUpdated",
    "type": "event",
    "inputs": [
      { "name": "oldRecipient", "type": "address", "indexed": true },
      { "name": "newRecipient", "type": "address", "indexed": true }
    ]
  },
  { "name": "FeeRecipientProposalCancelled", "type": "event", "inputs": [] },
  {
    "name": "ETHReceived",
    "type": "event",
    "inputs": [
      { "name": "sender", "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "PauseGuardianUpdated",
    "type": "event",
    "inputs": [
      { "name": "oldGuardian", "type": "address", "indexed": true },
      { "name": "newGuardian", "type": "address", "indexed": true }
    ]
  },
  {
    "name": "PositionOwnerSynced",
    "type": "event",
    "inputs": [
      { "name": "proxy",    "type": "address", "indexed": true },
      { "name": "oldOwner", "type": "address", "indexed": true },
      { "name": "newOwner", "type": "address", "indexed": true }
    ]
  },
  {
    "name": "UpgradeProposed",
    "type": "event",
    "inputs": [
      { "name": "pendingImpl", "type": "address", "indexed": true  },
      { "name": "unlockTime",  "type": "uint256", "indexed": false }
    ]
  },
  { "name": "UpgradeCancelled", "type": "event", "inputs": [] },
  {
    "name": "UpgradeExecuted",
    "type": "event",
    "inputs": [
      { "name": "oldImpl", "type": "address", "indexed": true },
      { "name": "newImpl", "type": "address", "indexed": true }
    ]
  },
  {
    "name": "EmergencyBeaconSet",
    "type": "event",
    "inputs": [
      { "name": "oldEmergencyBeacon", "type": "address", "indexed": true },
      { "name": "newEmergencyBeacon", "type": "address", "indexed": true }
    ]
  },
  {
    "name": "EmergencyBeaconOverrideExecuted",
    "type": "event",
    "inputs": [
      { "name": "oldBeacon",    "type": "address", "indexed": true },
      { "name": "frozenBeacon", "type": "address", "indexed": true }
    ]
  },
  {
    "name": "BatchFeeUpdateFailed",
    "type": "event",
    "inputs": [{ "name": "proxy", "type": "address", "indexed": true }]
  },
  {
    "name": "ProtocolAgentUpdated",
    "type": "event",
    "inputs": [
      { "name": "oldAgent", "type": "address", "indexed": true },
      { "name": "newAgent", "type": "address", "indexed": true }
    ]
  },
  {
    "name": "OwnershipTransferStarted",
    "type": "event",
    "inputs": [
      { "name": "previousOwner", "type": "address", "indexed": true },
      { "name": "newOwner",      "type": "address", "indexed": true }
    ]
  },
  {
    "name": "OwnershipTransferred",
    "type": "event",
    "inputs": [
      { "name": "previousOwner", "type": "address", "indexed": true },
      { "name": "newOwner",      "type": "address", "indexed": true }
    ]
  },
  {
    "name": "Paused",
    "type": "event",
    "inputs": [{ "name": "account", "type": "address", "indexed": false }]
  },
  {
    "name": "Unpaused",
    "type": "event",
    "inputs": [{ "name": "account", "type": "address", "indexed": false }]
  },

  // ─── Custom Errors (needed to decode reverts) ─────────────────────────────
  { "name": "PositionFactoryZeroAddress",                    "type": "error", "inputs": [] },
  { "name": "PositionFactoryInvalidBeacon",                  "type": "error", "inputs": [] },
  { "name": "PositionFactorySameBeacon",                     "type": "error", "inputs": [] },
  { "name": "PositionFactoryAlreadyPendingBeacon",           "type": "error", "inputs": [] },
  { "name": "PositionFactoryMaxPositionsReached",            "type": "error", "inputs": [] },
  { "name": "PositionFactoryGlobalMaxPositionsReached",      "type": "error", "inputs": [] },
  { "name": "PositionFactoryInvalidMaxPositions",            "type": "error", "inputs": [] },
  { "name": "PositionFactoryZeroFeeRecipient",               "type": "error", "inputs": [] },
  { "name": "PositionFactoryNotPendingRecipient",            "type": "error", "inputs": [] },
  { "name": "PositionFactoryAlreadyFeeRecipient",            "type": "error", "inputs": [] },
  { "name": "PositionFactorySameFeeRecipient",               "type": "error", "inputs": [] },
  { "name": "PositionFactoryNoPendingRecipient",             "type": "error", "inputs": [] },
  { "name": "PositionFactoryZeroBalance",                    "type": "error", "inputs": [] },
  { "name": "PositionFactoryZeroAmount",                     "type": "error", "inputs": [] },
  { "name": "PositionFactoryUnregisteredPosition",           "type": "error", "inputs": [] },
  { "name": "PositionFactoryTimelockNotExpired",             "type": "error", "inputs": [] },
  { "name": "PositionFactoryNoPositionsDeployed",            "type": "error", "inputs": [] },
  { "name": "PositionFactoryUnauthorized",                   "type": "error", "inputs": [] },
  { "name": "PositionFactoryNoPendingBeacon",                "type": "error", "inputs": [] },
  { "name": "PositionFactoryInvalidIndex",                   "type": "error", "inputs": [] },
  { "name": "PositionFactoryBatchTooLarge",                  "type": "error", "inputs": [] },
  { "name": "PositionFactoryNoPendingUpgrade",               "type": "error", "inputs": [] },
  { "name": "PositionFactoryAlreadyPendingUpgrade",          "type": "error", "inputs": [] },
  { "name": "PositionFactorySameImplementation",             "type": "error", "inputs": [] },
  { "name": "PositionFactoryInvalidImplementation",          "type": "error", "inputs": [] },
  { "name": "PositionFactoryProxyNotFound",                  "type": "error", "inputs": [] },
  { "name": "PositionFactoryEmergencyBeaconNotSet",          "type": "error", "inputs": [] },
  { "name": "PositionFactorySameEmergencyBeacon",            "type": "error", "inputs": [] },
  { "name": "PositionFactoryAlreadyFrozen",                  "type": "error", "inputs": [] },
  { "name": "PositionFactoryBeaconIsEmergencyBeacon",        "type": "error", "inputs": [] },
  { "name": "PositionFactoryPendingBeaconIsEmergencyBeacon", "type": "error", "inputs": [] },
  { "name": "PositionFactoryOwnerMustBeMultisig",            "type": "error", "inputs": [] },
  {
    "name": "PositionFactoryRecipientAtMaxPositions",
    "type": "error",
    "inputs": [
      { "name": "recipient",  "type": "address" },
      { "name": "maxAllowed", "type": "uint256" }
    ]
  },
  { "name": "PositionFactoryRenounceOwnershipDisabled",      "type": "error", "inputs": [] },
  { "name": "PositionFactoryInsufficientTokenBalance",       "type": "error", "inputs": [] },
  { "name": "PositionFactoryProxyInitFailed",                "type": "error", "inputs": [] },
  { "name": "PositionFactoryAgentSetFailed",                 "type": "error", "inputs": [] },
  // Inherited from OpenZeppelin PausableUpgradeable — raised by deployPosition() while paused.
  { "name": "EnforcedPause",                                 "type": "error", "inputs": [] }

] as const;

export type PositionFactoryAbiType = typeof POSITION_FACTORY_ABI;
