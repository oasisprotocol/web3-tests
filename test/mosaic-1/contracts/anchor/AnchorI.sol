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

interface AnchorI {

    /**
     * @notice Gets the block number of latest committed state root.
     *
     * @return height_ Block height of the latest committed state root.
     */
    function getLatestStateRootBlockHeight()
        external
        view
        returns (uint256 height_);

    /**
     * @notice Get the state root for the given block height.
     *
     * @param _blockHeight The block height for which the state root is fetched.
     *
     * @return bytes32 State root at the given height.
     */
    function getStateRoot(uint256 _blockHeight)
        external
        view
        returns (bytes32 stateRoot_);

    /**
     *  @param _blockHeight Block height of the block to anchor.
     *  @param _stateRoot State root of the block to anchor.
     */
    function anchorStateRoot(
        uint256 _blockHeight,
        bytes32 _stateRoot
    ) external;
}
