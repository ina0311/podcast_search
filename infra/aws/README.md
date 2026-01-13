# AWS インフラ構成

## アーキテクチャ

```
                    ┌─────────────────────────────────────────┐
                    │              VPC (10.0.0.0/16)          │
                    │                                         │
┌──────────┐        │  ┌─────────────────────────────────┐   │
│  Vercel  │ ─────► │  │      Public Subnet              │   │
│ admin-ui │  HTTPS │  │  ┌───────────┐  ┌───────────┐   │   │
└──────────┘        │  │  │App Runner │  │  Qdrant   │   │   │
                    │  │  │   API     │  │   EC2     │   │   │
                    │  │  └─────┬─────┘  └─────┬─────┘   │   │
                    │  └────────┼──────────────┼─────────┘   │
                    │           │              │             │
                    │  ┌────────┼──────────────┼─────────┐   │
                    │  │        ▼   Private Subnet       │   │
                    │  │  ┌───────────┐                  │   │
                    │  │  │    RDS    │                  │   │
                    │  │  │ PostgreSQL│                  │   │
                    │  │  └───────────┘                  │   │
                    │  └─────────────────────────────────┘   │
                    └─────────────────────────────────────────┘
```

## 1. RDS PostgreSQL

### AWS CLI で作成

```bash
# サブネットグループ作成
aws rds create-db-subnet-group \
  --db-subnet-group-name podcast-db-subnet \
  --db-subnet-group-description "Podcast DB subnet group" \
  --subnet-ids subnet-xxx subnet-yyy

# RDS インスタンス作成
aws rds create-db-instance \
  --db-instance-identifier podcast-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username postgres \
  --master-user-password <YOUR_PASSWORD> \
  --allocated-storage 20 \
  --db-name podcast \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name podcast-db-subnet \
  --no-publicly-accessible \
  --backup-retention-period 7
```

### 接続文字列

```
DATABASE_URL=postgresql://postgres:<PASSWORD>@podcast-db.xxx.ap-northeast-1.rds.amazonaws.com:5432/podcast
```

## 2. Qdrant

### オプション A: Qdrant Cloud（推奨・簡単）

1. https://cloud.qdrant.io でアカウント作成
2. 無料クラスタを作成
3. API キーとエンドポイントを取得

```
QDRANT_URL=https://xxx-xxx.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your-api-key
```

### オプション B: EC2 にセルフホスト

```bash
# EC2 インスタンス作成後、Docker で起動
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant:latest
```

## 3. App Runner 環境変数

App Runner コンソールで以下を設定：

| 変数名 | 値 |
|--------|-----|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | `postgresql://postgres:<PASSWORD>@<RDS_ENDPOINT>:5432/podcast` |
| `QDRANT_URL` | `https://xxx.cloud.qdrant.io:6333` |
| `OPENAI_API_KEY` | `sk-xxx` |

## 4. セキュリティグループ

### App Runner → RDS
- RDS のセキュリティグループで App Runner VPC Connector からの 5432 を許可

### App Runner → Qdrant Cloud
- アウトバウンド HTTPS (443) を許可（デフォルトで許可済み）

## コスト目安（月額）

| サービス | 構成 | 概算 |
|---------|------|------|
| App Runner | 0.25 vCPU, 0.5GB | ~$5 |
| RDS | db.t4g.micro | ~$15 |
| Qdrant Cloud | Free tier | $0 |
| **合計** | | **~$20/月** |


