# TODO: 後で実装する機能一覧

このリポジトリは最小限の検索機能と管理 UI を実装していますが、下記の項目は未実装または簡易実装のまま残っています。必要に応じて着手してください。

1. ベクトル検索 (Qdrant) と Embedding 登録
   - Whisper 文字起こしの結果を OpenAI Embedding API でベクトル化
   - Qdrant の transcript_segments コレクションに upsert
   - /search エンドポイントを類似度検索に切り替える

2. Whisper CLI 連携と文字起こし登録 API
   - ローカルで `whisper .mp3` を実行し JSON 出力を生成
   - `/transcripts` API へ POST して DB + Qdrant に登録
   - CLI スクリプトや GitHub Action の導入も検討

3. Discord Bot の実装
   - discord.js を用いて /search コマンドを作成
   - Hono API を呼び出して結果をチャットに返信
   - 利用チャンネルの制御とエラー処理

4. Tailwind CSS + shadcn/ui による UI 改善
   - 現状はプレーンな HTML/CSS
   - `npx shadcn-ui@latest init` でセットアップ
   - コンポーネント置き換え (Button, Card, Input など)

5. 認証 / 管理者権限
   - admin-ui へのアクセス制限
   - Discord OAuth2 などの導入検討

6. Dockerfile と Render デプロイ設定
   - `Dockerfile` を作成して API & admin-ui をビルド
   - `render.yaml` でサービス定義

---

開発フロー例:

```bash
# DB & Qdrant 起動
$ docker-compose up -d

# 依存インストール
$ npm install

# Prisma マイグレーション
$ npm run -w apps/api prisma:migrate

# 開発サーバー起動
$ npm run dev
```

ご自由に拡張してください！ 