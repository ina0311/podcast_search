# AWS インフラ構成

## アーキテクチャ

```
┌─────────────┐
│   Vercel    │  admin-ui (SPA)
│  (Frontend) │
└──────┬──────┘
       │ HTTPS
       │
┌──────▼─────────────────────────────────────┐
│           AWS                              │
│  ┌──────────────────────────────────────┐   │
│  │  App Runner Service                  │   │
│  │  (自動 HTTPS エンドポイント)          │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
       │                          │
       │ HTTPS                    │ HTTPS
       │                          │
       ▼                          ▼
┌──────────────┐          ┌──────────────┐
│  Supabase    │          │ Qdrant Cloud │
│  PostgreSQL  │          │  (推奨)      │
│  (外部)      │          └──────────────┘
└──────────────┘
```

**注意**: VPC Connector は不要（Supabase は外部サービスなので直接 HTTPS 接続）

## インフラ構築方法

詳細は [`terraform/README.md`](./terraform/README.md) を参照してください。

### クイックスタート

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集
terraform init
terraform plan
terraform apply
```

## 1. Supabase PostgreSQL

AWS RDS の代わりに Supabase（外部サービス）を使用します。

### セットアップ手順

1. [Supabase](https://supabase.com) でアカウント作成
2. 新規プロジェクトを作成
3. 接続文字列を取得（Session モード推奨）
4. Terraform の `database_url` 変数に設定

詳細は [`docs/deployment.md`](../../docs/deployment.md) を参照してください。

## 2. Qdrant

### オプション A: Qdrant Cloud（推奨・簡単）

1. https://cloud.qdrant.io でアカウント作成
2. 無料クラスタを作成
3. API キーとエンドポイントを取得
4. Terraform の `qdrant_url` と `qdrant_api_key` 変数に設定

### オプション B: ローカル Docker（開発用）

```bash
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant:latest
```

## 3. App Runner 環境変数

Terraform で自動設定されます。以下の変数を `terraform.tfvars` で設定:

| 変数名 | 説明 |
|--------|------|
| `database_url` | Supabase の接続文字列 |
| `allowed_origins` | CORS 許可オリジン（Vercel の URL） |
| `qdrant_url` | Qdrant Cloud URL（オプション） |
| `qdrant_api_key` | Qdrant Cloud API キー（オプション） |
| `openai_api_key` | OpenAI API キー（オプション） |

## 4. セキュリティ

- App Runner は自動で HTTPS を提供（証明書管理不要）
- Supabase は HTTPS 接続必須
- CORS は Vercel のドメインのみ許可
- 環境変数は Terraform の `sensitive = true` で保護

## コスト目安（月額、1年経過後）

| サービス | 構成 | 概算 |
|---------|------|------|
| App Runner | 0.25 vCPU, 0.5GB（低トラフィック） | ~$3.11 |
| Amazon ECR | ストレージ 1-2GB | ~$0.10-0.20 |
| Supabase | 無料枠内（500MB、50,000 MAU） | $0 |
| Qdrant Cloud | 無料枠内（1GB RAM、4GB ディスク） | $0 |
| Vercel | 無料枠内（Hobby Plan） | $0 |
| **合計** | | **~$3.21-3.31/月** |

詳細なコスト計算は [`docs/deployment.md`](../../docs/deployment.md) を参照してください。


