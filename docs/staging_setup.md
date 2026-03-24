# Staging 環境変数の設定手順

## 概要

staging 環境の環境変数を `dotenvx` で暗号化して登録する手順です。

## 前提条件

- `@dotenvx/dotenvx` がインストールされていること
- staging 環境の実際の値（DATABASE_URL、QDRANT_URL など）が準備されていること

## 手順

### 1. 公開鍵の生成

staging 環境用の公開鍵を生成します：

```bash
cd packages/config/environments
npx dotenvx keys generate --env-file .env.staging
```

このコマンドで `DOTENV_PUBLIC_KEY_STAGING` が生成され、`.env.staging` ファイルに自動的に追加されます。

### 2. Supabase 接続文字列の取得

#### Supabase ダッシュボードから取得

1. [Supabase ダッシュボード](https://app.supabase.com/) にログイン
2. プロジェクトを選択（または新規作成）
3. **Settings** → **Database** → **Connection string** を開く
4. **Connection pooling** を選択
5. **Session mode** を選択（推奨）
6. 接続文字列をコピー

**接続文字列の形式**:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

**例**:
```
postgresql://postgres.abcdefghijklmnop:your-password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**注意事項**:
- `[project-ref]`: プロジェクトの参照ID（Supabase ダッシュボードで確認）
- `[password]`: データベースのパスワード（プロジェクト作成時に設定）
- `[region]`: リージョン（例: `ap-northeast-1`）
- `?sslmode=require` は必須（SSL接続が必要）

### 3. 環境変数の設定（一時的に平文で）

`.env.staging` ファイルを編集し、実際の値を平文で設定します：

```bash
# .env.staging を編集
NODE_ENV=staging
PORT=3000

# Database (Supabase)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require

# Qdrant (Vector Database)
QDRANT_URL=https://staging-qdrant.example.com:6333
QDRANT_API_KEY=your-staging-qdrant-api-key

# OpenAI
OPENAI_API_KEY=sk-your-staging-openai-api-key
```

**実際の例**:
```bash
DATABASE_URL=postgresql://postgres.abcdefghijklmnop:your-password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### 4. 環境変数の暗号化

平文で設定した環境変数を暗号化します：

```bash
npx dotenvx encrypt --env-file .env.staging
```

このコマンドで、各環境変数の値が `encrypted:...` 形式に変換されます。

### 5. 暗号化の確認

`.env.staging` ファイルを確認し、すべての値が `encrypted:` で始まっていることを確認します：

```bash
cat packages/config/environments/.env.staging
```

期待される形式：

```
DOTENV_PUBLIC_KEY_STAGING="02c78fe7722237c7b2a0706ecd91d5e2bc01762793c5f0ca6574858bd1fd98cf1a"
NODE_ENV=encrypted:BBLKNd/Xu1ycPGo3XX7Gy+2IS5QrXy2QAhJCEbkzz904DDHeYT0zS/rPn9Brh08T9q3dwKq3m0dKxCc02cMQLZp7oqXyLXNhT4UAmWS7cqCLsRGD/AwZN4uhAFj56zI5f1cOrj/k9IZcN2gk
PORT=encrypted:BPDdvfBA1YGaZ4/k9hq/1TAPpHysEcINnUSHPuhT3zMV2z+M+e4OAoJvcEAYtzwPCaNlePDHedmrky/4BDxvt1eJu6ye9U22nGLK8GpzfsBRgPILoblM+TvsBSUH+b+t+E/eheU=
...
```

### 6. バリデーション

暗号化された環境変数が正しく読み込めるか確認します：

```bash
cd packages/config
pnpm validate:staging
```

成功すると `✅ Config validated` が表示されます。

### 7. コミット

暗号化された `.env.staging` ファイルをコミットします：

```bash
git add packages/config/environments/.env.staging
git commit -m "chore(config): add staging environment variables"
```

**重要**: 
- `.env.keys` ファイル（秘密鍵）は **絶対にコミットしないでください**
- 公開鍵（`DOTENV_PUBLIC_KEY_STAGING`）はコミットして問題ありません

## トラブルシューティング

### エラー: "No public key found"

公開鍵が生成されていない可能性があります。手順1を再実行してください。

### エラー: "Decryption failed"

秘密鍵（`.env.keys`）が正しく設定されていない可能性があります。`.env.keys` ファイルが存在することを確認してください。

### 環境変数の更新

既存の環境変数を更新する場合：

1. `.env.staging` の該当行を平文で更新
2. `npx dotenvx encrypt --env-file .env.staging` を実行
3. バリデーションで確認

## 参考

- [dotenvx 公式ドキュメント](https://dotenvx.com/)
- [dotenvx 暗号化ガイド](https://dotenvx.com/encryption)
