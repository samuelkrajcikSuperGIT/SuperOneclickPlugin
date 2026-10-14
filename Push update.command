#!/bin/bash
# Double-click to commit and push changes in this repo.
# Leave the version blank for a normal push; enter e.g. 0.10.4 to also publish a release zip.
cd "$(dirname "$0")" || exit 1

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to commit."
  read -n 1 -s -r -p "Press any key to close"
  exit 0
fi

git status --short
echo
read -r -p "Release version (blank = no release): " VER

if [ -n "$VER" ]; then
  bash scripts/release.sh "$VER"
else
  read -r -p "Commit message [Update plugin]: " MSG
  MSG="${MSG:-Update plugin}"
  git add -A && git commit -m "$MSG" && git push origin HEAD
fi

echo
echo "Done (check above for errors)."
read -n 1 -s -r -p "Press any key to close"
