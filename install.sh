#!/bin/bash

# Podcast Search Installation Script - npm完全回避版
# Ubuntu環境でのnpmエラーを完全に回避し、背景エージェントを起動します

set -e

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🚀 Podcast Search セットアップ開始${NC}"
echo -e "${BLUE}💻 npm完全回避版（Ubuntu最適化）${NC}"

# OS検出
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo -e "${BLUE}検出されたOS: ${MACHINE}${NC}"

# 基本要件チェック
check_prerequisites() {
    echo -e "${YELLOW}📋 基本要件をチェック中...${NC}"
    
    # curl確認
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ curl が必要です${NC}"
        if [[ "$MACHINE" == "Linux" ]]; then
            echo -e "${BLUE}インストール: sudo apt update && sudo apt install curl${NC}"
        else
            echo -e "${BLUE}インストール: brew install curl${NC}"
        fi
        exit 1
    fi
    
    # Node.js確認（npmは使わない）
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}Node.js をインストールしています...${NC}"
        install_nodejs
    else
        NODE_VERSION=$(node --version | sed 's/v//')
        echo -e "${GREEN}✅ Node.js: v${NODE_VERSION}${NC}"
    fi
}

# Node.jsインストール（npm使わず）
install_nodejs() {
    if [[ "$MACHINE" == "Linux" ]]; then
        echo -e "${BLUE}Ubuntu/Debian用Node.jsをインストール中...${NC}"
        
        # NodeSourceリポジトリからインストール
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
        # インストール確認
        if command -v node &> /dev/null; then
            echo -e "${GREEN}✅ Node.js インストール完了: $(node --version)${NC}"
        else
            echo -e "${RED}❌ Node.js インストールに失敗${NC}"
            exit 1
        fi
    else
        echo -e "${BLUE}macOS用Node.jsをインストール中...${NC}"
        if command -v brew &> /dev/null; then
            brew install node
        else
            echo -e "${RED}❌ Homebrew が必要です: https://brew.sh${NC}"
            exit 1
        fi
    fi
}

# pnpm直接インストール（npm完全回避）
install_pnpm() {
    echo -e "${YELLOW}📦 pnpm を直接インストール中...${NC}"
    
    if command -v pnpm &> /dev/null; then
        echo -e "${GREEN}✅ pnpm は既にインストール済み: $(pnpm --version)${NC}"
        return 0
    fi
    
    # 公式インストールスクリプトを使用（npm使わず）
    echo -e "${BLUE}pnpm公式インストーラーを使用...${NC}"
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    
    # 環境変数設定
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
    
    # シェル設定に追加
    SHELL_RC=""
    if [[ "$SHELL" == *"zsh"* ]]; then
        SHELL_RC="$HOME/.zshrc"
    else
        SHELL_RC="$HOME/.bashrc"
    fi
    
    # PATH設定をシェル設定に追加（重複チェック）
    if ! grep -q "PNPM_HOME" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# pnpm" >> "$SHELL_RC"
        echo 'export PNPM_HOME="$HOME/.local/share/pnpm"' >> "$SHELL_RC"
        echo 'export PATH="$PNPM_HOME:$PATH"' >> "$SHELL_RC"
        echo -e "${GREEN}✅ PATH設定を ${SHELL_RC} に追加${NC}"
    fi
    
    # 現在のセッションで有効化
    source "$SHELL_RC" 2>/dev/null || true
    
    # インストール確認
    if command -v pnpm &> /dev/null; then
        echo -e "${GREEN}✅ pnpm インストール完了: $(pnpm --version)${NC}"
    else
        echo -e "${RED}❌ pnpm インストール失敗${NC}"
        echo -e "${YELLOW}手動でPATHを設定してください:${NC}"
        echo -e "${BLUE}export PATH=\"\$HOME/.local/share/pnpm:\$PATH\"${NC}"
        exit 1
    fi
}

