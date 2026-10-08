// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Position} from "./Position.sol";

interface IUpgradeableBeacon {
    function upgradeTo(address newImplementation) external;
}

contract PositionFactory is
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using Address for address payable;
    using Address for address;
    using SafeERC20 for IERC20;

    error PositionFactoryZeroAddress();
    error PositionFactoryInvalidBeacon();
    error PositionFactorySameBeacon();
    error PositionFactoryAlreadyPendingBeacon();
    error PositionFactoryMaxPositionsReached();
    error PositionFactoryGlobalMaxPositionsReached();
    error PositionFactoryInvalidMaxPositions();
    error PositionFactoryZeroFeeRecipient();
    error PositionFactoryNotPendingRecipient();
    error PositionFactoryAlreadyFeeRecipient();
    error PositionFactorySameFeeRecipient();
    error PositionFactoryNoPendingRecipient();
    error PositionFactoryZeroBalance();
    error PositionFactoryZeroAmount();
    error PositionFactoryUnregisteredPosition();
    error PositionFactoryTimelockNotExpired();
    error PositionFactoryNoPositionsDeployed();
    error PositionFactoryUnauthorized();
    error PositionFactoryNoPendingBeacon();
    error PositionFactoryInvalidIndex();
    error PositionFactoryBatchTooLarge();
    error PositionFactoryNoPendingUpgrade();
    error PositionFactoryAlreadyPendingUpgrade();
    error PositionFactorySameImplementation();
    error PositionFactoryInvalidImplementation();
    error PositionFactoryProxyNotFound();
    error PositionFactoryEmergencyBeaconNotSet();
    error PositionFactorySameEmergencyBeacon();
    error PositionFactoryAlreadyFrozen();
    error PositionFactoryBeaconIsEmergencyBeacon();
    error PositionFactoryPendingBeaconIsEmergencyBeacon();
    error PositionFactoryOwnerMustBeMultisig();
    error PositionFactoryRecipientAtMaxPositions(address recipient, uint256 maxAllowed);
    error PositionFactoryRenounceOwnershipDisabled();
    error PositionFactoryInsufficientTokenBalance();
    error PositionFactoryProxyInitFailed();
    error PositionFactoryAgentSetFailed();

    address public beacon;
    mapping(address => address[]) public userPositions;
    address[] public allPositions;
    uint256 public maxPositionsPerUser;
    mapping(address => address) public positionToOwner;
    mapping(address => bool) public isRegisteredPosition;
    address public platformFeeRecipient;
    address public pendingFeeRecipient;
    uint256 public maxTotalPositions;
    address public pendingBeacon;
    uint256 public beaconUpdateUnlockTime;
    address public pauseGuardian;
    address public pendingUpgradeImpl;
    uint256 public upgradeUnlockTime;
    address public emergencyBeacon;
    uint256 public totalPositionsEverDeployed;
    address public protocolAgent;

    uint256[33] private __gap;

    uint256 public constant BEACON_TIMELOCK  = 48 hours;
    uint256 public constant UPGRADE_TIMELOCK = 48 hours;
    uint256 public constant MAX_BATCH_SIZE   = 200;

    struct PositionSummary {
        address proxyAddress;
        address owner;
        uint256 positionIndex;
        Position.PositionStatus status;
        bytes32 label;
        Position.PositionTier tier;
    }

    event PositionDeployed(address indexed user, address indexed positionProxy, uint256 indexed positionIndex, address feeRecipient, uint256 timestamp);
    event BeaconUpdated(address indexed oldBeacon, address indexed newBeacon);
    event BeaconUpdateProposed(address indexed pendingBeacon, uint256 unlockTime);
    event BeaconUpdateCancelled();
    event ETHRescued(address indexed to, uint256 amount);
    event TokensRescued(address indexed token, address indexed to, uint256 amount);
    event MaxPositionsPerUserUpdated(uint256 oldMax, uint256 newMax);
    event MaxTotalPositionsUpdated(uint256 oldMax, uint256 newMax);
    event FeeRecipientProposed(address indexed proposed);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeeRecipientProposalCancelled();
    event ETHReceived(address indexed sender, uint256 amount);
    event PauseGuardianUpdated(address indexed oldGuardian, address indexed newGuardian);
    event PositionOwnerSynced(address indexed proxy, address indexed oldOwner, address indexed newOwner);
    event UpgradeProposed(address indexed pendingImpl, uint256 unlockTime);
    event UpgradeCancelled();
    event UpgradeExecuted(address indexed oldImpl, address indexed newImpl);
    event EmergencyBeaconSet(address indexed oldEmergencyBeacon, address indexed newEmergencyBeacon);
    event EmergencyBeaconOverrideExecuted(address indexed oldBeacon, address indexed frozenBeacon);
    event BatchFeeUpdateFailed(address indexed proxy);
    event ProtocolAgentUpdated(address indexed oldAgent, address indexed newAgent);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address beacon_,
        address initialOwner_,
        address feeRecipient_
    ) public initializer {
        if (beacon_ == address(0) || initialOwner_ == address(0) || feeRecipient_ == address(0))
            revert PositionFactoryZeroAddress();
        if (initialOwner_.code.length == 0) revert PositionFactoryOwnerMustBeMultisig();

        address impl;
        try IBeacon(beacon_).implementation() returns (address i) { impl = i; }
        catch { revert PositionFactoryInvalidBeacon(); }
        if (impl == address(0) || impl.code.length == 0) revert PositionFactoryInvalidBeacon();

        __Ownable_init(initialOwner_);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        beacon               = beacon_;
        maxPositionsPerUser  = 1_000;
        maxTotalPositions    = 1_000_000;
        platformFeeRecipient = feeRecipient_;
    }

    function reinitializeDeployCounter() external onlyOwner reinitializer(2) {
        if (totalPositionsEverDeployed == 0 && allPositions.length > 0) {
            totalPositionsEverDeployed = allPositions.length;
        }
    }

    function transferOwnership(address newOwner_) public override onlyOwner {
        if (newOwner_ == address(0))    revert PositionFactoryZeroAddress();
        if (newOwner_.code.length == 0) revert PositionFactoryOwnerMustBeMultisig();
        super.transferOwnership(newOwner_);
    }

    function acceptOwnership() public override {
        address pending = pendingOwner();
        if (pending.code.length == 0) revert PositionFactoryOwnerMustBeMultisig();
        address oldGuardian = pauseGuardian;
        super.acceptOwnership();
        pauseGuardian = address(0);
        if (oldGuardian != address(0)) emit PauseGuardianUpdated(oldGuardian, address(0));
    }

    function renounceOwnership() public override onlyOwner {
        revert PositionFactoryRenounceOwnershipDisabled();
    }

    function proposeUpgrade(address newImpl_) external onlyOwner {
        if (newImpl_ == address(0))          revert PositionFactoryZeroAddress();
        if (!newImpl_.isContract())           revert PositionFactoryInvalidImplementation();
        if (newImpl_ == _getImplementation()) revert PositionFactorySameImplementation();
        if (newImpl_ == pendingUpgradeImpl)   revert PositionFactoryAlreadyPendingUpgrade();
        if (pendingUpgradeImpl != address(0)) emit UpgradeCancelled();
        pendingUpgradeImpl = newImpl_;
        upgradeUnlockTime  = block.timestamp + UPGRADE_TIMELOCK;
        emit UpgradeProposed(newImpl_, upgradeUnlockTime);
    }

    function cancelUpgrade() external onlyOwner {
        if (pendingUpgradeImpl == address(0)) revert PositionFactoryNoPendingUpgrade();
        pendingUpgradeImpl = address(0);
        upgradeUnlockTime  = 0;
        emit UpgradeCancelled();
    }

    function _authorizeUpgrade(address newImpl_) internal override onlyOwner {
        if (newImpl_ == address(0))              revert PositionFactoryZeroAddress();
        if (newImpl_ != pendingUpgradeImpl)       revert PositionFactoryNoPendingUpgrade();
        if (block.timestamp < upgradeUnlockTime) revert PositionFactoryTimelockNotExpired();
        address oldImpl    = _getImplementation();
        pendingUpgradeImpl = address(0);
        upgradeUnlockTime  = 0;
        emit UpgradeExecuted(oldImpl, newImpl_);
    }

    function _getImplementation() internal view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    function pause() external {
        if (msg.sender != owner() && msg.sender != pauseGuardian)
            revert PositionFactoryUnauthorized();
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setPauseGuardian(address guardian_) external onlyOwner {
        if (guardian_ == address(0)) revert PositionFactoryZeroAddress();
        address old   = pauseGuardian;
        pauseGuardian = guardian_;
        emit PauseGuardianUpdated(old, guardian_);
    }

    function removePauseGuardian() external onlyOwner {
        address old   = pauseGuardian;
        pauseGuardian = address(0);
        emit PauseGuardianUpdated(old, address(0));
    }

    function setEmergencyBeacon(address emergencyBeacon_) external onlyOwner {
        if (emergencyBeacon_ == address(0))         revert PositionFactoryZeroAddress();
        if (emergencyBeacon_ == emergencyBeacon)     revert PositionFactorySameEmergencyBeacon();
        if (emergencyBeacon_ == pendingBeacon)       revert PositionFactoryPendingBeaconIsEmergencyBeacon();

        address impl;
        try IBeacon(emergencyBeacon_).implementation() returns (address i) { impl = i; }
        catch { revert PositionFactoryInvalidBeacon(); }
        if (impl == address(0) || impl.code.length == 0) revert PositionFactoryInvalidBeacon();

        address old     = emergencyBeacon;
        emergencyBeacon = emergencyBeacon_;
        emit EmergencyBeaconSet(old, emergencyBeacon_);
    }

    function executeEmergencyBeaconOverride() external onlyOwner {
        if (emergencyBeacon == address(0)) revert PositionFactoryEmergencyBeaconNotSet();

        address impl;
        try IBeacon(emergencyBeacon).implementation() returns (address i) { impl = i; }
        catch { revert PositionFactoryInvalidBeacon(); }
        if (impl == address(0) || impl.code.length == 0) revert PositionFactoryInvalidBeacon();

        if (pendingBeacon != address(0)) {
            pendingBeacon          = address(0);
            beaconUpdateUnlockTime = 0;
            emit BeaconUpdateCancelled();
        }

        address old = beacon;
        IUpgradeableBeacon(beacon).upgradeTo(impl);
        emit EmergencyBeaconOverrideExecuted(old, emergencyBeacon);
    }

    function isEmergencyBeaconReady() external view returns (bool) {
        return emergencyBeacon != address(0);
    }

    function setMaxPositionsPerUser(uint256 newMax_) external onlyOwner {
        if (newMax_ == 0) revert PositionFactoryInvalidMaxPositions();
        uint256 oldMax = maxPositionsPerUser;
        if (oldMax == newMax_) return;
        maxPositionsPerUser = newMax_;
        emit MaxPositionsPerUserUpdated(oldMax, newMax_);
    }

    function setMaxTotalPositions(uint256 newMax_) external onlyOwner {
        if (newMax_ == 0 || newMax_ < allPositions.length) revert PositionFactoryInvalidMaxPositions();
        uint256 oldMax = maxTotalPositions;
        if (oldMax == newMax_) return;
        maxTotalPositions = newMax_;
        emit MaxTotalPositionsUpdated(oldMax, newMax_);
    }

    function proposeBeacon(address newBeacon_) external onlyOwner {
        if (newBeacon_ == address(0))      revert PositionFactoryZeroAddress();
        if (newBeacon_ == pendingBeacon)   revert PositionFactoryAlreadyPendingBeacon();

        address impl;
        try IBeacon(newBeacon_).implementation() returns (address i) { impl = i; }
        catch { revert PositionFactoryInvalidBeacon(); }
        if (impl == address(0) || impl.code.length == 0) revert PositionFactoryInvalidBeacon();

        if (pendingBeacon != address(0)) emit BeaconUpdateCancelled();
        pendingBeacon          = newBeacon_;
        beaconUpdateUnlockTime = block.timestamp + BEACON_TIMELOCK;
        emit BeaconUpdateProposed(newBeacon_, beaconUpdateUnlockTime);
    }

    function executeBeaconUpdate() external onlyOwner {
        if (pendingBeacon == address(0))              revert PositionFactoryNoPendingBeacon();
        if (block.timestamp < beaconUpdateUnlockTime) revert PositionFactoryTimelockNotExpired();

        address impl;
        try IBeacon(pendingBeacon).implementation() returns (address i) { impl = i; }
        catch { revert PositionFactoryInvalidBeacon(); }
        if (impl == address(0) || impl.code.length == 0) revert PositionFactoryInvalidBeacon();

        address oldBeacon      = beacon;
        IUpgradeableBeacon(beacon).upgradeTo(impl);

        pendingBeacon          = address(0);
        beaconUpdateUnlockTime = 0;
        emit BeaconUpdated(oldBeacon, impl);
    }

    function cancelBeaconUpdate() external onlyOwner {
        if (pendingBeacon == address(0)) revert PositionFactoryNoPendingBeacon();
        pendingBeacon          = address(0);
        beaconUpdateUnlockTime = 0;
        emit BeaconUpdateCancelled();
    }

    function updateProxyFeeRecipient(address proxy_, address newRecipient_) external onlyOwner {
        if (!isRegisteredPosition[proxy_]) revert PositionFactoryUnregisteredPosition();
        if (newRecipient_ == address(0))   revert PositionFactoryZeroAddress();
        Position(proxy_).updateFeeRecipient(newRecipient_);
    }

    function batchUpdateFeeRecipient(address[] calldata proxies_) external onlyOwner {
        uint256 len = proxies_.length;
        if (len == 0)             return;
        if (len > MAX_BATCH_SIZE) revert PositionFactoryBatchTooLarge();
        address newRecipient = platformFeeRecipient;
        for (uint256 i = 0; i < len;) {
            address proxy = proxies_[i];
            if (!isRegisteredPosition[proxy]) {
                emit BatchFeeUpdateFailed(proxy);
                unchecked { ++i; }
                continue;
            }
            try Position(proxy).updateFeeRecipient(newRecipient) { }
            catch { emit BatchFeeUpdateFailed(proxy); }
            unchecked { ++i; }
        }
    }


    function setProtocolAgent(address agent_) external onlyOwner {
        address old = protocolAgent;
        protocolAgent = agent_;
        emit ProtocolAgentUpdated(old, agent_);
    }

    function batchSetKeeper(address[] calldata proxies_) external onlyOwner {
        address agent = protocolAgent;
        for (uint256 i = 0; i < proxies_.length;) {
            address proxy = proxies_[i];
            if (!isRegisteredPosition[proxy]) { unchecked { ++i; } continue; }
            try Position(proxy).setKeeperFromFactory(agent) {} catch {}
            unchecked { ++i; }
        }
    }
    function proposeFeeRecipient(address proposed_) external onlyOwner {
        if (proposed_ == address(0))           revert PositionFactoryZeroFeeRecipient();
        if (proposed_ == platformFeeRecipient) revert PositionFactoryAlreadyFeeRecipient();
        if (proposed_ == pendingFeeRecipient)  revert PositionFactorySameFeeRecipient();
        if (pendingFeeRecipient != address(0)) emit FeeRecipientProposalCancelled();
        pendingFeeRecipient = proposed_;
        emit FeeRecipientProposed(proposed_);
    }

    function acceptFeeRecipient() external {
        if (pendingFeeRecipient == address(0)) revert PositionFactoryNoPendingRecipient();
        if (msg.sender != pendingFeeRecipient) revert PositionFactoryNotPendingRecipient();
        address old          = platformFeeRecipient;
        platformFeeRecipient = pendingFeeRecipient;
        pendingFeeRecipient  = address(0);
        emit FeeRecipientUpdated(old, platformFeeRecipient);
    }

    function cancelPendingFeeRecipient() external onlyOwner {
        if (pendingFeeRecipient == address(0)) revert PositionFactoryNoPendingRecipient();
        pendingFeeRecipient = address(0);
        emit FeeRecipientProposalCancelled();
    }

    function deployPosition() external nonReentrant whenNotPaused returns (address positionProxy) {
        address[] storage userPos = userPositions[msg.sender];
        if (userPos.length >= maxPositionsPerUser)    revert PositionFactoryMaxPositionsReached();
        if (allPositions.length >= maxTotalPositions) revert PositionFactoryGlobalMaxPositionsReached();

        uint256 nextIndex = ++totalPositionsEverDeployed;

        positionProxy = address(
            new BeaconProxy(
                beacon,
                abi.encodeCall(Position.initialize, (msg.sender, platformFeeRecipient, nextIndex))
            )
        );

        if (Position(positionProxy).owner() != msg.sender) revert PositionFactoryProxyInitFailed();
        if (protocolAgent != address(0)) {
            try Position(positionProxy).setKeeperFromFactory(protocolAgent) {}
            catch { revert PositionFactoryAgentSetFailed(); }
        }

        userPos.push(positionProxy);
        allPositions.push(positionProxy);
        positionToOwner[positionProxy]      = msg.sender;
        isRegisteredPosition[positionProxy] = true;
        emit PositionDeployed(msg.sender, positionProxy, nextIndex, platformFeeRecipient, block.timestamp);
    }

    function syncPositionOwner(address proxy_) external {
        if (msg.sender != proxy_)          revert PositionFactoryUnauthorized();
        if (!isRegisteredPosition[proxy_]) revert PositionFactoryUnregisteredPosition();

        address currentOwner = Position(proxy_).owner();
        if (currentOwner == address(0)) revert PositionFactoryZeroAddress();

        address recordedOwner = positionToOwner[proxy_];
        if (recordedOwner == address(0)) revert PositionFactoryZeroAddress();
        if (currentOwner == recordedOwner) return;

        if (userPositions[currentOwner].length >= maxPositionsPerUser)
            revert PositionFactoryRecipientAtMaxPositions(currentOwner, maxPositionsPerUser);

        address[] storage oldPosList = userPositions[recordedOwner];
        uint256 len  = oldPosList.length;
        bool found   = false;
        for (uint256 i = 0; i < len;) {
            if (oldPosList[i] == proxy_) {
                oldPosList[i] = oldPosList[len - 1];
                oldPosList.pop();
                found = true;
                break;
            }
            unchecked { ++i; }
        }
        if (!found) revert PositionFactoryProxyNotFound();

        userPositions[currentOwner].push(proxy_);
        positionToOwner[proxy_] = currentOwner;
        emit PositionOwnerSynced(proxy_, recordedOwner, currentOwner);
    }

    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    function rescueETH() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert PositionFactoryZeroBalance();
        address to = owner();
        payable(to).sendValue(balance);
        emit ETHRescued(to, balance);
    }

    function rescueTokens(address token_, uint256 amount_) external onlyOwner nonReentrant {
        if (token_ == address(0)) revert PositionFactoryZeroAddress();
        if (amount_ == 0)         revert PositionFactoryZeroAmount();
        if (IERC20(token_).balanceOf(address(this)) < amount_)
            revert PositionFactoryInsufficientTokenBalance();
        address to = owner();
        IERC20(token_).safeTransfer(to, amount_);
        emit TokensRescued(token_, to, amount_);
    }

    function getUserPositions(address user_) external view returns (address[] memory) {
        return userPositions[user_];
    }

    function getUserPositionCount(address user_) external view returns (uint256) {
        return userPositions[user_].length;
    }

    function getLatestUserPosition(address user_) external view returns (address) {
        uint256 len = userPositions[user_].length;
        if (len == 0) revert PositionFactoryNoPositionsDeployed();
        return userPositions[user_][len - 1];
    }

    function isUserPosition(address user_, address proxy_) external view returns (bool) {
        return isRegisteredPosition[proxy_] && positionToOwner[proxy_] == user_;
    }

    function getPositionOwner(address proxy_) external view returns (address) {
        return positionToOwner[proxy_];
    }

    function getPositionByIndex(address user_, uint256 index_) external view returns (address) {
        address[] storage positions = userPositions[user_];
        if (index_ >= positions.length) revert PositionFactoryInvalidIndex();
        return positions[index_];
    }

    function getPositionDetails(address proxy_) external view returns (PositionSummary memory summary) {
        if (!isRegisteredPosition[proxy_]) revert PositionFactoryUnregisteredPosition();
        Position pos          = Position(proxy_);
        summary.proxyAddress  = proxy_;
        summary.owner         = positionToOwner[proxy_];
        summary.positionIndex = pos.positionIndex();
        summary.status        = pos.status();
        summary.label         = pos.label();
        summary.tier          = pos.tier();
    }

    function getUserPositionsSummary(address user_, uint256 offset_, uint256 limit_)
        external view returns (PositionSummary[] memory summaries, uint256 total)
    {
        if (limit_ > MAX_BATCH_SIZE) limit_ = MAX_BATCH_SIZE;
        address[] storage positions = userPositions[user_];
        total = positions.length;
        if (offset_ >= total || limit_ == 0) return (new PositionSummary[](0), total);
        uint256 available = total - offset_;
        uint256 count     = limit_ >= available ? available : limit_;
        uint256 end       = offset_ + count;
        summaries         = new PositionSummary[](count);
        for (uint256 i = offset_; i < end;) {
            address proxy = positions[i];
            Position pos  = Position(proxy);
            summaries[i - offset_] = PositionSummary({
                proxyAddress:  proxy,
                owner:         positionToOwner[proxy],
                positionIndex: pos.positionIndex(),
                status:        pos.status(),
                label:         pos.label(),
                tier:          pos.tier()
            });
            unchecked { ++i; }
        }
    }

    function getAllPositions(uint256 offset_, uint256 limit_)
        external view returns (address[] memory result, uint256 total)
    {
        if (limit_ > MAX_BATCH_SIZE) limit_ = MAX_BATCH_SIZE;
        total = allPositions.length;
        if (offset_ >= total || limit_ == 0) return (new address[](0), total);
        uint256 available = total - offset_;
        uint256 count     = limit_ >= available ? available : limit_;
        uint256 end       = offset_ + count;
        result            = new address[](count);
        for (uint256 i = offset_; i < end;) {
            result[i - offset_] = allPositions[i];
            unchecked { ++i; }
        }
    }

    function getTotalPositions() external view returns (uint256) {
        return allPositions.length;
    }
}