// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

interface IPositionFactory {
    function isRegisteredPosition(address proxy) external view returns (bool);
    function positionToOwner(address proxy) external view returns (address);
}

contract PositionConfig {
    error PositionConfigUnauthorized();
    error PositionConfigInvalidProxy();
    error PositionConfigInvalidAddress();
    error PositionConfigInvalidThreshold();

    struct Config {
        uint256 hfCloseThreshold;
        uint256 profitTargetBps;
        address assetToWithdraw;
        address assetToRepay;
        uint24  poolFee;
        uint256 minOut;
        bool    autoCloseOnHF;
        bool    autoCloseOnProfit;
        bool    active;
    }

    address public immutable FACTORY;
    mapping(address => Config) private _configs;
    mapping(address => address) public configOwner;

    event ConfigSet(address indexed proxy, address indexed owner, Config config);
    event ConfigRemoved(address indexed proxy, address indexed owner);

    constructor(address factory_) {
        if (factory_ == address(0)) revert PositionConfigInvalidAddress();
        FACTORY = factory_;
    }

    modifier onlyPositionOwner(address proxy_) {
        if (!IPositionFactory(FACTORY).isRegisteredPosition(proxy_))
            revert PositionConfigInvalidProxy();
        if (IPositionFactory(FACTORY).positionToOwner(proxy_) != msg.sender)
            revert PositionConfigUnauthorized();
        _;
    }

    function setConfig(address proxy_, Config calldata config_)
        external onlyPositionOwner(proxy_)
    {
        if (config_.assetToWithdraw == address(0) || config_.assetToRepay == address(0))
            revert PositionConfigInvalidAddress();
        if (config_.hfCloseThreshold > 0 && config_.hfCloseThreshold < 1e18)
            revert PositionConfigInvalidThreshold();
        _configs[proxy_] = config_;
        configOwner[proxy_] = msg.sender;
        emit ConfigSet(proxy_, msg.sender, config_);
    }

    function removeConfig(address proxy_) external onlyPositionOwner(proxy_) {
        delete _configs[proxy_];
        delete configOwner[proxy_];
        emit ConfigRemoved(proxy_, msg.sender);
    }

    function getConfig(address proxy_) external view returns (Config memory) {
        if (configOwner[proxy_] != IPositionFactory(FACTORY).positionToOwner(proxy_)) {
            return Config(0, 0, address(0), address(0), 0, 0, false, false, false);
        }
        return _configs[proxy_];
    }

    function isActive(address proxy_) external view returns (bool) {
        if (configOwner[proxy_] != IPositionFactory(FACTORY).positionToOwner(proxy_)) {
            return false;
        }
        return _configs[proxy_].active;
    }
}