# PostgreSQLインストール
install_postgresql() {
    echo -e "${YELLOW}🐘 PostgreSQL をセットアップ中...${NC}"
    
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL は既にインストール済み${NC}"
        start_postgresql
        return 0
    fi
    
    if [[ "$MACHINE" == "Linux" ]]; then
        echo -e "${BLUE}Ubuntu用PostgreSQLをインストール中...${NC}"
        
        # PostgreSQL公式リポジトリを追加
        sudo apt update
        sudo apt install -y postgresql postgresql-contrib
        
        # サービス開始
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        
        # ユーザー設定
        sudo -u postgres createuser --superuser $(whoami) 2>/dev/null || echo "ユーザーは既に存在します"
        
    else
        echo -e "${BLUE}macOS用PostgreSQLをインストール中...${NC}"
        if command -v brew &> /dev/null; then
            brew install postgresql@16
            brew services start postgresql@16
        else
            echo -e "${RED}❌ Homebrew が必要です${NC}"
            exit 1
        fi
    fi
    
    # データベース作成
    createdb podcast 2>/dev/null || echo "データベース'podcast'は既に存在します"
    echo -e "${GREEN}✅ PostgreSQL セットアップ完了${NC}"
}

# PostgreSQL起動
start_postgresql() {
    if [[ "$MACHINE" == "Linux" ]]; then
        if ! systemctl is-active --quiet postgresql; then
            sudo systemctl start postgresql
            echo -e "${GREEN}✅ PostgreSQL サービスを起動しました${NC}"
        else
            echo -e "${GREEN}✅ PostgreSQL は既に起動中です${NC}"
        fi
    else
        if ! brew services list | grep postgresql | grep started &> /dev/null; then
            brew services start postgresql@16 || brew services start postgresql
            echo -e "${GREEN}✅ PostgreSQL サービスを起動しました${NC}"
        else
            echo -e "${GREEN}✅ PostgreSQL は既に起動中です${NC}"
        fi
    fi
}

# Qdrantインストール
install_qdrant() {
    echo -e "${YELLOW}🔍 Qdrant をセットアップ中...${NC}"
    
    if command -v qdrant &> /dev/null; then
        echo -e "${GREEN}✅ Qdrant は既にインストール済み${NC}"
        return 0
    fi
    
    # インストールディレクトリ作成
    mkdir -p ~/.local/bin
    
    # OS別バイナリダウンロード
    QDRANT_VERSION="v1.8.1"
    if [[ "$MACHINE" == "Linux" ]]; then
        echo -e "${BLUE}Linux用Qdrantをダウンロード中...${NC}"
        curl -L "https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/qdrant-x86_64-unknown-linux-gnu.tar.gz" | tar xz -C ~/.local/bin
    else
        echo -e "${BLUE}macOS用Qdrantをダウンロード中...${NC}"
        curl -L "https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/qdrant-x86_64-apple-darwin.tar.gz" | tar xz -C ~/.local/bin
    fi
    
    # PATH追加
    if ! echo $PATH | grep -q "$HOME/.local/bin"; then
        export PATH="$HOME/.local/bin:$PATH"
        
        # シェル設定に追加
        SHELL_RC=""
        if [[ "$SHELL" == *"zsh"* ]]; then
            SHELL_RC="$HOME/.zshrc"
        else
            SHELL_RC="$HOME/.bashrc"
        fi
        
        if ! grep -q "$HOME/.local/bin" "$SHELL_RC" 2>/dev/null; then
            echo "" >> "$SHELL_RC"
            echo "# Local binaries" >> "$SHELL_RC"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
        fi
    fi
    
    # 実行権限付与
    chmod +x ~/.local/bin/qdrant
    
    if command -v qdrant &> /dev/null; then
        echo -e "${GREEN}✅ Qdrant インストール完了${NC}"
    else
        echo -e "${RED}❌ Qdrant インストール失敗${NC}"
        exit 1
    fi
}

# 環境変数設定
setup_environment() {
    echo -e "${YELLOW}🔧 環境変数をセットアップ中...${NC}"
    
    # データベースURL（ローカル用）
    if [[ "$MACHINE" == "Linux" ]]; then
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
    
    echo -e "${GREEN}✅ 環境変数設定完了${NC}"
    echo -e "${YELLOW}⚠️  OpenAI API Keyを apps/api/.env.local に設定してください${NC}"
}

# プロジェクト依存関係インストール
install_project_dependencies() {
    echo -e "${YELLOW}📚 プロジェクト依存関係をインストール中...${NC}"
    
    # pnpmコマンドが使用可能か確認
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}❌ pnpm が見つかりません${NC}"
        exit 1
    fi
    
    # 依存関係インストール
    pnpm install --frozen-lockfile
    
    echo -e "${GREEN}✅ 依存関係インストール完了${NC}"
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

