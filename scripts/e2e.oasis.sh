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
ROOT="$(cd $(dirname $0); pwd -P)"
cd "${ROOT}"

# ANSI escape codes to brighten up the output.
RED=$'\e[31;1m'
GRN=$'\e[32;1m'
OFF=$'\e[0m'

# Destination address for test transfers.
DST="oasis1qpkant39yhx59sagnzpc8v0sg8aerwa3jyqde3ge"

# Kill all dangling processes on exit.
cleanup() {
	printf "${OFF}"
	pkill -P $$ || true
	wait || true
}
trap "cleanup" EXIT

# The base directory for all the node and test env cruft.
TEST_BASE_DIR=$(mktemp -d -t oasis-web3-tests-XXXXXXXXXX)

# The oasis-node binary must be in the path for the oasis-net-runner to find it.
export PATH="${PATH}:${ROOT}"

# Helper function for running the test network.
start_network() {
	local height=$1
	${OASIS_NET_RUNNER} \
	    --fixture.default.node.binary ${OASIS_NODE} \
		--fixture.default.initial_height=${height} \
		--fixture.default.setup_runtimes=false \
		--fixture.default.num_entities=1 \
		--fixture.default.epochtime_mock=true \
		--basedir.no_temp_dir \
		--basedir ${TEST_BASE_DIR} &

}

printf "${GRN}### Starting the test network...${OFF}\n"
start_network 1

export OASIS_NODE_GRPC_ADDR="unix:${TEST_BASE_DIR}/net-runner/network/validator-0/internal.sock"

# How many nodes to wait for each epoch.
NUM_NODES=1

# Current nonce for transactions (incremented after every submit_tx).
NONCE=0

# Helper function for advancing the current epoch to the given parameter.
advance_epoch() {
	local epoch=$1
	printf "${GRN}### Advancing epoch ($epoch)...${OFF}\n"
	${OASIS_NODE} debug control set-epoch \
		--address ${OASIS_NODE_GRPC_ADDR} \
		--epoch $epoch
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
	NONCE=$((NONCE+1))
}

# Helper function that generates a runtime deposit transaction.
gen_deposit() {
	local tx=$1
	local amount=$2
	local dst=$3
	# TODO
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

printf "${GRN}### Waiting for the validator to register...${OFF}\n"
${OASIS_NODE} debug control wait-nodes \
	--address ${OASIS_NODE_GRPC_ADDR} \
	--nodes 1 \
	--wait

advance_epoch 1
wait_for_nodes

${OASIS_EVM_WEB3_GATEWAY} &

printf "${GRN}### Transferring tokens (1)...${OFF}\n"
gen_deposit "${TEST_BASE_DIR}/tx1.json" 1000 "${DST}"
submit_tx "${TEST_BASE_DIR}/tx1.json"

advance_epoch 2
wait_for_nodes

printf "${GRN}### Transferring tokens (2)...${OFF}\n"
gen_transfer "${TEST_BASE_DIR}/tx2.json" 123 "${DST}"
submit_tx "${TEST_BASE_DIR}/tx2.json"

advance_epoch 3
wait_for_nodes

printf "${GRN}### Running web3 tests implementation...${OFF}\n"

# TODO: run tests

rm -rf "${TEST_BASE_DIR}"
printf "${GRN}### Tests finished.${OFF}\n"
