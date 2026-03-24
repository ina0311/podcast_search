# Terraform インフラコード

このディレクトリには AWS App Runner と ECR を構築するための Terraform コードが含まれています。

## 前提条件

- Terraform v1.0 以上がインストールされていること
- AWS CLI が設定されていること（`aws configure`）
- 適切な AWS 権限があること（ECR、App Runner、IAM の作成権限）

## セットアップ

### 1. 変数ファイルの作成

```bash
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を編集して、実際の値を設定してください。

### 2. Terraform の初期化

```bash
terraform init
```

### 3. 実行計画の確認

```bash
terraform plan
```

### 4. インフラの構築

```bash
terraform apply
```

確認プロンプトで `yes` を入力します。

## 出力値

デプロイ後、以下のコマンドで出力値を確認できます:

```bash
# App Runner の URL
terraform output app_runner_service_url

# ECR リポジトリの URL
terraform output ecr_repository_url
```

## リソース

この Terraform コードは以下のリソースを作成します:

- **ECR リポジトリ**: Docker イメージを保存
- **ECR ライフサイクルポリシー**: 古いイメージを自動削除（最新10個を保持）
- **IAM ロール**: App Runner が ECR からイメージを取得するための権限
- **App Runner サービス**: API を実行するコンテナサービス
- **App Runner オートスケーリング設定**: インスタンス数の自動調整

## 更新

### イメージタグの更新

新しい Docker イメージをデプロイする場合:

```bash
terraform apply -var="ecr_image_tag=新しいタグ"
```

### 環境変数の更新

`terraform.tfvars` を編集して `terraform apply` を実行します。

## 削除

すべてのリソースを削除する場合:

```bash
terraform destroy
```

**注意**: このコマンドはすべてのリソースを削除します。ECR のイメージも削除されるため、必要なイメージは事前にバックアップしてください。

## トラブルシューティング

### エラー: "Error creating App Runner service"

- IAM ロールが正しく作成されているか確認
- ECR リポジトリが存在するか確認
- イメージが ECR にプッシュされているか確認

### エラー: "Error pulling image"

- ECR のイメージタグが正しいか確認
- IAM ロールに ECR アクセス権限があるか確認
