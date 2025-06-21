#!/bin/sh
deno compile --allow-write --allow-env --allow-run -o ./bin/hypr-settings main.ts
exit $?