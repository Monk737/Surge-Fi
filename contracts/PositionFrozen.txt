// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {IVault, IERC20 as BalancerIERC20} from "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import {IFlashLoanRecipient} from "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {DataTypes} from "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";
import {ReserveConfiguration} from "@aave/core-v3/contracts/protocol/libraries/configuration/ReserveConfiguration.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

interface IWETH {
    function deposit() external payable;
}

interface IV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IPositionFactory {
    function syncPositionOwner(address proxy) external;
}

interface IAToken {
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}


interface IPoolAddressesProvider {
    function getPriceOracle() external view returns (address);
}

interface IPriceOracleGetter {
    function getAssetPrice(address asset) external view returns (uint256);
}

interface IERC20Decimals {
    function decimals() external view returns (uint8);
}

contract PositionFrozen is Initializable, IFlashLoanRecipient, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    using Address for address payable;
    using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

    error PositionFrozenProtocolFrozen();
    error PositionFrozenNotOwner();
    error PositionFrozenNotBalancerVault();
    error PositionFrozenUnauthorizedFlashLoan();
    error PositionFrozenInvalidAddress();
    error PositionFrozenZeroAmount();
    error PositionFrozenFeeTooHigh();
    error PositionFrozenHealthFactorTooLow(uint256 current, uint256 minimum);
    error PositionFrozenNoDebtToClose();
    error PositionFrozenInvalidPoolFee();
    error PositionFrozenInvalidIndex();
    error PositionFrozenNotActive();
    error PositionFrozenCannotChangeTierWhileActive();
    error PositionFrozenInvalidFlashLoanCallback();
    error PositionFrozenUnexpectedFlashLoanToken(address got, address expected);
    error PositionFrozenUnexpectedFlashFee(uint256 fee);
    error PositionFrozenOpenPositionFrozen();
    error PositionFrozenFlashLoanFailed();
    error PositionFrozenUnauthorized();
    error PositionFrozenNoPendingOwner();
    error PositionFrozenNotPendingOwner();
    error PositionFrozenAlreadyPending();
    error PositionFrozenOwnerSyncFailed();
    error PositionFrozenTransferTimelockNotExpired(uint256 unlockTime, uint256 currentTime);
    error PositionFrozenCannotTransferWhileActive();
    error PositionFrozenCannotWithdrawAToken();
    error PositionFrozenNotAuthorized2();
    error PositionFrozenKeeperLockedWhileActive();
    error PositionFrozenCapitalBelowAgentMinimum();
    error PositionFrozenFeeModeStandardRequiresNoKeeper();
    error PositionFrozenFeeModeAgentRequiresKeeper();
    error PositionFrozenInvalidLTV();

    address public immutable WETH_ADDRESS;
    address public immutable VAULT;
    address public immutable AAVE_POOL_ADDRESS;
    address public immutable ROUTER;
    uint256 public immutable PROTOCOL_FEE_OPEN_STANDARD_BPS;
    uint256 public immutable PROTOCOL_FEE_CLOSE_STANDARD_BPS;
    uint256 private constant AGENT_MIN_USD_CENTS = 20_000;

    uint256 private constant BPS_DENOMINATOR            = 10_000;
    uint256 public constant MAX_PROTOCOL_FEE_BPS        = 1_500;
    uint256 public constant HF_CRITICAL_POINT           = 950_000_000_000_000_000;
    uint256 public constant HF_LIQUIDATION_POINT        = 1_000_000_000_000_000_000;
    uint256 public constant HF_MINIMUM_ADVANCED         = 1_100_000_000_000_000_000;
    uint256 public constant HF_MINIMUM_STANDARD         = 1_250_000_000_000_000_000;
    uint256 public constant HF_SAFE_ZONE                = 1_500_000_000_000_000_000;
    uint256 public constant HF_MINIMUM_CONSERVATIVE     = HF_SAFE_ZONE;
    uint256 public constant LEVERAGE_1X                 = 1_000_000_000_000_000_000;
    uint256 public constant OWNERSHIP_TRANSFER_TIMELOCK = 24 hours;
    uint256 public constant FLASH_LOAN_BUFFER_BPS       = 10;

    enum PositionStatus { EMPTY, ACTIVE, IDLE }
    enum PositionTier   { STANDARD, CONSERVATIVE, ADVANCED }

    /// @notice Management + gas tier chosen EXPLICITLY by the position owner at openPosition().
    /// STANDARD      — 2% open /  5% close profit. No AI agent. keeper must be address(0).
    /// AGENT         — 5% open / 10% close profit. AI agent monitors; plain EOA executes.
    /// AGENT_GASLESS — 10% open/ 15% close profit. AI agent monitors; 0xGasless executes (gas sponsored).
    enum FeeMode { STANDARD, AGENT }
    enum RiskLevel      { SAFE, WARNING, CRITICAL, LIQUIDATABLE }

    address public owner;
    address public feeRecipient;
    uint256 public positionIndex;
    PositionStatus public status;
    bytes32 public label;
    bool private _flashLoanInitiated;
    PositionTier public tier;
    address public factory;
    address public pendingOwner;
    uint256 public ownershipTransferUnlockTime;
    address public keeper;
    FeeMode public feeMode;
    uint16  public agentCloseBps;

    uint256[41] private __gap;

    struct OpenParams {
        address assetToSupply;
        address assetToBorrow;
        uint256 assetToBorrowAmount;
        uint256 expectedSwapAmount;
        uint24  poolFee;
    }

    struct CloseParams {
        address assetToWithdraw;
        address assetToRepay;
        uint256 minProfit;
        uint24  poolFee;
    }

    struct PositionData {
        uint256 totalCollateralBase;
        uint256 totalDebtBase;
        uint256 availableBorrowsBase;
        uint256 currentLiquidationThreshold;
        uint256 ltv;
        uint256 healthFactor;
        RiskLevel riskLevel;
        uint256 maxLiquidatablePercent;
        uint256 positionIndex;
        PositionStatus status;
        bytes32 label;
        PositionTier tier;
    }

    struct OwnershipTransferState {
        address pendingOwner;
        uint256 unlockTime;
        uint256 secondsRemaining;
        bool isActive;
        bool isExecutable;
    }

    event PositionClosed(address indexed owner, uint256 indexed positionIndex, address assetRepaid, uint256 netProfit);
    event ProtocolFeeCollected(address indexed token, uint256 amount, bool isOpen);
    event FundsDeposited(address indexed token, uint256 amount);
    event FundsWithdrawn(address indexed token, uint256 amount);
    event ETHWithdrawn(uint256 amount);
    event ETHReceived(address indexed sender, uint256 amount);
    event EmergencyDeficitCovered(address indexed token, uint256 deficit);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event LabelUpdated(bytes32 indexed label);
    event TierUpdated(PositionTier indexed oldTier, PositionTier indexed newTier);
    event OwnershipTransferProposed(address indexed proposed, uint256 unlockTime, PositionStatus positionStatus);
    event OwnershipTransferCancelled();
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event DebtRepaid(address indexed token, uint256 repaid);
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address weth_,
        address vault_,
        address aavePool_,
        address router_,
        uint256 feeOpenStandardBps_,
        uint256 feeCloseStandardBps_
    ) {
        _disableInitializers();
        if (weth_ == address(0) || vault_ == address(0) || aavePool_ == address(0) || router_ == address(0))
            revert PositionFrozenInvalidAddress();
        if (feeOpenStandardBps_ > MAX_PROTOCOL_FEE_BPS ||
            feeCloseStandardBps_ > MAX_PROTOCOL_FEE_BPS)
            revert PositionFrozenFeeTooHigh();
        WETH_ADDRESS                     = weth_;
        VAULT                            = vault_;
        AAVE_POOL_ADDRESS                = aavePool_;
        ROUTER                           = router_;
        PROTOCOL_FEE_OPEN_STANDARD_BPS   = feeOpenStandardBps_;
        PROTOCOL_FEE_CLOSE_STANDARD_BPS  = feeCloseStandardBps_;
    }

    function initialize(
        address owner_,
        address feeRecipient_,
        uint256 positionIndex_
    ) public initializer {
        if (owner_ == address(0) || feeRecipient_ == address(0)) revert PositionFrozenInvalidAddress();
        if (positionIndex_ == 0) revert PositionFrozenInvalidIndex();
        __ReentrancyGuard_init();
        owner         = owner_;
        feeRecipient  = feeRecipient_;
        positionIndex = positionIndex_;
        status        = PositionStatus.EMPTY;
        tier          = PositionTier.STANDARD;
        factory       = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert PositionFrozenNotOwner();
        _;
    }

    modifier onlyOwnerOrKeeper() {
        if (msg.sender != owner && msg.sender != keeper) revert PositionFrozenNotAuthorized2();
        _;
    }

    function proposeOwnershipTransfer(address newOwner_) external onlyOwner {
        if (status == PositionStatus.ACTIVE) revert PositionFrozenCannotTransferWhileActive();
        if (
            newOwner_ == address(0) ||
            newOwner_ == owner       ||
            newOwner_ == factory     ||
            newOwner_ == address(this)
        ) revert PositionFrozenInvalidAddress();
        if (newOwner_ == pendingOwner) revert PositionFrozenAlreadyPending();
        if (pendingOwner != address(0)) emit OwnershipTransferCancelled();
        pendingOwner                = newOwner_;
        ownershipTransferUnlockTime = block.timestamp + OWNERSHIP_TRANSFER_TIMELOCK;
        emit OwnershipTransferProposed(newOwner_, ownershipTransferUnlockTime, status);
    }

    function acceptOwnership() external nonReentrant {
        if (pendingOwner == address(0)) revert PositionFrozenNoPendingOwner();
        if (msg.sender != pendingOwner)  revert PositionFrozenNotPendingOwner();
        if (block.timestamp < ownershipTransferUnlockTime)
            revert PositionFrozenTransferTimelockNotExpired(ownershipTransferUnlockTime, block.timestamp);
        if (status == PositionStatus.ACTIVE) revert PositionFrozenCannotTransferWhileActive();

        address oldOwner_       = owner;
        address newOwner_       = pendingOwner;
        uint256 savedUnlockTime = ownershipTransferUnlockTime;

        owner                       = newOwner_;
        pendingOwner                = address(0);
        ownershipTransferUnlockTime = 0;

        try IPositionFactory(factory).syncPositionOwner(address(this)) {
            emit OwnershipTransferred(oldOwner_, newOwner_);
        } catch {
            owner                       = oldOwner_;
            pendingOwner                = newOwner_;
            ownershipTransferUnlockTime = savedUnlockTime;
            revert PositionFrozenOwnerSyncFailed();
        }
    }

    function cancelOwnershipTransfer() external onlyOwner {
        if (pendingOwner == address(0)) revert PositionFrozenNoPendingOwner();
        pendingOwner                = address(0);
        ownershipTransferUnlockTime = 0;
        emit OwnershipTransferCancelled();
    }


    function setKeeper(address keeper_) external onlyOwner {
        if (status == PositionStatus.ACTIVE) revert PositionFrozenKeeperLockedWhileActive();
        if (keeper_ == address(this) || keeper_ == factory) revert PositionFrozenInvalidAddress();
        address old = keeper;
        keeper = keeper_;
        emit KeeperUpdated(old, keeper_);
    }

    function setKeeperFromFactory(address keeper_) external {
        if (msg.sender != factory) revert PositionFrozenUnauthorized();
        if (status == PositionStatus.ACTIVE) revert PositionFrozenKeeperLockedWhileActive();
        if (keeper_ == address(this)) revert PositionFrozenInvalidAddress();
        address old = keeper;
        keeper = keeper_;
        emit KeeperUpdated(old, keeper_);
    }
    function getOwnershipTransferState() external view returns (OwnershipTransferState memory state) {
        state.pendingOwner = pendingOwner;
        state.unlockTime   = ownershipTransferUnlockTime;
        state.isActive     = pendingOwner != address(0);
        if (state.isActive && block.timestamp < ownershipTransferUnlockTime) {
            state.secondsRemaining = ownershipTransferUnlockTime - block.timestamp;
            state.isExecutable     = false;
        } else {
            state.secondsRemaining = 0;
            state.isExecutable     = state.isActive;
        }
    }

    function openPosition(OpenParams calldata, uint256, FeeMode) external pure {
        revert PositionFrozenProtocolFrozen();
    }

    function closePosition(CloseParams calldata) external pure {
        revert PositionFrozenProtocolFrozen();
    }

    function emergencyClose(
        address assetToWithdraw_,
        address assetToRepay_,
        uint24  poolFee_,
        uint256 minOut_
    ) external onlyOwnerOrKeeper nonReentrant {
        if (status != PositionStatus.ACTIVE) revert PositionFrozenNotActive();
        if (assetToWithdraw_ == address(0) || assetToRepay_ == address(0))
            revert PositionFrozenInvalidAddress();
        if (assetToWithdraw_ == assetToRepay_) revert PositionFrozenInvalidAddress();
        _validatePoolFee(poolFee_);

        uint256 debt        = getDebt(assetToRepay_);
        if (debt == 0)      revert PositionFrozenNoDebtToClose();
        uint256 flashAmount = (debt * (BPS_DENOMINATOR + FLASH_LOAN_BUFFER_BPS)) / BPS_DENOMINATOR;

        CloseParams memory cp = CloseParams({
            assetToWithdraw: assetToWithdraw_,
            assetToRepay:    assetToRepay_,
            minProfit:       minOut_,
            poolFee:         poolFee_
        });

        _flashLoanInitiated            = true;
        BalancerIERC20[] memory tokens = new BalancerIERC20[](1);
        tokens[0]                      = BalancerIERC20(assetToRepay_);
        uint256[] memory amounts       = new uint256[](1);
        amounts[0]                     = flashAmount;

        try IVault(VAULT).flashLoan(
            this,
            tokens,
            amounts,
            abi.encode(false, true, abi.encode(cp), uint256(0))
        ) {
        } catch {
            _flashLoanInitiated = false;
            revert PositionFrozenFlashLoanFailed();
        }
    }

    function repayDebt(address asset_, uint256 amount_) external onlyOwner nonReentrant {
        if (asset_ == address(0)) revert PositionFrozenInvalidAddress();
        if (amount_ == 0)         revert PositionFrozenZeroAmount();
        uint256 balBefore = IERC20(asset_).balanceOf(address(this));
        IERC20(asset_).safeTransferFrom(msg.sender, address(this), amount_);
        uint256 received  = IERC20(asset_).balanceOf(address(this)) - balBefore;
        if (received == 0) revert PositionFrozenZeroAmount();
        IERC20(asset_).forceApprove(AAVE_POOL_ADDRESS, received);
        uint256 repaid = IPool(AAVE_POOL_ADDRESS).repay(asset_, received, 2, address(this));
        IERC20(asset_).forceApprove(AAVE_POOL_ADDRESS, 0);
        if (received > repaid) {
            IERC20(asset_).safeTransfer(msg.sender, received - repaid);
        }

        (, uint256 totalDebtBase, , , , ) = IPool(AAVE_POOL_ADDRESS).getUserAccountData(address(this));
        if (totalDebtBase == 0 && status == PositionStatus.ACTIVE) {
            status = PositionStatus.IDLE;
        }

        emit DebtRepaid(asset_, repaid);
    }

    function receiveFlashLoan(
        BalancerIERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        if (msg.sender != VAULT)          revert PositionFrozenNotBalancerVault();
        if (!_flashLoanInitiated)          revert PositionFrozenUnauthorizedFlashLoan();
        if (tokens.length != 1 || amounts.length != 1 || feeAmounts.length != 1)
            revert PositionFrozenInvalidFlashLoanCallback();
        _flashLoanInitiated = false;
        if (feeAmounts[0] != 0) revert PositionFrozenUnexpectedFlashFee(feeAmounts[0]);

        (bool isOpen, bool isEmergency, bytes memory encodedParams, ) =
            abi.decode(userData, (bool, bool, bytes, uint256));

        if (isOpen || !isEmergency) revert PositionFrozenOpenPositionFrozen();

        CloseParams memory params = abi.decode(encodedParams, (CloseParams));

        if (params.assetToRepay == address(0) || params.assetToWithdraw == address(0))
            revert PositionFrozenInvalidAddress();
        if (address(tokens[0]) != params.assetToRepay)
            revert PositionFrozenUnexpectedFlashLoanToken(address(tokens[0]), params.assetToRepay);

        address _feeRecipient = feeRecipient;
        address _owner        = owner;
        uint256 _posIdx       = positionIndex;
        uint256 flashAmount   = amounts[0];

        (uint256 amountReceived, uint256 residualBuffer) = _close(params, flashAmount);

        uint256 repayToVault = flashAmount;
        uint256 recovered    = amountReceived + residualBuffer;

        if (recovered < repayToVault) {
            uint256 deficit = repayToVault - recovered;
            IERC20(params.assetToRepay).safeTransferFrom(_owner, address(this), deficit);
            emit EmergencyDeficitCovered(params.assetToRepay, deficit);
        }

        IERC20(params.assetToRepay).safeTransfer(VAULT, repayToVault);

        uint256 grossProfit = 0;
        uint256 protocolFee = 0;
        if (recovered > repayToVault) {
            unchecked { grossProfit = recovered - repayToVault; }
            uint256 feeCloseBps;
            if (feeMode == FeeMode.STANDARD) feeCloseBps = PROTOCOL_FEE_CLOSE_STANDARD_BPS;
            else                              feeCloseBps = uint256(agentCloseBps); // tier-locked at openPosition
            protocolFee = (grossProfit * feeCloseBps) / BPS_DENOMINATOR;
            if (protocolFee > 0) {
                IERC20(params.assetToRepay).safeTransfer(_feeRecipient, protocolFee);
                emit ProtocolFeeCollected(params.assetToRepay, protocolFee, false);
            }
        }

        uint256 netProfit;
        unchecked { netProfit = grossProfit - protocolFee; }
        if (netProfit > 0) IERC20(params.assetToRepay).safeTransfer(_owner, netProfit);
        emit PositionClosed(_owner, _posIdx, params.assetToRepay, netProfit);
    }

    function setLabel(bytes32 label_) external onlyOwner {
        label = label_;
        emit LabelUpdated(label_);
    }

    function setTier(PositionTier tier_) external onlyOwner {
        if (status == PositionStatus.ACTIVE) revert PositionFrozenCannotChangeTierWhileActive();
        PositionTier oldTier = tier;
        if (oldTier == tier_) return;
        tier = tier_;
        emit TierUpdated(oldTier, tier_);
    }

    function updateFeeRecipient(address newRecipient_) external {
        if (msg.sender != factory)       revert PositionFrozenUnauthorized();
        if (newRecipient_ == address(0)) revert PositionFrozenInvalidAddress();
        address old = feeRecipient;
        if (old == newRecipient_) return;
        feeRecipient = newRecipient_;
        emit FeeRecipientUpdated(old, newRecipient_);
    }

    function supplyToAave(address asset_, uint256 amount_) external onlyOwner nonReentrant {
        if (asset_ == address(0)) revert PositionFrozenInvalidAddress();
        if (amount_ == 0)         revert PositionFrozenZeroAmount();
        uint256 balBefore = IERC20(asset_).balanceOf(address(this));
        IERC20(asset_).safeTransferFrom(msg.sender, address(this), amount_);
        uint256 received  = IERC20(asset_).balanceOf(address(this)) - balBefore;
        if (received == 0) revert PositionFrozenZeroAmount();
        _supply(asset_, received);
        emit FundsDeposited(asset_, received);
    }

    function withdrawFromAave(address asset_, uint256 amount_)
        external onlyOwner nonReentrant returns (uint256 withdrawn)
    {
        if (asset_ == address(0)) revert PositionFrozenInvalidAddress();
        if (amount_ == 0)         revert PositionFrozenZeroAmount();
        withdrawn = _withdraw(asset_, amount_);
        if (withdrawn == 0) revert PositionFrozenZeroAmount();
        _enforceHFIfDebtExists();
        IERC20(asset_).safeTransfer(msg.sender, withdrawn);
        emit FundsWithdrawn(asset_, withdrawn);
    }

    function withdrawETH() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        if (bal == 0) revert PositionFrozenZeroAmount();
        payable(owner).sendValue(bal);
        emit ETHWithdrawn(bal);
    }

    function withdrawTokens(address token_, uint256 amount_) external onlyOwner nonReentrant {
        if (token_ == address(0)) revert PositionFrozenInvalidAddress();
        if (amount_ == 0)         revert PositionFrozenZeroAmount();
        try IAToken(token_).UNDERLYING_ASSET_ADDRESS() returns (address) {
            revert PositionFrozenCannotWithdrawAToken();
        } catch {}
        _enforceHFIfDebtExists();
        IERC20(token_).safeTransfer(owner, amount_);
        emit FundsWithdrawn(token_, amount_);
    }

    function getWETH() external payable onlyOwner nonReentrant {
        if (msg.value == 0) revert PositionFrozenZeroAmount();
        IWETH(WETH_ADDRESS).deposit{value: msg.value}();
        emit FundsDeposited(WETH_ADDRESS, msg.value);
    }

    function _close(CloseParams memory params, uint256 flashAmount)
        internal returns (uint256 amountReceived, uint256 residualBuffer)
    {
        uint256 actualRepaid = _repay(params.assetToRepay);
        residualBuffer       = flashAmount > actualRepaid ? flashAmount - actualRepaid : 0;
        uint256 collateral   = _withdraw(params.assetToWithdraw, type(uint256).max);
        if (collateral == 0) revert PositionFrozenZeroAmount();
        amountReceived = _swap(
            params.assetToWithdraw,
            params.assetToRepay,
            collateral,
            params.minProfit,
            params.poolFee
        );
        status = PositionStatus.IDLE;
    }

    function _validatePoolFee(uint24 fee_) internal pure {
        if (fee_ != 100 && fee_ != 500 && fee_ != 3000 && fee_ != 10000)
            revert PositionFrozenInvalidPoolFee();
    }

    function _swap(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_,
        uint256 amountOutMin_,
        uint24  fee_
    ) internal returns (uint256 amountOut) {
        IERC20(tokenIn_).forceApprove(ROUTER, amountIn_);
        amountOut = IV3SwapRouter(ROUTER).exactInputSingle(
            IV3SwapRouter.ExactInputSingleParams({
                tokenIn:           tokenIn_,
                tokenOut:          tokenOut_,
                fee:               fee_,
                recipient:         address(this),
                amountIn:          amountIn_,
                amountOutMinimum:  amountOutMin_,
                sqrtPriceLimitX96: 0
            })
        );
        IERC20(tokenIn_).forceApprove(ROUTER, 0);
    }

    function _supply(address asset_, uint256 amount_) internal {
        IERC20(asset_).forceApprove(AAVE_POOL_ADDRESS, amount_);
        IPool(AAVE_POOL_ADDRESS).supply(asset_, amount_, address(this), 0);
        IERC20(asset_).forceApprove(AAVE_POOL_ADDRESS, 0);
    }

    function _repay(address asset_) internal returns (uint256 repaid) {
        IERC20(asset_).forceApprove(AAVE_POOL_ADDRESS, type(uint256).max);
        repaid = IPool(AAVE_POOL_ADDRESS).repay(asset_, type(uint256).max, 2, address(this));
        IERC20(asset_).forceApprove(AAVE_POOL_ADDRESS, 0);
    }

    function _withdraw(address asset_, uint256 amount_) internal returns (uint256 withdrawn) {
        withdrawn = IPool(AAVE_POOL_ADDRESS).withdraw(asset_, amount_, address(this));
    }

    function _tierMinimumHF() internal view returns (uint256) {
        PositionTier t = tier;
        if (t == PositionTier.CONSERVATIVE) return HF_MINIMUM_CONSERVATIVE;
        if (t == PositionTier.ADVANCED)     return HF_MINIMUM_ADVANCED;
        return HF_MINIMUM_STANDARD;
    }

    function _enforceHFIfDebtExists() internal view {
        (, uint256 totalDebtBase, , , , uint256 hf) =
            IPool(AAVE_POOL_ADDRESS).getUserAccountData(address(this));
        if (totalDebtBase > 0) {
            uint256 minHF = _tierMinimumHF();
            if (hf < minHF) revert PositionFrozenHealthFactorTooLow(hf, minHF);
        }
    }

    function checkEmergencyApproval(address assetToRepay_)
        external view returns (bool sufficient, uint256 currentDebt, uint256 ownerAllowance)
    {
        if (assetToRepay_ == address(0)) revert PositionFrozenInvalidAddress();
        currentDebt    = getDebt(assetToRepay_);
        uint256 needed = currentDebt > 0
            ? (currentDebt * (BPS_DENOMINATOR + FLASH_LOAN_BUFFER_BPS)) / BPS_DENOMINATOR
            : 0;
        ownerAllowance = IERC20(assetToRepay_).allowance(owner, address(this));
        sufficient     = ownerAllowance >= needed;
    }

    function getHealthFactor() public view returns (uint256) {
        (, , , , , uint256 hf) = IPool(AAVE_POOL_ADDRESS).getUserAccountData(address(this));
        return hf;
    }

    function getLiquidationRisk() public view returns (RiskLevel) {
        uint256 hf = getHealthFactor();
        if (hf < HF_LIQUIDATION_POINT) return RiskLevel.LIQUIDATABLE;
        if (hf < _tierMinimumHF())      return RiskLevel.CRITICAL;
        if (hf < HF_SAFE_ZONE)          return RiskLevel.WARNING;
        return RiskLevel.SAFE;
    }

    function getMaxLiquidatablePercent() public view returns (uint256) {
        uint256 hf = getHealthFactor();
        if (hf >= HF_LIQUIDATION_POINT) return 0;
        if (hf <= HF_CRITICAL_POINT)    return 100;
        return 50;
    }

    function isLiquidatable() public view returns (bool) {
        return getHealthFactor() < HF_LIQUIDATION_POINT;
    }

    function getTierMinimumHF() external view returns (uint256) {
        return _tierMinimumHF();
    }

    function getFullPositionData() public view returns (PositionData memory data) {
        (
            data.totalCollateralBase,
            data.totalDebtBase,
            data.availableBorrowsBase,
            data.currentLiquidationThreshold,
            data.ltv,
            data.healthFactor
        ) = IPool(AAVE_POOL_ADDRESS).getUserAccountData(address(this));

        uint256 hf    = data.healthFactor;
        uint256 hfMin = _tierMinimumHF();

        if      (hf < HF_LIQUIDATION_POINT) data.riskLevel = RiskLevel.LIQUIDATABLE;
        else if (hf < hfMin)                 data.riskLevel = RiskLevel.CRITICAL;
        else if (hf < HF_SAFE_ZONE)          data.riskLevel = RiskLevel.WARNING;
        else                                  data.riskLevel = RiskLevel.SAFE;

        if      (hf >= HF_LIQUIDATION_POINT) data.maxLiquidatablePercent = 0;
        else if (hf <= HF_CRITICAL_POINT)    data.maxLiquidatablePercent = 100;
        else                                  data.maxLiquidatablePercent = 50;

        data.positionIndex = positionIndex;
        data.status        = status;
        data.label         = label;
        data.tier          = tier;
    }

    function getRequiredApproval(address asset_, uint256 initialCapital_)
        external view returns (uint256 approvalAmount, uint256 platformFee)
    {
        uint256 feeBps;
        if (keeper != address(0)) {
            uint256 usdCents = _getUsdCents(asset_, initialCapital_);
            (feeBps, ) = _getAgentFeeTier(usdCents);
        } else {
            feeBps = PROTOCOL_FEE_OPEN_STANDARD_BPS;
        }
        platformFee    = (initialCapital_ * feeBps) / BPS_DENOMINATOR;
        approvalAmount = initialCapital_ + platformFee;
    }

    function getMaxFlashLoan(address assetToSupply_, uint256 initialCapital_)
        external view returns (
            uint256 maxFlashLoan,
            uint256 safeFlashLoan,
            uint256 maxLeverage,
            uint256 safeLeverage
        )
    {
        if (assetToSupply_ == address(0)) revert PositionFrozenInvalidAddress();
        if (initialCapital_ == 0)         revert PositionFrozenZeroAmount();
        DataTypes.ReserveConfigurationMap memory config =
            IPool(AAVE_POOL_ADDRESS).getConfiguration(assetToSupply_);
        uint256 ltv = config.getLtv();
        uint256 lt  = config.getLiquidationThreshold();
        if (ltv == 0) return (0, 0, LEVERAGE_1X, LEVERAGE_1X);
        if (ltv >= 10_000) revert PositionFrozenInvalidLTV();
        maxFlashLoan = (initialCapital_ * ltv) / (10_000 - ltv);
        maxLeverage  = ((maxFlashLoan + initialCapital_) * 1e18) / initialCapital_;
        uint256 hfTargetBps;
        PositionTier t = tier;
        if      (t == PositionTier.CONSERVATIVE) hfTargetBps = 15_000;
        else if (t == PositionTier.ADVANCED)     hfTargetBps = 11_000;
        else                                      hfTargetBps = 12_500;
        if (hfTargetBps <= lt) return (maxFlashLoan, 0, maxLeverage, LEVERAGE_1X);
        safeFlashLoan = (initialCapital_ * lt) / (hfTargetBps - lt);
        safeLeverage  = ((safeFlashLoan + initialCapital_) * 1e18) / initialCapital_;
    }

    function getFlashLoanBoundsByTier(
        address assetToSupply_,
        uint256 initialCapital_,
        PositionTier tier_
    ) external view returns (uint256 safeFlashLoan, uint256 safeLeverage) {
        if (assetToSupply_ == address(0)) revert PositionFrozenInvalidAddress();
        if (initialCapital_ == 0)         revert PositionFrozenZeroAmount();
        DataTypes.ReserveConfigurationMap memory config =
            IPool(AAVE_POOL_ADDRESS).getConfiguration(assetToSupply_);
        uint256 ltv = config.getLtv();
        uint256 lt  = config.getLiquidationThreshold();
        if (ltv == 0) return (0, LEVERAGE_1X);
        if (ltv >= 10_000) revert PositionFrozenInvalidLTV();
        uint256 hfTargetBps;
        if      (tier_ == PositionTier.CONSERVATIVE) hfTargetBps = 15_000;
        else if (tier_ == PositionTier.ADVANCED)     hfTargetBps = 11_000;
        else                                          hfTargetBps = 12_500;
        if (hfTargetBps <= lt) return (0, LEVERAGE_1X);
        safeFlashLoan = (initialCapital_ * lt) / (hfTargetBps - lt);
        safeLeverage  = ((safeFlashLoan + initialCapital_) * 1e18) / initialCapital_;
    }

    function getAaveLiquidationInfo(address asset_) external view returns (uint256 liquidationBonusBps) {
        if (asset_ == address(0)) revert PositionFrozenInvalidAddress();
        DataTypes.ReserveConfigurationMap memory config =
            IPool(AAVE_POOL_ADDRESS).getConfiguration(asset_);
        uint256 bonus = config.getLiquidationBonus();
        liquidationBonusBps = bonus > 10_000 ? bonus - 10_000 : 0;
    }

    function getTokenBalance(address token_) public view returns (uint256) {
        return IERC20(token_).balanceOf(address(this));
    }

    function getDebt(address token_) public view returns (uint256) {
        if (token_ == address(0)) return 0;
        DataTypes.ReserveData memory reserve = IPool(AAVE_POOL_ADDRESS).getReserveData(token_);
        if (reserve.variableDebtTokenAddress == address(0)) return 0;
        return IERC20(reserve.variableDebtTokenAddress).balanceOf(address(this));
    }

    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    function _getUsdCents(address asset_, uint256 amount_) internal view returns (uint256) {
        address oracleAddr = IPoolAddressesProvider(
            IPool(AAVE_POOL_ADDRESS).ADDRESSES_PROVIDER()
        ).getPriceOracle();
        uint256 price    = IPriceOracleGetter(oracleAddr).getAssetPrice(asset_); // 8 decimals
        uint8   decimals = IERC20Decimals(asset_).decimals();
        // usdCents = amount * price / 10^tokenDecimals / 10^(8-2)
        //          = amount * price / (10^decimals * 1e6)
        return (amount_ * price) / (10 ** uint256(decimals) * 1e6);
    }

    function _getAgentFeeTier(uint256 usdCents_)
        internal pure returns (uint256 openBps, uint256 closeBps)
    {
        if (usdCents_ <  20_000) revert PositionFrozenCapitalBelowAgentMinimum(); // below $200
        if (usdCents_ <= 30_000) return (1_500, 1_500); // $200–$300
        if (usdCents_ <= 40_000) return (1_400, 1_500); // $301–$400
        if (usdCents_ <= 49_999) return (1_300, 1_500); // $401–$499
        if (usdCents_ <= 199_999) return (1_100, 1_500); // $500–$1999
        if (usdCents_ <= 499_999) return (  900, 1_200); // $2000–$4999
        if (usdCents_ <= 999_999) return (  700, 1_200); // $5000–$9999
        return (600, 1_000);                              // $10000+
    }

}