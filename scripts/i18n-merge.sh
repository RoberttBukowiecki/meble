#!/usr/bin/env bash
# Merge translation patches into packages/i18n locale JSON files.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCALES_DIR="$ROOT_DIR/packages/i18n/src/locales"

usage() {
  cat <<'EOF'
Usage:
  scripts/i18n-merge.sh -l <locale> [-n <namespace>] [-f <patch-file>]
  cat patch.json | scripts/i18n-merge.sh -l <locale> [-n <namespace>]

Options:
  -l, --locale       Target locale code (e.g. pl, en)
  -n, --namespace    Namespace filename without extension (default: common)
  -f, --file         JSON patch file to merge (default: stdin)
  -h, --help         Show this message

The patch must be a JSON object and will be deep-merged into the target file.
EOF
}

require_value() {
  if [[ $# -lt 2 || -z "$2" ]]; then
    echo "Missing value for $1" >&2
    usage
    exit 1
  fi
}

locale=""
namespace="common"
patch_source="/dev/stdin"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -l|--locale)
      require_value "$1" "${2-}"
      locale="$2"
      shift 2
      ;;
    -n|--namespace)
      require_value "$1" "${2-}"
      namespace="$2"
      shift 2
      ;;
    -f|--file)
      require_value "$1" "${2-}"
      patch_source="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$locale" ]]; then
  echo "Missing required --locale" >&2
  usage
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "The 'jq' binary is required but not installed." >&2
  exit 1
fi

if [[ ! -d "$LOCALES_DIR/$locale" ]]; then
  echo "Locale directory not found: $LOCALES_DIR/$locale" >&2
  exit 1
fi

target_file="$LOCALES_DIR/$locale/$namespace.json"
if [[ "$patch_source" != "/dev/stdin" && ! -f "$patch_source" ]]; then
  echo "Patch file not found: $patch_source" >&2
  exit 1
fi

if [[ ! -f "$target_file" ]]; then
  echo "{}" > "$target_file"
fi

tmp_file="$(mktemp)"

if ! jq -S --slurpfile patch "$patch_source" '
  def deepmerge(a; b):
    reduce (b | keys_unsorted[]) as $key
      (a;
        if (a[$key] | type) == "object" and (b[$key] | type) == "object" then
          .[$key] = deepmerge(a[$key]; b[$key])
        else
          .[$key] = b[$key]
        end);
  ($patch[0] // {}) as $payload
  | if ($payload | type) != "object" then
      error("Patch must be a JSON object")
    else
      deepmerge(.; $payload)
    end
' "$target_file" > "$tmp_file"; then
  echo "Failed to merge patch. Ensure the patch is valid JSON." >&2
  rm -f "$tmp_file"
  exit 1
fi

mv "$tmp_file" "$target_file"
echo "Updated $target_file"
