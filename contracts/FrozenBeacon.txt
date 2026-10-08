// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

contract FrozenBeacon is IBeacon {

    address private immutable _frozenImplementation;

    error FrozenBeaconZeroAddress();
    error FrozenBeaconNotContract();
    error FrozenBeaconSelfReference();
    error FrozenBeaconUnknownCall();

    event FrozenBeaconDeployed(address indexed implementation);

    constructor(address implementation_) {
        if (implementation_ == address(0))    revert FrozenBeaconZeroAddress();
        if (implementation_ == address(this)) revert FrozenBeaconSelfReference();
        if (implementation_.code.length == 0) revert FrozenBeaconNotContract();
        _frozenImplementation = implementation_;
        emit FrozenBeaconDeployed(implementation_);
    }

    function implementation() external view override returns (address) {
        return _frozenImplementation;
    }

    fallback() external {
        revert FrozenBeaconUnknownCall();
    }
}