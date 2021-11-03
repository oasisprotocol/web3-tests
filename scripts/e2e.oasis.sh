#!/usr/bin/env bash

# Runs e2e tests on the Oasis network stack.
# Mandatory variables:
# OASIS_NODE: path to oasis-node binary
# OASIS_NET_RUNNER: path to oasis-net-runner binary
# OASIS_EMERALD_PARATIME: path to Oasis Emerald Paratime binary
# OASIS_EVM_WEB3_GATEWAY: path to Oasis EVM Web3 Gateway binary

set -o nounset -o pipefail -o errexit
trap "exit 1" INT

# Get the root directory of the tests dir inside the repository.
ROOT="$(
    cd $(dirname $0)
    pwd -P
)"
cd "${ROOT}"

# ANSI escape codes to brighten up the output.
RED=$'\e[31;1m'
GRN=$'\e[32;1m'
OFF=$'\e[0m'

# Destination address for test transfers.
DST="oasis1qpkant39yhx59sagnzpc8v0sg8aerwa3jyqde3ge"

# Kill all dangling processes on exit.
cleanup() {
    printf "${OFF}$"
    pkill -P $$ || true
    wait || true
    #	rm -rf "${TEST_BASE_DIR}"
}
trap "cleanup" EXIT

# The base directory for all the node and test env cruft.
TEST_BASE_DIR=/tmp/eth-runtime-test #$(mktemp -d -t oasis-web3-tests-XXXXXXXXXX)
# The oasis-node binary must be in the path for the oasis-net-runner to find it.
export PATH="${PATH}:${ROOT}"
export OASIS_NODE_GRPC_ADDR="unix:${TEST_BASE_DIR}/net-runner/network/client-0/internal.sock"
# How many nodes to wait for each epoch.
NUM_NODES=1
# Current nonce for transactions (incremented after every submit_tx).
NONCE=0

# Helper function for running the test network.
start_network() {
    FIXTURE_FILE="${TEST_BASE_DIR}/fixture.json"

    rm -rf ${TEST_BASE_DIR}
    mkdir ${TEST_BASE_DIR}
    ${OASIS_NET_RUNNER} \
        dump-fixture \
        --fixture.default.node.binary ${OASIS_NODE} \
        --fixture.default.deterministic_entities \
        --fixture.default.fund_entities \
        --fixture.default.num_entities 2 \
        --fixture.default.keymanager.binary '' \
        --fixture.default.runtime.binary=${OASIS_EMERALD_PARATIME} \
        --fixture.default.halt_epoch 100000 \
        --fixture.default.staking_genesis ${ROOT}/../test/tools/staking_genesis.json > "$FIXTURE_FILE"

    # Allow expensive queries.
    jq '.clients[0].runtime_config."1".allow_expensive_queries = true' "$FIXTURE_FILE" > "$FIXTURE_FILE.tmp"
    # TODO: also increase batch size.
    mv "$FIXTURE_FILE.tmp" "$FIXTURE_FILE"

    "${OASIS_NET_RUNNER}" \
        --fixture.file "$FIXTURE_FILE" \
        --basedir ${TEST_BASE_DIR} \
        --basedir.no_temp_dir &
}

# Helper function for running the EVM web3 gateway.
start_web3() {
    pushd $(dirname ${OASIS_EVM_WEB3_GATEWAY})
    ${OASIS_EVM_WEB3_GATEWAY} \
        --config conf/server.yml &
    popd
}

# Helper function that waits for all nodes to register.
wait_for_nodes() {
    printf "${GRN}### Waiting for all nodes to register...${OFF}\n"
    ${OASIS_NODE} debug control wait-nodes \
        --address ${OASIS_NODE_GRPC_ADDR} \
        --nodes ${NUM_NODES} \
        --wait
}

# Helper function that submits the given transaction JSON file.
submit_tx() {
    local tx=$1
    # Submit transaction.
    ${OASIS_NODE} consensus submit_tx \
        --transaction.file "$tx" \
        --address ${OASIS_NODE_GRPC_ADDR} \
        --debug.allow_test_keys
    # Increase nonce.
    NONCE=$((NONCE + 1))
}

# Helper function that generates a runtime deposit transaction.
deposit() {
    local amount=$1
    ${ROOT}/../test/tools/oasis-deposit/oasis-deposit -sock "${OASIS_NODE_GRPC_ADDR}" -amount $amount
}

# Helper function that generates a transfer transaction.
gen_transfer() {
    local tx=$1
    local amount=$2
    local dst=$3
    ${OASIS_NODE} stake account gen_transfer \
        --assume_yes \
        --stake.amount $amount \
        --stake.transfer.destination "$dst" \
        --transaction.file "$tx" \
        --transaction.nonce ${NONCE} \
        --transaction.fee.amount 0 \
        --transaction.fee.gas 10000 \
        --debug.dont_blame_oasis \
        --debug.test_entity \
        --debug.allow_test_keys \
        --genesis.file "${TEST_BASE_DIR}/net-runner/network/genesis.json"
}

run_tests() {
    GANACHE=true
    pushd ${ROOT}/..
    npx nyc --no-clean --silent _mocha -- \
        --reporter spec \
        --require ts-node/register \
        --grep 'E2E' \
        --inverse \
        --timeout 5000 \
        --exit
    popd
}

printf "${GRN}### Starting the test network...${OFF}\n"
start_network

printf "${GRN}### Waiting for the validator to register...${OFF}\n"
${OASIS_NODE} debug control wait-nodes \
    --address ${OASIS_NODE_GRPC_ADDR} \
    --nodes 1 \
    --wait

wait_for_nodes

# wait_for_nodes doesn't seem to do anything :/
sleep 5

printf "${GRN}### Starting oasis-evm-web3-gateway...${OFF}\n"

start_web3

printf "${GRN}### Depositing tokens to runtime...${OFF}\n"

deposit 1000000000000

printf "${GRN}### Running web3 tests implementation...${OFF}\n"

run_tests

printf "${GRN}### Tests finished.${OFF}\n"
