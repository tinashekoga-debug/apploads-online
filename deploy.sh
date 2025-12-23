#!/bin/bash
set -e

VERSION="$1"

if [ -z "$VERSION" ]; then
  echo "Usage: ./deploy.sh vX.Y"
  exit 1
fi

if [ "$(basename "$PWD")" != "apploads-online" ]; then
  echo "ERROR: Run this script from apploads-online directory"
  exit 1
fi

echo "------------------------------------"
echo " Deploying AppLoads $VERSION"
echo "------------------------------------"

git status
echo "------------------------------------"
read -p "Continue deploy? (y/N): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "❌ Deploy aborted"
  exit 0
fi

git add .
git commit -m "Deploy AppLoads $VERSION" || echo "Nothing to commit"

git fetch origin
git push --force-with-lease origin main

echo "------------------------------------"
echo "✅ Deploy $VERSION complete"
