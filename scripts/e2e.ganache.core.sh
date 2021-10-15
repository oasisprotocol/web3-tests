# ----------------------------------------------------------------------------------------
# Run trufflesuite/ganache-core using web3.
#
# This test's purpose is to watch web3 execute a long, complex test suite
# ----------------------------------------------------------------------------------------

# Exit immediately on error
set -o errexit

cd test/ganache-core
npm ci
npm run build

# There are two failing ganache tests:
# 1. "should return instance of StateManager on start":
#    Checks whether the object returned by the server is an
#    instanceof StateManager. Also fails locally & doesn't
#    seem web3 related.
# 2. "should handle events properly via the data event handler":
#    Upstream issue. Also fails locally & doesn't
#    seem web3 related.
# Skipping them with grep / invert.
TEST_BUILD=node npx mocha \
  --grep "should return instance of StateManager on start|should handle events properly via the data event handler" \
  --invert \
  --check-leaks \
  --recursive \
  --globals _scratch
