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
TOMNEMONIC="tray ripple elevator ramp insect butter top mouse old cinnamon panther chief"

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

# Helper function that generates a runtime deposit transaction with custom to.
deposit_tomnemonic() {
    local amount=$1
    local to=$2
    ${ROOT}/../test/tools/oasis-deposit/oasis-deposit -sock "${OASIS_NODE_GRPC_ADDR}" -amount $amount -tomnemonic "$to"
}

run_e2e_tests() {
    GANACHE=true
    pushd ${ROOT}/..
    npx nyc --no-clean --silent _mocha -- \
        --reporter spec \
        --require ts-node/register \
        --grep 'E2E' \
        --timeout 5000 \
        --exit
    popd
}

run_mosaic_tests() {
    pushd ${ROOT}/../test/mosaic-1
    npm i

    # Compile and test
    #npx hardhat compile --show-stack-traces
    npx hardhat test --network emerald_local --show-stack-traces
    popd
}

deposit_tomnemonic 1000000000000 "$TOMNEMONIC"

printf "${GRN}### Running web3 tests implementation...${OFF}\n"

#run_e2e_tests
run_mosaic_tests

printf "${GRN}### Tests finished.${OFF}\n"
