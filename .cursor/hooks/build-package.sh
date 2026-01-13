#!/bin/bash

# build-package.sh - packages配下のファイル編集後に該当パッケージをビルドするフック
# afterFileEdit フックから呼び出される

# 標準入力からJSON入力を読み込む（必須）
json_input=$(cat)

# 編集されたファイルパスを取得
file_path=$(echo "$json_input" | jq -r '.file_path // empty')

# packages配下のTypeScript/TSXファイルのみ対象
if [[ "$file_path" == *"/packages/"* ]] && [[ "$file_path" == *.ts || "$file_path" == *.tsx ]]; then
  # プロジェクトルートに移動
  cd "$(dirname "$0")/../.." || exit 0

  # パッケージ名を抽出 (packages/config/src/... -> config)
  package_name=$(echo "$file_path" | sed -n 's|.*/packages/\([^/]*\)/.*|\1|p')

  if [[ -n "$package_name" && -d "packages/$package_name" ]]; then
    echo "Building package: $package_name"
    pnpm -C "packages/$package_name" build 2>&1 || true
  fi
fi

exit 0

