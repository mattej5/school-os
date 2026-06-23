#!/usr/bin/env bash
# School OS installer — symlinks the four skills into your Claude Code skills
# directory so Claude picks them up. Symlinks (not copies) are used so the skills
# keep resolving their shared primitives (../../shared/*) inside this repo, and so
# `git pull` updates them in place.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

mkdir -p "$SKILLS_DEST"

echo "Installing School OS skills into: $SKILLS_DEST"
for skill_dir in "$REPO_DIR"/skills/*/; do
  name="$(basename "$skill_dir")"
  target="$SKILLS_DEST/$name"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "  ! $name exists and is not a symlink — skipping (remove it first to install)."
    continue
  fi
  ln -sfn "$skill_dir" "$target"
  echo "  ✓ $name"
done

echo
echo "Done. The skills resolve their shared Comprehension Gate and Learning Ledger"
echo "specs from $REPO_DIR/shared, so keep this repo where it is (or re-run after moving)."
echo
echo "Optional: start the study-drills web app for adaptive-quiz:"
echo "  cd \"$REPO_DIR/studyapp\" && node server.js   # needs Node v26, zero deps"