# パッケージビルド
build_packages() {
    echo -e "${YELLOW}🔨 パッケージをビルド中...${NC}"
    
    pnpm run build:packages
    
    echo -e "${GREEN}✅ パッケージビルド完了${NC}"
}

# 接続テスト
test_connections() {
    echo -e "${YELLOW}🧪 接続テスト中...${NC}"
    
    # PostgreSQL接続テスト
    if psql -d podcast -c '\q' &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL: 接続成功${NC}"
    else
        echo -e "${RED}❌ PostgreSQL: 接続失敗${NC}"
    fi
}

# サービス停止
stop_services() {
    echo -e "${YELLOW}⏹️ サービスを停止中...${NC}"
    
    # 実行中のプロセス停止
    pkill -f "qdrant" 2>/dev/null || true
    pkill -f "pnpm.*dev" 2>/dev/null || true
    
    # PIDファイル削除
    rm -f qdrant.pid api.pid admin-ui.pid
    rm -f *.log
    
    echo -e "${GREEN}✅ サービス停止完了${NC}"
}

# 状態確認
check_status() {
    echo -e "${YELLOW}📊 インストール状態を確認中...${NC}"
    
    # 基本ツール
    echo -e "${BLUE}基本ツール:${NC}"
    command -v node && echo -e "${GREEN}✅ Node.js: $(node --version)${NC}" || echo -e "${RED}❌ Node.js${NC}"
    command -v pnpm && echo -e "${GREEN}✅ pnpm: $(pnpm --version)${NC}" || echo -e "${RED}❌ pnpm${NC}"
    command -v psql && echo -e "${GREEN}✅ PostgreSQL: $(psql --version | head -n1)${NC}" || echo -e "${RED}❌ PostgreSQL${NC}"
    command -v qdrant && echo -e "${GREEN}✅ Qdrant${NC}" || echo -e "${RED}❌ Qdrant${NC}"
    
    # データベース接続
    echo ""
    echo -e "${BLUE}データベース接続:${NC}"
    if psql -d podcast -c '\q' &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL: 接続可能${NC}"
    else
        echo -e "${RED}❌ PostgreSQL: 接続不可${NC}"
    fi
}

# 完了メッセージ
show_completion() {
    echo ""
    echo -e "${GREEN}🎉 インストール完了！${NC}"
    echo "========================================"
    echo -e "${BLUE}次のステップ:${NC}"
    echo -e "1. OpenAI API Keyを設定: ${GREEN}nano apps/api/.env.local${NC}"
    echo -e "2. Background Services起動: ${GREEN}./start-background-services.sh${NC}"
    echo -e "3. 手動開発: ${GREEN}pnpm run dev${NC}"
    echo ""
    echo -e "${BLUE}サービスURL:${NC}"
    echo -e "- API Server:  ${GREEN}http://localhost:3001${NC}"
    echo -e "- Admin UI:    ${GREEN}http://localhost:5173${NC}"
    echo -e "- PostgreSQL:  ${GREEN}localhost:5432${NC}"
    echo -e "- Qdrant:      ${GREEN}http://localhost:6333${NC}"
}

# メイン実行
main() {
    check_prerequisites
    install_pnpm
    install_postgresql
    install_qdrant
    setup_environment
    install_project_dependencies
    initialize_database
    build_packages
    test_connections
    show_completion
}

# エラーハンドリング
error_handler() {
    echo -e "${RED}❌ エラーが発生しました。クリーンアップ中...${NC}"
    stop_services
    exit 1
}

trap error_handler ERR

# コマンドライン引数処理
case "${1:-}" in
    "status")
        check_status
        ;;
    "stop")
        stop_services
        ;;
    "clean")
        echo -e "${YELLOW}🧹 完全クリーンアップ中...${NC}"
        stop_services
        rm -rf node_modules
        rm -rf ~/.local/share/pnpm/store
        echo -e "${GREEN}✅ クリーンアップ完了${NC}"
        ;;
    "help"|"-h"|"--help")
        echo "使用方法: $0 [COMMAND]"
        echo ""
        echo "COMMANDS:"
        echo "  (なし)   フルインストール実行"
        echo "  status   インストール状態確認"
        echo "  stop     サービス停止"
        echo "  clean    完全クリーンアップ"
        echo "  help     このヘルプを表示"
        ;;
    *)
        main
        ;;
esac
