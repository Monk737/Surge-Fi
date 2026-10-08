// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Empty contract that just imports OZ proxy contracts.
// This forces Hardhat to compile them so the verify task
// can find their artifacts for Etherscan submission.
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
