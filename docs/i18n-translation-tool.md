## Translation merge helper

Use `scripts/i18n-merge.sh` to merge JSON snippets into `packages/i18n/src/locales/{locale}/{namespace}.json` without relying on the LLM to edit files.

### Requirements
- `jq` available in your shell

### Usage
```bash
# Pipe a JSON patch (the patch must be an object)
cat <<'EOF' | scripts/i18n-merge.sh -l pl
{
  "history": {
    "title": "Historia zmian",
    "empty": "Brak zapisanej historii"
  }
}
EOF

# Update the matching English strings
cat <<'EOF' | scripts/i18n-merge.sh -l en
{
  "history": {
    "title": "History",
    "empty": "No history yet"
  }
}
EOF

# Merge a patch from a file (namespace defaults to common)
scripts/i18n-merge.sh -l pl -f /tmp/patch.json

# Target a different namespace file if needed
cat <<'EOF' | scripts/i18n-merge.sh -l pl -n dashboard
{ "header": { "title": "Panel" } }
EOF
```

### Workflow with the LLM
1) Ask the LLM for translation keys and values shaped as a JSON object.
2) Paste the JSON into the commands above to merge into the correct locale.
3) Verify changes with `git diff packages/i18n/src/locales`.

The script performs a deep merge, so it only overwrites the keys you provide and leaves the rest untouched.
