#!/bin/bash

# Podcast Search Linux Installation Script - Back Agent用
# Cursor Back Agent向けの最適化されたインストールスクリプト

set -e

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🤖 Podcast Search - Back Agent インストール${NC}"
echo -e "${BLUE}💻 Linux専用（Ubuntu/Debian）${NC}"

# 基本要件チェック
check_prerequisites() {
    echo -e "${YELLOW}📋 基本要件をチェック中...${NC}"
    
    # OS確認
    if [ ! -f /etc/os-release ]; then
        echo -e "${RED}❌ Linux環境が必要です${NC}"
        exit 1
    fi
    
    # 基本パッケージインストール
    echo -e "${BLUE}システムパッケージを更新中...${NC}"
    sudo apt update
    sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
    
    echo -e "${GREEN}✅ 基本要件チェック完了${NC}"
}

# Node.js & pnpmインストール
install_nodejs_pnpm() {
    echo -e "${YELLOW}📦 Node.js & pnpm をインストール中...${NC}"
    
    # Node.js (NodeSource)
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # pnpm
    if ! command -v pnpm &> /dev/null; then
        curl -fsSL https://get.pnpm.io/install.sh | sh -
        export PNPM_HOME="$HOME/.local/share/pnpm"
        export PATH="$PNPM_HOME:$PATH"
        echo 'export PNPM_HOME="$HOME/.local/share/pnpm"' >> ~/.bashrc
        echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc
    fi
    
    echo -e "${GREEN}✅ Node.js: $(node --version), pnpm: $(pnpm --version)${NC}"
}

# PostgreSQLインストール
install_postgresql() {
    echo -e "${YELLOW}🐘 PostgreSQL をインストール中...${NC}"
    
    if ! command -v psql &> /dev/null; then
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        
        # データベースとユーザー作成
        sudo -u postgres createuser --superuser postgres 2>/dev/null || true
        sudo -u postgres createdb podcast 2>/dev/null || true
        
        # パスワード設定（back agent用）
        sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ PostgreSQL インストール完了${NC}"
}

# Qdrantインストール
install_qdrant() {
    echo -e "${YELLOW}🔍 Qdrant をインストール中...${NC}"
    
    if ! command -v qdrant &> /dev/null; then
        mkdir -p ~/.local/bin
        
        # Qdrant バイナリダウンロード
        QDRANT_VERSION="v1.8.1"
        curl -L "https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/qdrant-x86_64-unknown-linux-gnu.tar.gz" | tar xz -C ~/.local/bin
        chmod +x ~/.local/bin/qdrant
        
        # PATH追加
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    echo -e "${GREEN}✅ Qdrant インストール完了${NC}"
}

# プロジェクト依存関係
install_project_dependencies() {
    echo -e "${YELLOW}📚 プロジェクト依存関係をインストール中...${NC}"
    
    # 依存関係インストール
    pnpm install
    
    # パッケージビルド
    pnpm run build:packages
    
    echo -e "${GREEN}✅ プロジェクト依存関係インストール完了${NC}"
}

# 環境設定
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

# OpenAI (必要に応じて設定)
OPENAI_API_KEY="your-openai-api-key-here"
EOF
    
    echo -e "${GREEN}✅ 環境設定完了${NC}"
}

# データベース初期化
initialize_database() {
    echo -e "${YELLOW}🗃️ データベース初期化中...${NC}"
    
    # PostgreSQL起動確認
    sudo systemctl start postgresql
    
    # Prisma設定
    pnpm run db:generate
    pnpm run db:migrate
    
    echo -e "${GREEN}✅ データベース初期化完了${NC}"
}

# 完了メッセージ
show_completion() {
    echo ""
    echo -e "${GREEN}🎉 Back Agent インストール完了！${NC}"
    echo "========================================"
    echo -e "${BLUE}利用可能なコマンド:${NC}"
    echo -e "- プロジェクト開始: ${GREEN}pnpm run dev${NC}"
    echo -e "- Background Services: ${GREEN}./start-background-services.sh${NC}"
    echo ""
    echo -e "${BLUE}サービスURL:${NC}"
    echo -e "- API Server:  ${GREEN}http://localhost:3001${NC}"
    echo -e "- Admin UI:    ${GREEN}http://localhost:5173${NC}"
}

# エラーハンドリング
error_handler() {
    echo -e "${RED}❌ インストール中にエラーが発生しました${NC}"
    exit 1
}

trap error_handler ERR

# メイン実行
main() {
    check_prerequisites
    install_nodejs_pnpm
    install_postgresql
    install_qdrant
    setup_environment
    install_project_dependencies
    initialize_database
    show_completion
}

# コマンドライン引数処理
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "使用方法: $0"
        echo "Cursor Back Agent向けLinux専用インストールスクリプト"
        ;;
    *)
        main
        ;;
esac
