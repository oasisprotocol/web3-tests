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

const Utils = require('../test_lib/utils.js');
const CoreStatusUtils = require('../test_lib/core_status_utils');
const consensusUtil = require('./utils.js');

const Consensus = artifacts.require('ConsensusTest');
const SpyReputation = artifacts.require('SpyReputation');
const SpyCore = artifacts.require('SpyCore');

contract('Consensus::logout', (accounts) => {
  const accountProvider = new Utils.AccountProvider(accounts);

  let contracts = {};
  let metachainId;
  let validator;

  beforeEach(async () => {
    metachainId = Utils.getRandomHash();
    validator = accountProvider.get();

    contracts = {
      consensus: await Consensus.new(),
      reputation: await SpyReputation.new(),
      core: await SpyCore.new(),
    };

    await contracts.consensus.setReputation(contracts.reputation.address);
    await contracts.consensus.setCoreLifetime(
      contracts.core.address,
      consensusUtil.CoreLifetime.active,
    );
    await contracts.consensus.setAssignment(metachainId, contracts.core.address);
  });

  contract('Negative Tests', async () => {
    it('should fail when metachain id is 0', async () => {
      metachainId = '0x0000000000000000000000000000000000000000';

      await Utils.expectRevert(
        contracts.consensus.logout(metachainId, contracts.core.address, { from: validator }),
        'Metachain id is 0.',
      );
    });

    it('should fail when core address is 0', async () => {
      await Utils.expectRevert(
        contracts.consensus.logout(metachainId, Utils.NULL_ADDRESS, { from: validator }),
        'Core address is 0.',
      );
    });

    it('should fail when core is not assigned for the specified chain id', async () => {
      await Utils.expectRevert(
        contracts.consensus.logout(metachainId, accountProvider.get(), { from: validator }),
        'Core is not assigned for the specified metachain id.',
      );
    });

    it('should fail when core lifetime is undefined', async () => {
      await contracts.consensus.setCoreLifetime(
        contracts.core.address,
        consensusUtil.CoreLifetime.undefined,
      );
      await Utils.expectRevert(
        contracts.consensus.logout(metachainId, contracts.core.address, { from: validator }),
        'Core lifetime status must be genesis or active.',
      );
    });

    it('should fail when core lifetime is halted', async () => {
      await contracts.consensus.setCoreLifetime(
        contracts.core.address,
        consensusUtil.CoreLifetime.halted,
      );
      await Utils.expectRevert(
        contracts.consensus.logout(metachainId, contracts.core.address, { from: validator }),
        'Core lifetime status must be genesis or active.',
      );
    });

    it('should fail when core status is corrupted', async () => {
      await contracts.consensus.setCoreLifetime(
        contracts.core.address,
        consensusUtil.CoreLifetime.corrupted,
      );
      await Utils.expectRevert(
        contracts.consensus.logout(metachainId, contracts.core.address, { from: validator }),
        'Core lifetime status must be genesis or active.',
      );
    });
  });

  contract('Positive Tests', () => {
    it('should pass when core lifetime is genesis', async () => {
      await contracts.consensus.setCoreLifetime(
        contracts.core.address,
        consensusUtil.CoreLifetime.genesis,
      );
      await contracts.consensus.logout(metachainId, contracts.core.address, { from: validator });
    });

    it('should pass when core lifetime is activated', async () => {
      await contracts.consensus.setCoreLifetime(
        contracts.core.address,
        consensusUtil.CoreLifetime.active,
      );
      await contracts.consensus.logout(metachainId, contracts.core.address, { from: validator });
    });

    it('should called logout function of core contract', async () => {
      await contracts.consensus.logout(metachainId, contracts.core.address, { from: validator });
      const spyValidator = await contracts.core.spyValidator.call();
      assert.strictEqual(
        spyValidator,
        validator,
        'Validator not set in spy core contract.',
      );
    });

    it('should called logout function of reputation contract', async () => {
      await contracts.consensus.logout(metachainId, contracts.core.address, { from: validator });
      const spyValidator = await contracts.reputation.validator.call();
      assert.strictEqual(
        spyValidator,
        validator,
        'Validator not set in spy reputation contract.',
      );
    });
  });
});
