# E2E test of Web3.js

## Note

This folder is a fork of https://github.com/cgewecke/mosaic-1.

Uses buidler and yarn's "resolutions" feature to set the specific version of Web3
used in Mosaic's truffle tests.

This toolset was chosen because it's the easiest way to swap an arbitrary
version of Web3 into a large project. Truffle is complex and ships as a webpack bundle.

Also makes it a more straightforward to distinguish between problems at Truffle vs problems at Web3.

Mosaic was chosen because their test suite:
+ does not use migrations
+ large-ish: almost 300 unit tests, takes ~10 min
+ experienced a non-deterministic "sudden disconnection" bug that Truffle developers attributed
  to Web3.

The real Mosaic project can be found [here](https://github.com/mosaicdao/mosaic-1)

## Install

```bash
git clone https://github.com/cgewecke/mosaic-1 mosaic-1
cd mosaic-1
npm run update
```
