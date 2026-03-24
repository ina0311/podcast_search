# Supabase 接続方法

このドキュメントでは、Supabase CLI で起動した PostgreSQL への接続方法を説明します。

## 前提条件

Supabase CLI でローカルスタックを起動していること：

```bash
cd packages/database
supabase start
```

起動後、以下の情報が表示されます：

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

## 接続方法

### 1. ローカルから直接接続（推奨）

ホストマシンから直接接続する場合：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

**使用例:**
- ローカルで `pnpm dev` を実行する場合
- Prisma マイグレーションを実行する場合
- 直接データベースに接続する場合

### 2. docker-compose.yml 内のサービスから接続

docker-compose.yml で起動したサービス（api、admin-ui など）から接続する場合：

#### macOS/Windows

```bash
DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres
```

`host.docker.internal` は Docker Desktop が提供する特別なホスト名で、ホストマシンの localhost に接続できます。

#### Linux

```bash
DATABASE_URL=postgresql://postgres:postgres@172.17.0.1:54322/postgres
```

または、`network_mode: host` を使用：

```yaml
services:
  api:
    network_mode: host
    environment:
      DATABASE_URL: postgresql://postgres:postgres@localhost:54322/postgres
```

## 現在の設定

現在の `docker-compose.yml` は macOS/Windows 用に設定されています：

```yaml
environment:
  DATABASE_URL: postgresql://postgres:postgres@host.docker.internal:54322/postgres
```

Linux で使用する場合は、上記の Linux 用の接続文字列に変更してください。

## 接続確認

接続が正しく動作しているか確認するには：

```bash
# ローカルから接続確認
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT version();"

# docker-compose 内のサービスから接続確認
docker compose exec api psql postgresql://postgres:postgres@host.docker.internal:54322/postgres -c "SELECT version();"
```

## トラブルシューティング

### `host.docker.internal` に接続できない（Linux）

Linux では `host.docker.internal` がデフォルトで利用できない場合があります。以下のいずれかの方法で解決できます：

1. **環境変数で指定**:
   ```bash
   export DOCKER_HOST_IP=$(ip -4 addr show docker0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
   ```

2. **docker-compose.yml に extra_hosts を追加**:
   ```yaml
   services:
     api:
       extra_hosts:
         - "host.docker.internal:host-gateway"
   ```

3. **直接 IP アドレスを使用**:
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@172.17.0.1:54322/postgres
   ```

### ポート 54322 に接続できない

Supabase が起動しているか確認：

```bash
cd packages/database
supabase status
```

起動していない場合は：

```bash
supabase start
```

## 本番環境（Supabase Cloud）への接続

### 接続文字列の取得

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. **Settings** > **Database** > **Connection string** (URI) をコピー

接続文字列の形式：

```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

### GitHub Environments の設定

リポジトリの **Settings** > **Environments** で以下の2つの環境を作成：

#### 1. `development` 環境

| Secret名 | 説明 |
|----------|------|
| `DATABASE_URL` | 開発用 Supabase プロジェクトの接続文字列 |

#### 2. `production` 環境

| Secret名 | 説明 |
|----------|------|
| `DATABASE_URL` | 本番用 Supabase プロジェクトの接続文字列 |

**推奨**: production 環境には保護ルールを設定（Required reviewers など）

## CI/CD パイプライン

### デプロイフロー

ブランチに応じて自動的に環境が選択されます：

| ブランチ | 環境 | 用途 |
|---------|------|------|
| `main` | production | 本番デプロイ |
| `develop` | development | 開発・検証用 |

1. **マイグレーション実行** (`migrate-database.yml`)
   - `pnpm prisma migrate deploy` を実行
   - 対象環境の Supabase Cloud にスキーマ変更を適用

2. **API デプロイ** (`deploy-api.yml`)
   - マイグレーション成功後に実行
   - Docker イメージをビルド・プッシュ
   - AWS App Runner を更新

### 手動実行

各ワークフローは GitHub Actions の **Actions** タブから手動実行可能。
手動実行時は環境（development / production）を選択できます。

### マイグレーションの作成（ローカル）

```bash
cd packages/database

# マイグレーションファイルを作成
pnpm prisma migrate dev --name <migration_name>

# 変更をコミット・プッシュ
git add src/prisma/migrations/
git commit -m "chore(db): add migration <migration_name>"
git push origin main
```

## 参考

- [Supabase CLI ドキュメント](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase Database 接続](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Docker ネットワーク](https://docs.docker.com/network/)
