#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

if [ "$SOLIDITY_COVERAGE" = true ]; then
  ganache_port=8555
else
  ganache_port=8545
fi

ganache_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  local accounts=(
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d699972,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d699973,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d699974,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d699975,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d699976,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d699977,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d699978,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d699979,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d69997a,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d69997b,1000000000000000000000000000"
    --account="0xb178cf12d4126ea1db48ca32e3ce6743580ca6646391996032fc76652d69997c,1000000000000000000000000000"
  )

  if [ "$SOLIDITY_COVERAGE" = true ]; then
    node_modules/.bin/testrpc-sc --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}" > /dev/null &
  else
    node_modules/.bin/ganache-cli --gasLimit 0xfffffffffff "${accounts[@]}" > /dev/null &
  fi
  ganache_pid=$!
}

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
fi

node_modules/.bin/truffle test --network development "$@"
