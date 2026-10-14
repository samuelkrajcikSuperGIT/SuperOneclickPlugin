#!/usr/bin/env bash
# Usage: scripts/release.sh X.Y.Z
# Bumps the manifest version, commits, tags vX.Y.Z and pushes. GitHub Actions then publishes the release zip.
set -euo pipefail
VER="${1:?usage: scripts/release.sh X.Y.Z}"
cd "$(dirname "$0")/.."

grep -q "^## $VER\$" CHANGELOG.md || { echo "Add a '## $VER' section to CHANGELOG.md first."; exit 1; }

python3 - "$VER" <<'PY'
import json, sys
p = "extension/manifest.json"
m = json.load(open(p))
m["version"] = sys.argv[1]
json.dump(m, open(p, "w"), indent=2)
open(p, "a").write("\n")
PY

node --check extension/content.js
git add -A
git commit -m "Release v$VER"
git tag "v$VER"
git push origin HEAD "v$VER"
echo "Pushed v$VER. GitHub Actions will publish the release zip."
