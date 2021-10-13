# -------------------------------------------------------------------------------------------
# Run mosaicdao/mosaic-1 fork (w/ buidler truffle5 plugin) using web3.
#
# This test's purpose is to watch web3 execute a long, complex test suite
# It uses buidler-adapted fork of mosaicdao because that tool is simpler and
# more modular than Truffle and lets us resolve arbitrary versions of web3 more easily.
# --------------------------------------------------------------------------------------------

# Exit immediately on error
set -o errexit

# TODO: Replace web3 packages below with oasis-web3 packages once they are ready.

cd test/mosaic-1
yarn
yarn list web3
yarn list web3-utils
yarn list web3-core
yarn list web3-core-promievent

cat ./package.json

# Test
echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
echo "Running mosaicdao/mosaic-1 unit tests.      "
echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"

# TODO: Replace ganache_cli below with oasis toolset once it is ready.

# Launch ganache
./tools/run_ganache_cli.sh </dev/null 1>/dev/null 2>&1 &
sleep 10

# Compile and test
npx buidler compile
npm test
