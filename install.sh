#!/bin/sh
if [[ -f ./bin/hypr-settings ]]; then
  cp ./bin/hypr-settings ~/.local/bin/hypr-settings
  echo "Installed hypr-settings to ~/.local/bin/hypr-settings"
else
  echo "Error: ./bin/hypr-settings not found. Please run build.sh first."
  exit 1
fi