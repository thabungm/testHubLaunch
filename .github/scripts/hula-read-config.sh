#!/usr/bin/env bash
# hula-read-config.sh — Shared config reader for hula shell scripts
# Source this file; do NOT execute directly.
#
# After sourcing, the following variables are set:
#   HULA_WORKTREE_BASE_PATH  — absolute resolved worktreeBasePath
#
# Reads worktreeBasePath from .hublaunch/hublaunch.config.js.
# Falls back to ".hula-worktrees" (resolved relative to repo root).

_hula_read_worktree_base_path() {
  local repo_root
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || {
    printf 'Warning: could not determine repo root\n' >&2
    repo_root="$(pwd)"
  }
  local config_file="${repo_root}/.hublaunch/hublaunch.config.js"
  local base_path=""

  if [[ -f "$config_file" ]]; then
    base_path=$(grep 'worktreeBasePath' "$config_file" \
      | grep -v '^\s*//' \
      | sed "s/.*worktreeBasePath[^'\"]*['\"]\\([^'\"]*\\)['\"].*/\\1/" \
      | head -1) || true
  fi

  # Default to .hula-worktrees if not found or empty
  base_path="${base_path:-.hula-worktrees}"

  # Resolve relative paths against repo root
  if [[ "$base_path" != /* ]]; then
    base_path="${repo_root}/${base_path}"
  fi

  printf '%s' "$base_path"
}

HULA_WORKTREE_BASE_PATH=$(_hula_read_worktree_base_path)
