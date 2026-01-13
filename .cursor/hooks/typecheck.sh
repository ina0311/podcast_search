#!/bin/bash

# typecheck.sh - ファイル編集後に型チェックを実行するフック
# afterFileEdit フックから呼び出される

# 標準入力からJSON入力を読み込む（必須）
json_input=$(cat)

# 編集されたファイルパスを取得
file_path=$(echo "$json_input" | jq -r '.file_path // empty')

# TypeScript/TSXファイルのみ型チェックを実行
if [[ "$file_path" == *.ts ]] || [[ "$file_path" == *.tsx ]]; then
  # プロジェクトルートに移動
  cd "$(dirname "$0")/../.." || exit 0

  # 型チェックを実行（エラーがあっても継続）
  pnpm typecheck 2>&1 || true
fi

exit 0

