# -------------------------------------------------------------------------------------------
# Run gnosis/dex-react using web3.
#
# The test's purpose is to verify web3 latest state runs successfully on an actively
# developed production project which uses.
# + react
# + webpack production build
# + typescript compilation
# + ~200 jest tests
# --------------------------------------------------------------------------------------------

# Exit immediately on error
set -o errexit

cd test/dex-react
yarn
yarn list web3
yarn list web3-utils
yarn list web3-core
yarn list web3-core-promievent

cat ./package.json

# Build
echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
echo "Running gnosis/dex-react: build             "
echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"

APP_ID=1 npm run build

# Test
echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
echo "Running gnosis/dex-react: test              "
echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"

APP_ID=1 npm test
