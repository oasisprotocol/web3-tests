pragma solidity ^0.5.0;

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

interface CoreI {
    function precommit() external returns (bytes32);

    function openKernelHash() external returns (bytes32);

    function minimumValidatorCount() external returns (uint256);

    function joinDuringCreation(address _validator)
        external
        returns(uint256 validatorCount_, uint256 minValidatorCount_);

    function join(address _validator) external;

    function logout(address _validator) external;

    function openMetablock(
        uint256 _committedDynasty,
        uint256 _committedAccumulatedGas,
        uint256 _committedSourceBlockHeight,
        uint256 _deltaGasTarget
    )
        external;

    function hashMetablock(
        bytes32 _kernelHash,
        bytes32 _originObservation,
        uint256 _dynasty,
        uint256 _accumulatedGas,
        bytes32 _committeeLock,
        bytes32 _source,
        bytes32 _target,
        uint256 _sourceBlockHeight,
        uint256 _targetBlockHeight
    )
        external
        view
        returns (bytes32 metablockHash_);
}

