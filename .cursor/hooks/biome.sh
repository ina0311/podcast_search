#!/bin/bash

# biome.sh - ファイル編集後にBiomeのlintとformatを実行するフック
# afterFileEdit フックから呼び出される

# 標準入力からJSON入力を読み込む（必須）
json_input=$(cat)

# 編集されたファイルパスを取得
file_path=$(echo "$json_input" | jq -r '.file_path // empty')

# Biome対象ファイルのみ実行 (ts, tsx, js, jsx, json, css)
if [[ "$file_path" =~ \.(ts|tsx|js|jsx|json|css)$ ]]; then
  # プロジェクトルートに移動
  cd "$(dirname "$0")/../.." || exit 0

  # ファイルが存在する場合のみ実行
  if [[ -f "$file_path" ]]; then
    echo "Running Biome on: $file_path"
    # lint --write で自動修正、format で整形
    pnpm biome check --write "$file_path" 2>&1 || true
  fi
fi

exit 0
