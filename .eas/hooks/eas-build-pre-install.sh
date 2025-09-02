#!/usr/bin/env bash
set -e

echo "Injecting google-services.json..."
echo $GOOGLE_SERVICES_JSON | base64 --decode > android/app/google-services.json
cp android/app/google-services.json android/app/src/debug/google-services.json
