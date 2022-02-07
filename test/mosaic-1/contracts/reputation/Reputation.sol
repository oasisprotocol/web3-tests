pragma solidity >=0.5.0 <0.6.0;

// Copyright 2019 OpenST Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../ERC20I.sol";
import "../consensus/ConsensusModule.sol";
import "../proxies/MasterCopyNonUpgradable.sol";

contract Reputation is MasterCopyNonUpgradable, ConsensusModule {

    /* Usings */

    using SafeMath for uint256;


    /* Constants */

    uint256 public constant MAX_UINT256 = uint256(
        0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
    );

    address public constant burner = address(0);


    /* Enums */

    /** Validator status enum */
    enum ValidatorStatus {
        /** Undefined as null value */
        Undefined,

        /** Validator has been slashed and lost stake and earnings */
        Slashed,

        /** Validator has put up stake and participates in consensus */
        Staked,

        /** Validator has deregistered and no longer participates in consensus */
        Deregistered,

        /** Validator has withdrawn stake after deregistering and cooldown period */
        Withdrawn
    }


    /* Structs */

    struct ValidatorInfo {
        ValidatorStatus status;
        address withdrawalAddress;
        uint256 reputation;
        uint256 lockedEarnings;
        uint256 cashableEarnings;
        uint256 withdrawalBlockHeight;
    }


    /* Storage */

    /** ERC20 mOST for stakes and earnings for validators. */
    ERC20I public mOST;

    /** ERC20 wETH for stakes for validators. */
    ERC20I public wETH;

    /** Required stake amount in mOST to stake as a validator. */
    uint256 public stakeMOSTAmount;

    /** Required stake amount in wETH to stake as a validator. */
    uint256 public stakeWETHAmount;

    /** A per mille of earnings that validator can cash out immediately. */
    uint256 public cashableEarningsPerMille;

    /** An initial reputation for a newly staked validator. */
    uint256 public initialReputation;

    /**
     * A cooldown period for being able to withdraw after a validator
     * has deregistered.
     */
    uint256 public withdrawalCooldownPeriodInBlocks;

    /** Validators info */
    mapping(address => ValidatorInfo) public validators;


    /* Modifiers */

    modifier isActive(address _validator)
    {
        require(
            validators[_validator].status == ValidatorStatus.Staked,
            "Validator is not active."
        );

        _;
    }

    modifier hasStaked(address _validator)
    {
        require(
            validators[_validator].status != ValidatorStatus.Undefined,
            "Validator has not staked."
        );

        _;
    }

    modifier isHonest(address _validator)
    {
        require(
            validators[_validator].status >= ValidatorStatus.Staked,
            "Validator is not honest."
        );

        _;
    }

    modifier hasDeregistered(address _validator)
    {
        require(
            validators[_validator].status >= ValidatorStatus.Deregistered,
            "Validator has not deregistered."
        );

        _;
    }

    modifier withdrawalCooldownPeriodHasElapsed(address _validator)
    {
        require(
            block.number > validators[_validator].withdrawalBlockHeight,
            "Withdrawal cooldown period has not elapsed."
        );

        _;
    }

    modifier hasNotWithdrawn(address _validator)
    {
        require(
            validators[_validator].status != ValidatorStatus.Withdrawn,
            "Validator has withdrawn."
        );

        _;
    }

    modifier hasNotSlashed(address _validator)
    {
        require(
            validators[_validator].status != ValidatorStatus.Slashed,
            "Validator has slashed."
        );

        _;
    }


    /* Special Member Functions */

    /**
     * @dev Function requires:
     *          - mOST token address is not 0
     *          - wETH token address is not 0
     *          - a stake amount to stake in mOST is positive
     *          - a stake amount to stake in wETH is positive
     *          - a cashable earnings per mille is in [0, 1000] range
     *
     * @param _consensus Address of consensus contract.
     * @param _mOST Address of EIP20 mOST token.
     * @param _stakeMOSTAmount Amount of mOST token in wei required to be
     *                         staked by each validator on staking.
     * @param _wETH Address of EIP20 wETH token.
     * @param _stakeWETHAmount Amount of wETH token in wei required to be
     *                         staked by each validator on staking.
     * @param _cashableEarningsPerMille Number ranging from [0-1000] which
     *                                  defines cashable earning per mille.
     * @param _initialReputation Initial reputation assigned when a validator
     *                           stakes.
     * @param _withdrawalCooldownPeriodInBlocks Defines block delay between
     *                                          deregister and withdraw operation
     *                                          for a validator.
     */
    function setup(
        ConsensusI _consensus,
        ERC20I _mOST,
        uint256 _stakeMOSTAmount,
        ERC20I _wETH,
        uint256 _stakeWETHAmount,
        uint256 _cashableEarningsPerMille,
        uint256 _initialReputation,
        uint256 _withdrawalCooldownPeriodInBlocks
    )
        external
    {
        require(
            address(mOST) == address(0) && address(wETH) == address(0),
            "Reputation is already setup."
        );

        require(
            _mOST != ERC20I(0),
            "mOST token address is 0."
        );

        require(
            _wETH != ERC20I(0),
            "wETH token address is 0."
        );

        require(
            _stakeMOSTAmount > 0,
            "Stake amount in mOST is not positive."
        );

        require(
            _stakeWETHAmount > 0,
            "Stake amount in wETH is not positive."
        );

        require(
            _cashableEarningsPerMille <= 1000,
            "Cashable earnings is not in valid range: [0, 1000]."
        );

        require(
            _withdrawalCooldownPeriodInBlocks > 0,
            "Withdrawal cooldown period in blocks must be greater than zero."
        );

        setupConsensus(_consensus);
        mOST = ERC20I(_mOST);
        wETH = ERC20I(_wETH);
        stakeMOSTAmount = _stakeMOSTAmount;
        stakeWETHAmount = _stakeWETHAmount;
        initialReputation = _initialReputation;
        cashableEarningsPerMille = _cashableEarningsPerMille;
        withdrawalCooldownPeriodInBlocks = _withdrawalCooldownPeriodInBlocks;
    }


    /* External Functions */

    /**
     * @notice Increases reputation of a validator by delta.
     *
     * @dev Function requires
     *          - only consensus can call
     *          - the specified validator is active
     *
     * @param _validator A validator for which to increase reputation.
     * @param _delta A change (delta) to increase a validator's reputation.
     *
     * @return Returns an updated reputation.
     */
    function increaseReputation(address _validator, uint256 _delta)
        external
        onlyConsensus
        isActive(_validator)
        returns (uint256)
    {
        ValidatorInfo storage v = validators[_validator];
        v.reputation = v.reputation.add(_delta);

        return v.reputation;
    }

    /**
     * @notice Decreases reputation of a validator by delta.
     *         Sets the validator's reputation to 0 if after operation
     *         it's negative.
     *
     * @dev Function requires:
     *          - only consensus can call
     *          - the specified validator is active
     *
     * @param _validator A validator for which to decrease a reputation.
     * @param _delta A change (delta) to decrease a validator's reputation.
     *
     * @return Returns an updated reputation.
     */
    function decreaseReputation(address _validator, uint256 _delta)
        external
        onlyConsensus
        isActive(_validator)
        returns (uint256)
    {
        ValidatorInfo storage v = validators[_validator];

        if (v.reputation < _delta) {
            v.reputation = 0;
        } else {
            v.reputation = v.reputation.sub(_delta);
        }

        return v.reputation;
    }

    /**
     * @notice Deposits earnings of a validator by the specified amount.
     *         Only fixed per-mille (`cashableEarningsPerMille`) from the
     *         earned amount is cashable by a validator immediately.
     *         The remaining is locked in the contract and can be cashed out
     *         only when the validator has deregistered and cooling period
     *         has elapsed.
     *
     * @dev Function requires:
     *          - a validator is active
     *          - a caller has approved the contract to transfer
     *            `_amount` mOST from its address to the contract address.
     *
     * @param _validator A validator to deposit earnings.
     * @param _amount An amount of earnings of a validator.
     */
    function depositEarnings(
        address _validator,
        uint256 _amount
    )
        external
        isActive(_validator)
    {
        ValidatorInfo storage v = validators[_validator];

        uint256 cashableEarnings = _amount.mul(cashableEarningsPerMille).div(1000);

        v.cashableEarnings = v.cashableEarnings.add(cashableEarnings);

        v.lockedEarnings = v.lockedEarnings.add(
            _amount.sub(cashableEarnings)
        );

        require(
            mOST.transferFrom(msg.sender, address(this), _amount),
            "Failed to transfer earnings to the contract address."
        );
    }

    /**
     * @notice Cash out the specified amount from cashable earnings
     *         of a validator.
     *
     * @dev Function requires:
     *          - only validator can call
     *          - validator has staked
     *          - validator was not slashed
     *          - validator has not withdrawn
     *          - the specified amount is not bigger than cashable earnings
     *            of a validator
     *
     * @param _amount An amount to withdraw.
     */
    function cashOutEarnings(uint256 _amount)
        external
        hasStaked(msg.sender)
        isHonest(msg.sender)
        hasNotWithdrawn(msg.sender)
    {
        ValidatorInfo storage v = validators[msg.sender];

        require(
            _amount <= v.cashableEarnings,
            "The specified amount is bigger than available cashable amount."
        );

        v.cashableEarnings = v.cashableEarnings.sub(
            _amount
        );

        require(
            mOST.transfer(
                v.withdrawalAddress, _amount
            ),
            "Failed to transfer cashable earnings to withdrawal address."
        );
    }

    /**
     * @notice Stakes a validator.
     *
     * @dev Function requires:
     *          - only consensus can call
     *          - a validator address is not 0
     *          - a withdrawal address is not 0
     *          - a validator address is not same as its withdrawal address
     *          - a validator has not staked previously
     *          - a withdrawal address has not been used as a validator address
     *          - a validator approved in mOST token contract to transfer
     *            a stake amount.
     *          - a validator approved in wETH token contract to transfer
     *            a stake amount.
     *
     * @param _validator A validator address to stake.
     * @param _withdrawalAddress A withdrawal address of newly staked validator.
     */
    function stake(
        address _validator,
        address _withdrawalAddress
    )
        external
        onlyConsensus
    {
        require(
            _validator != address(0),
            "Validator address is 0."
        );

        require(
            _withdrawalAddress != address(0),
            "Validator's withdrawal address is 0."
        );

        require(
            _validator != _withdrawalAddress,
            "Validator's address is the same as its withdrawal address."
        );

        require(
            validators[_validator].status == ValidatorStatus.Undefined,
            "No validator can stake again."
        );

        require(
            validators[_withdrawalAddress].status == ValidatorStatus.Undefined,
            "The specified withdrawal address was registered as validator."
        );

        ValidatorInfo storage v = validators[_validator];

        v.status = ValidatorStatus.Staked;
        v.withdrawalAddress = _withdrawalAddress;
        v.reputation = initialReputation;
        v.withdrawalBlockHeight = MAX_UINT256;

        require(
            mOST.transferFrom(_validator, address(this), stakeMOSTAmount),
            "Failed to transfer mOST stake amount from a validator."
        );

        require(
            wETH.transferFrom(_validator, address(this), stakeWETHAmount),
            "Failed to transfer wETH stake amount from a validator."
        );
    }

    /**
     * @notice Slashes validator.
     *
     * @dev Function requires:
     *          - only consensus can call
     *          - a validator has staked
     *          - a validator has not withdrawn
     *
     * @param _validator A validator address to slash.
     */
    function slash(address _validator)
        external
        onlyConsensus
        hasStaked(_validator)
        hasNotWithdrawn(_validator)
        hasNotSlashed(_validator)
    {
        ValidatorInfo storage v = validators[_validator];

        v.status = ValidatorStatus.Slashed;
        uint256 totalmOSTAmountToBurn = v.lockedEarnings
            .add(v.cashableEarnings)
            .add(stakeMOSTAmount);

        v.lockedEarnings = 0;
        v.cashableEarnings = 0;

        assert(mOST.transfer(burner, totalmOSTAmountToBurn));
        assert(wETH.transfer(burner, stakeWETHAmount));
    }

    /**
     * @notice Deregisters a validator.
     *
     * @dev Function requires:
     *          - only consensus can call
     *          - validator is active
     *
     * @param _validator A validator to deregister.
     */
    function deregister(address _validator)
        external
        onlyConsensus
        isActive(_validator)
    {
        ValidatorInfo storage v = validators[_validator];

        v.status = ValidatorStatus.Deregistered;

        v.withdrawalBlockHeight = block.number.add(
            withdrawalCooldownPeriodInBlocks
        );
    }

    /**
     * @notice Withdraws staked and earnings values to a validator.
     *
     * @dev Function requires:
     *          - a validator has deregistered
     *          - a validator was not slashed
     *          - a validator has not withdrawn
     *          - a withdrawal cooling period for the validator has elapsed
     *
     * @param _validator A validator to withdraw earnings and stakes.
     */
    function withdraw(address _validator)
        external
        hasDeregistered(_validator)
        isHonest(_validator)
        hasNotWithdrawn(_validator)
        withdrawalCooldownPeriodHasElapsed(_validator)
    {
        ValidatorInfo storage v = validators[_validator];

        v.status = ValidatorStatus.Withdrawn;

        uint256 lockedEarnings = v.lockedEarnings;
        uint256 cashableEarnings = v.cashableEarnings;

        v.lockedEarnings = 0;
        v.cashableEarnings = 0;

        require(
            mOST.transfer(
                v.withdrawalAddress,
                stakeMOSTAmount.add(
                    lockedEarnings
                ).add(
                    cashableEarnings
                )
            ),
            "Failed to withdraw staked and earned mOST amounts."
        );

        require(
            wETH.transfer(
                v.withdrawalAddress, stakeWETHAmount
            ),
            "Failed to withdraw staked wETH amount."
        );
    }

    /**
     * @notice Returns reputation of a validator.
     *
     * @param _validator An address of a validator.
     */
    function getReputation(address _validator)
        external
        view
        returns (uint256)
    {
        return validators[_validator].reputation;
    }

    /**
     * @notice Check if the validator address is slashed or not.
     *
     * @param _validator An address of a validator.
     * Returns true if the specified address is slashed.
     */
    function isSlashed(address _validator)
        public
        view
        returns(bool)
    {
        return validators[_validator].status == ValidatorStatus.Slashed;
    }
}
