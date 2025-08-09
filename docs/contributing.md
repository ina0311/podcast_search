# Contributing Guide

このプロジェクトへの貢献を歓迎します！

## セットアップ

```bash
git clone https://github.com/your-org/podcast_search.git
cd podcast_search
pnpm install
```

## ブランチ戦略

- `main` : 本番デプロイ用  
- `develop` : 開発統合ブランチ  
- 機能追加は `feat/xxx`、バグ修正は `fix/xxx` 形式でブランチを切ってください。

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/) を推奨します。

例:
```
feat(api): add transcript endpoint
fix(ui): resolve search debouncing issue
```

## コードスタイル

- TypeScript strict  
- ESLint + Prettier  
- `pnpm lint:fix` で自動修正、CI でもチェックされます。

## PR Flow

1. Pull Request を作成し、[WIP] ラベルを付けて draft として開始できます。  
2. CI がパスし、レビュー承認後 `develop` (または `main`) へ squash merge してください。
