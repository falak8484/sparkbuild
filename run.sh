#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
  echo "Paste your fresh keys into .env, save the file, then run ./run.sh again."
  exit 0
fi
node server.js
