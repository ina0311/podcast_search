#!/usr/bin/env bash

# Podcast Search Installation Script - Back Agent用
# 必要最小限の構成でPodcast Searchをセットアップします

set -euo pipefail

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🤖 Podcast Search - Back Agent インストール${NC}"
echo -e "${BLUE}💻 Linux専用（Ubuntu/Debian）- 最適化構成${NC}"

# 基本要件チェック
check_prerequisites() {
    echo -e "${YELLOW}📋 基本要件をチェック中...${NC}"
    
    # OS確認
    if [ ! -f /etc/os-release ]; then
        echo -e "${RED}❌ Linux環境が必要です${NC}"
        exit 1
    fi
    
    # 基本パッケージインストール（jq削除）
    echo -e "${BLUE}システムパッケージを更新中...${NC}"
    sudo apt-get update
    sudo apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
    
    echo -e "${GREEN}✅ 基本要件チェック完了${NC}"
}

# Node.js & pnpmインストール（シンプル版）
install_nodejs_pnpm() {
    echo -e "${YELLOW}📦 Node.js & pnpm をインストール中...${NC}"
    
    # Node.js (NodeSource LTS)
    if ! command -v node &> /dev/null; then
        echo -e "${BLUE}Node.js LTS をインストール中...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # pnpm
    if ! command -v pnpm &> /dev/null; then
        echo -e "${BLUE}pnpm をインストール中...${NC}"
        curl -fsSL https://get.pnpm.io/install.sh | sh -
        export PNPM_HOME="$HOME/.local/share/pnpm"
        export PATH="$PNPM_HOME:$PATH"
        echo 'export PNPM_HOME="$HOME/.local/share/pnpm"' >> ~/.bashrc
        echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc
        
        # 現在のセッションでpnpmを有効化
        source ~/.bashrc 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Node.js: $(node --version), pnpm: $(pnpm --version)${NC}"
}

## DockerやDBサーバーのセットアップはBack Agentのservicesに委譲
# （environment.jsonのservicesで自動起動されるため、ここでは何もしません）

# 環境設定（OpenAI API キー必須の注意追加）
setup_environment() {
    echo -e "${YELLOW}🔧 環境設定中...${NC}"
    
    # .env.local作成
    cat > apps/api/.env.local << EOF
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/podcast"

# Vector Database
QDRANT_URL="http://localhost:6333"

# Server
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# OpenAI API Key (必須 - 検索機能に使用)
OPENAI_API_KEY="your-openai-api-key-here"
EOF
    
    echo -e "${GREEN}✅ 環境設定完了${NC}"
    echo -e "${YELLOW}⚠️  重要: apps/api/.env.local でOpenAI API キーを設定してください${NC}"
}

# プロジェクト依存関係
install_project_dependencies() {
    echo -e "${YELLOW}📚 プロジェクト依存関係をインストール中...${NC}"
    
    # プロジェクトディレクトリの確認
    if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
        echo -e "${RED}❌ Podcast Searchプロジェクトディレクトリで実行してください${NC}"
        exit 1
    fi
    
    # 依存関係インストール（ビルドやマイグレーションはsetupに委譲）
    echo -e "${BLUE}依存関係をインストール中...${NC}"
    pnpm install
    
    echo -e "${GREEN}✅ プロジェクト依存関係インストール完了${NC}"
}

## データベース初期化はsetupに委譲（db:generate / db:migrate はenvironment.jsonが実行）

# 完了メッセージ（シンプル版）
show_completion() {
    echo ""
    echo -e "${GREEN}🎉 Back Agent インストール完了！${NC}"
    echo "========================================"
    echo -e "${BLUE}インストール済みバージョン:${NC}"
    if command -v node &> /dev/null; then
        echo -e "- Node.js: ${GREEN}$(node --version)${NC}"
    fi
    if command -v pnpm &> /dev/null; then
        echo -e "- pnpm: ${GREEN}$(pnpm --version)${NC}"
    fi
    echo ""
    echo -e "${YELLOW}⚠️  重要な設定:${NC}"
    echo -e "- OpenAI API キー: ${GREEN}apps/api/.env.local${NC} で設定してください"
    echo ""
    echo -e "${BLUE}次のステップ:${NC}"
    echo -e "1. DockerサービスはBack Agentのservicesで自動起動されます"
    echo -e "2. setupで自動実行: ${GREEN}build:packages / db:generate / db:migrate${NC}"
    echo -e "3. startでアプリ起動: ${GREEN}pnpm run dev${NC}"
    echo ""
    echo -e "${BLUE}サービスURL（Docker自動起動後）:${NC}"
    echo -e "- API Server:  ${GREEN}http://localhost:3001${NC}"
    echo -e "- Admin UI:    ${GREEN}http://localhost:5173${NC}"
    echo -e "- PostgreSQL:  ${GREEN}localhost:5432${NC}"
    echo -e "- Qdrant:      ${GREEN}http://localhost:6333${NC}"
}

# エラーハンドリング
error_handler() {
    echo -e "${RED}❌ インストール中にエラーが発生しました${NC}"
    exit 1
}

trap error_handler ERR

# メイン実行
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}Podcast Search Back Agent セットアップ開始${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    check_prerequisites
    install_nodejs_pnpm
    setup_environment
    install_project_dependencies
    show_completion
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}✅ install-back-agent.sh finished${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# メイン実行
main
