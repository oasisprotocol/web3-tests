#!/usr/bin/env bash

# -----------------------------
# CI matrix job selector
# -----------------------------

# Exit immediately on error
set -o errexit

if [ "$TEST" = "unit" ]; then

  npm run test:unit

elif [ "$TEST" = "lint" ]; then

  npm run dtslint
  npm run depcheck

elif [ "$TEST" = "unit_and_e2e_clients" ]; then

  npm run test:e2e:ganache
  npm run test:e2e:geth:insta
  npm run test:e2e:geth:auto
  npm run test:unit
  npm run cov:merge_reports

elif [ "$TEST" = "e2e_browsers" ]; then

  npm run test:e2e:chrome
  npm run test:e2e:firefox
  npm run test:e2e:min
  npm run test:e2e:cdn

elif [ "$TEST" = "e2e_mosaic" ]; then

  npm run test:e2e:mosaic

elif [ "$TEST" = "e2e_ganache" ]; then

  npm run test:e2e:ganache:core

elif [ "$TEST" = "e2e_gnosis_dex" ]; then

  npm run test:e2e:gnosis:dex

fi
