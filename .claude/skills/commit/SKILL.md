# Skill: commit

## 概要

変更を論理単位で分割し、規約に沿ったコミットメッセージで記録する。

## 手順

### 1. 変更の確認

```bash
git status
git diff --stat
```

### 2. 分割の判断

`git diff --stat` の出力を見て関心事（feat / fix / config / docs など）ごとにグループ化する。
複数の関心事が混在する場合は複数コミットに分割する。

### 3. ステージング（ファイル単位で指定）

```bash
git add <file1> <file2> ...
# git add -A や git add . は使用しない
```

### 4. コミットメッセージ形式

```
<type>: <日本語の説明>

Co-Authored-By: Claude <noreply@anthropic.com>
```

type 一覧はグローバル CLAUDE.md の `## git / コミット規約` を参照。

### 5. コミット実行

```bash
git commit -m "$(cat <<'EOF'
<type>: <日本語の説明>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 6. セキュリティチェック

- `.env`、`*.keys`、credentials ファイルがステージングに含まれていないことを確認する
- `git status` で意図しないファイルがないことを確認してからコミットする
