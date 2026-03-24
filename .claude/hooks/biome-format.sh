#!/bin/bash
# PostToolUse: Write/Edit 後に Biome でフォーマット

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')

FILE_PATH=""
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "MultiEdit" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')
fi

if [ -n "$FILE_PATH" ] && [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx|json)$ ]]; then
  pnpm biome format --write "$FILE_PATH" 2>/dev/null || true
fi

exit 0
