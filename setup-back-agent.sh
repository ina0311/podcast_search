#!/bin/bash

# Back Agent Setup Script for Podcast Search
# Cursor back agent向けの簡易セットアップスクリプト

set -e

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🤖 Back Agent Setup for Podcast Search${NC}"

# OS検出
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo -e "${BLUE}環境: ${MACHINE}${NC}"

# 基本要件チェック
check_basic_requirements() {
    echo -e "${YELLOW}📋 基本要件チェック中...${NC}"
    
    # Node.js確認
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js が必要です${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    
    # pnpm確認
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}⚠️ pnpm をインストール中...${NC}"
        npm install -g pnpm
    fi
    echo -e "${GREEN}✅ pnpm: $(pnpm --version)${NC}"
    
    return 0
}

# 依存関係インストール
install_dependencies() {
    echo -e "${YELLOW}📦 依存関係をインストール中...${NC}"
    
    # frozen-lockfileでインストール試行、失敗したら通常インストール
    if [ -f pnpm-lock.yaml ]; then
        if ! pnpm install --frozen-lockfile 2>/dev/null; then
            echo -e "${YELLOW}⚠️ lockfileが古いため、通常インストールを実行します${NC}"
            pnpm install
        fi
    else
        pnpm install
    fi
    
    echo -e "${GREEN}✅ 依存関係インストール完了${NC}"
}

# パッケージビルド
build_packages() {
    echo -e "${YELLOW}🔨 パッケージをビルド中...${NC}"
    
    pnpm run build:packages
    
    echo -e "${GREEN}✅ パッケージビルド完了${NC}"
}

# 環境変数チェック
check_environment() {
    echo -e "${YELLOW}🔧 環境変数をチェック中...${NC}"
    
    # .env.local ファイルの存在確認
    if [ ! -f apps/api/.env.local ]; then
        echo -e "${YELLOW}環境変数ファイルを作成中...${NC}"
        
        # データベースURL（ローカル用）
        if [[ "$MACHINE" == "Mac" ]]; then
            DB_URL="postgresql://$(whoami)@localhost:5432/podcast"
        else
            DB_URL="postgresql://$(whoami)@localhost:5432/podcast"
        fi
        
        # .env.local作成
        cat > apps/api/.env.local << EOF
# Database (Local PostgreSQL)
DATABASE_URL="${DB_URL}"

# Vector Database (Local Qdrant)
QDRANT_URL="http://localhost:6333"

# OpenAI (必要に応じて設定してください)
OPENAI_API_KEY="your-openai-api-key-here"

# Server
PORT=3001
NODE_ENV=development

# Logging
LOG_LEVEL=info
EOF
        echo -e "${GREEN}✅ 環境変数ファイルを作成しました${NC}"
    else
        echo -e "${GREEN}✅ 環境変数ファイルが存在します${NC}"
    fi
}

# データベースサービス確認
check_database_services() {
    echo -e "${YELLOW}🗃️ データベースサービスをチェック中...${NC}"
    
    # PostgreSQL確認
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL インストール済み${NC}"
        
        # データベース接続確認
        if psql -d podcast -c '\q' &> /dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL 接続可能${NC}"
        else
            echo -e "${YELLOW}⚠️ PostgreSQL データベース「podcast」が見つかりません${NC}"
            echo -e "${BLUE}データベースを作成中...${NC}"
            createdb podcast 2>/dev/null || echo -e "${YELLOW}データベースは既に存在するか、作成できません${NC}"
        fi
    else
        echo -e "${RED}❌ PostgreSQL が見つかりません${NC}"
        echo -e "${BLUE}PostgreSQL をインストールしてください:${NC}"
        if [[ "$MACHINE" == "Mac" ]]; then
            echo -e "${BLUE}  brew install postgresql@16${NC}"
            echo -e "${BLUE}  brew services start postgresql@16${NC}"
        else
            echo -e "${BLUE}  sudo apt install postgresql postgresql-contrib${NC}"
        fi
        return 1
    fi
    
    # Qdrant確認
    if command -v qdrant &> /dev/null; then
        echo -e "${GREEN}✅ Qdrant インストール済み${NC}"
    else
        echo -e "${YELLOW}⚠️ Qdrant が見つかりません${NC}"
        echo -e "${BLUE}./install.sh を実行してQdrantをインストールしてください${NC}"
        return 1
    fi
    
    return 0
}

# データベース初期化
initialize_database() {
    echo -e "${YELLOW}🗃️ データベースを初期化中...${NC}"
    
    # Prismaクライアント生成
    pnpm run db:generate
    
    # マイグレーション実行
    pnpm run db:migrate
    
    echo -e "${GREEN}✅ データベース初期化完了${NC}"
}

# 簡易接続テスト
test_connections() {
    echo -e "${YELLOW}🧪 接続テスト中...${NC}"
    
    # PostgreSQL接続テスト
    if psql -d podcast -c '\q' &> /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL: 接続成功${NC}"
    else
        echo -e "${RED}❌ PostgreSQL: 接続失敗${NC}"
        return 1
    fi
    
    return 0
}

# 完了メッセージ
show_completion() {
    echo ""
    echo -e "${GREEN}🎉 Back Agent セットアップ完了！${NC}"
    echo "========================================"
    echo -e "${BLUE}次のステップ:${NC}"
    echo -e "1. Background Services起動: ${GREEN}./start-background-services.sh${NC}"
    echo -e "2. 開発サーバー起動: ${GREEN}pnpm run dev${NC}"
    echo ""
    echo -e "${BLUE}利用可能なURL:${NC}"
    echo -e "- API Server:  ${GREEN}http://localhost:3001${NC}"
    echo -e "- Admin UI:    ${GREEN}http://localhost:5173${NC}"
}

# エラーハンドリング
error_handler() {
    echo -e "${RED}❌ セットアップ中にエラーが発生しました${NC}"
    echo -e "${YELLOW}詳細なセットアップが必要な場合は ./install.sh を実行してください${NC}"
    exit 1
}

trap error_handler ERR

# メイン実行
main() {
    check_basic_requirements
    install_dependencies
    build_packages
    check_environment
    
    # データベース関連は必須ではないため、エラーでも続行
    if check_database_services; then
        initialize_database
        test_connections
    else
        echo -e "${YELLOW}⚠️ データベースサービスのセットアップをスキップしました${NC}"
        echo -e "${BLUE}完全なセットアップには ./install.sh を実行してください${NC}"
    fi
    
    show_completion
}

# コマンドライン引数処理
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "使用方法: $0"
        echo ""
        echo "Back Agent用の簡易セットアップスクリプト"
        echo "完全なセットアップには ./install.sh を使用してください"
        ;;
    *)
        main
        ;;
esac
