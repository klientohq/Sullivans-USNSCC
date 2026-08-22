#!/bin/bash
# Deploy the built site to Cloudflare Pages (direct upload).
#
# Stages only the public artifact into a temp dir first: the repo root also
# holds _src/, .git/, the 837 MB gitignored USNSCC/ media library, and
# project-work/, none of which may ever reach a public host. rsync includes
# nothing that is not explicitly listed.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run gate

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

rsync -a \
  --include='/*.html' \
  --include='/styles.css' \
  --include='/main.js' \
  --include='/sitemap.xml' \
  --include='/robots.txt' \
  --include='/llms.txt' \
  --include='/_headers' \
  --include='/_redirects' \
  --include='/assets/***' \
  --exclude='*' \
  ./ "$STAGE/"

# Belt and braces: fail loudly if anything private slipped into the stage.
for forbidden in USNSCC project-work _src .git BLOCKERS.md NEXT-SESSION-PROMPT.md SULLIVANS_SITE_BRIEF.md .mcp.json; do
  if [ -e "$STAGE/$forbidden" ]; then
    echo "ABORT: private path '$forbidden' reached the deploy stage" >&2
    exit 1
  fi
done

echo "Staged $(find "$STAGE" -type f | wc -l | tr -d ' ') files, $(du -sh "$STAGE" | cut -f1)"
npx --yes wrangler pages deploy "$STAGE" --project-name=sullivans-usnscc --branch=main --commit-dirty=true
