#!/bin/bash
# Deploy the built site to Cloudflare Pages (direct upload).
#
# website/public IS the deployable artifact: nothing private lives inside it.
# The private folders (media-library/, project-work/, website/src/, .git/) are
# siblings of it or above it, so they cannot be reached by the upload.
set -euo pipefail
cd "$(dirname "$0")/../.."          # repo root

npm run gate

PUBLIC="website/public"

# Belt and braces: the artifact must contain nothing private.
for forbidden in media-library project-work src .git .wrangler BLOCKERS.md .mcp.json node_modules; do
  if [ -e "$PUBLIC/$forbidden" ]; then
    echo "ABORT: private path '$forbidden' is inside $PUBLIC" >&2
    exit 1
  fi
done

echo "Deploying $(find "$PUBLIC" -type f | wc -l | tr -d ' ') files, $(du -sh "$PUBLIC" | cut -f1)"
npx --yes wrangler pages deploy "$PUBLIC" --project-name=sullivans-usnscc --branch=main --commit-dirty=true
