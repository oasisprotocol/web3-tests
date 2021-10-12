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

'use strict';

const Axiom = artifacts.require('Axiom');
const Utils = require('../test_lib/utils.js');

const ConsensusSetupParamTypes = 'uint256,uint256,uint256,uint256,uint256,address';
const ReputationSetupParamTypes = 'address,address,uint256,address,uint256,uint256,uint256,uint256';
const CoreSetupParamTypes = 'address,bytes32,uint256,uint256,uint256,address,uint256,bytes32,uint256,uint256,uint256,uint256';
const AnchorSetupParamTypes = 'uint256,address';
const CommitteeSetupParamTypes = 'address,uint256,bytes32,bytes32';

const ConsensusSetupFunctionSignature = `setup(${ConsensusSetupParamTypes})`;
const ReputationSetupFunctionSignature = `setup(${ReputationSetupParamTypes})`;
const AnchorSetupFunctionSignature = `setup(${AnchorSetupParamTypes})`;
const CoreSetupFunctionSignature = `setup(${CoreSetupParamTypes})`;
const CommitteeSetupFunctionSignature = `setup(${CommitteeSetupParamTypes})`;

const ConsensusSetupCallPrefix = Utils.encodeFunctionSignature(ConsensusSetupFunctionSignature);
const ReputationSetupCallPrefix = Utils.encodeFunctionSignature(ReputationSetupFunctionSignature);
const AnchorSetupCallPrefix = Utils.encodeFunctionSignature(AnchorSetupFunctionSignature);
const CoreSetupCallPrefix = Utils.encodeFunctionSignature(CoreSetupFunctionSignature);
const CommitteeSetupCallPrefix = Utils.encodeFunctionSignature(CommitteeSetupFunctionSignature);

async function deployAxiom(
  techGov,
  consensusMasterCopy,
  coreMasterCopy,
  committeeMasterCopy,
  reputationMasterCopy,
  anchorMasterCopy,
  txOptions,
) {
  const axiom = await Axiom.new(
    techGov,
    consensusMasterCopy,
    coreMasterCopy,
    committeeMasterCopy,
    reputationMasterCopy,
    anchorMasterCopy,
    txOptions,
  );
  return axiom;
}

async function deployAxiomWithConfig(config) {
  return deployAxiom(
    config.techGov,
    config.consensusMasterCopy,
    config.coreMasterCopy,
    config.committeeMasterCopy,
    config.reputationMasterCopy,
    config.anchorMasterCopy,
    config.txOptions,
  );
}

async function setupConsensusWithConfig(axiom, config) {
  return axiom.setupConsensus(
    config.committeeSize,
    config.minValidators,
    config.joinLimit,
    config.gasTargetDelta,
    config.coinbaseSplitPermille,
    config.mOST,
    config.stakeMOSTAmount,
    config.wETH,
    config.stakeWETHAmount,
    config.cashableEarningsPerMille,
    config.initialReputation,
    config.withdrawalCooldownPeriodInBlocks,
    config.txOptions,
  );
}

async function newMetaChainWithConfig(axiom, config) {
  return axiom.newMetaChain(
    config.maxStateRoots,
    config.rlpBlockHeader,
    config.txOptions,
  );
}

async function encodeNewCoreParams(coreParams) {
  const callPrefix = await Utils.encodeFunctionSignature(CoreSetupFunctionSignature);
  const callData = await Utils.encodeParameters(
    CoreSetupParamTypes.split(','),
    [
      coreParams.consensus,
      coreParams.metachainId,
      coreParams.epochLength.toString(10),
      coreParams.minValidators.toString(10),
      coreParams.joinLimit.toString(10),
      coreParams.reputation,
      coreParams.height.toString(10),
      coreParams.parent,
      coreParams.gasTarget.toString(10),
      coreParams.dynasty.toString(10),
      coreParams.accumulatedGas.toString(10),
      coreParams.sourceBlockHeight.toString(10),
    ],

  );
  return `${callPrefix}${callData.substring(2)}`;
}

async function encodeNewCommitteeParams(committeeParams) {
  const callPrefix = await Utils.encodeFunctionSignature(CommitteeSetupFunctionSignature);
  const callData = await Utils.encodeParameters(
    CommitteeSetupParamTypes.split(','),
    [
      committeeParams.consensus,
      committeeParams.committeeSize.toString(10),
      committeeParams.dislocation,
      committeeParams.proposal,
    ],
  );
  return `${callPrefix}${callData.substring(2)}`;
}

module.exports = {
  ConsensusSetupParamTypes,
  ReputationSetupParamTypes,
  CoreSetupParamTypes,
  CommitteeSetupParamTypes,
  ConsensusSetupFunctionSignature,
  ReputationSetupFunctionSignature,
  CoreSetupFunctionSignature,
  CommitteeSetupFunctionSignature,
  ConsensusSetupCallPrefix,
  ReputationSetupCallPrefix,
  AnchorSetupCallPrefix,
  CoreSetupCallPrefix,
  CommitteeSetupCallPrefix,
  deployAxiom,
  deployAxiomWithConfig,
  setupConsensusWithConfig,
  newMetaChainWithConfig,
  encodeNewCoreParams,
  encodeNewCommitteeParams,
};
