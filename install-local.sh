#!/bin/bash

# Podcast Search Local Installation Script (Docker不要)
# Docker Desktop を使わずにローカルインストールでbackground agentを起動します

set -e

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🚀 Podcast Search ローカルインストール開始...${NC}"
echo -e "${YELLOW}⚠️  この方法はDocker Desktopを使用しません${NC}"

# OS検出
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo -e "${BLUE}検出されたOS: ${MACHINE}${NC}"

# PostgreSQLのローカルインストール確認
check_postgresql() {
    echo -e "${YELLOW}🐘 PostgreSQL をチェックしています...${NC}"
    
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL が見つかりました${NC}"
        
        # PostgreSQLサービスの状態確認
        if [[ "$MACHINE" == "Mac" ]]; then
            if brew services list | grep postgresql | grep started &> /dev/null; then
                echo -e "${GREEN}✅ PostgreSQL サービスが起動中です${NC}"
            else
                echo -e "${YELLOW}PostgreSQL サービスを起動しています...${NC}"
                brew services start postgresql@16 || brew services start postgresql
            fi
        else
            # Linux の場合
            if systemctl is-active --quiet postgresql; then
                echo -e "${GREEN}✅ PostgreSQL サービスが起動中です${NC}"
            else
                echo -e "${YELLOW}PostgreSQL サービスを起動しています...${NC}"
                sudo systemctl start postgresql
            fi
        fi
    else
        echo -e "${RED}❌ PostgreSQL が見つかりません${NC}"
        echo -e "${YELLOW}インストール方法:${NC}"
        if [[ "$MACHINE" == "Mac" ]]; then
            echo -e "${BLUE}  brew install postgresql@16${NC}"
            echo -e "${BLUE}  brew services start postgresql@16${NC}"
        else
            echo -e "${BLUE}  sudo apt update && sudo apt install postgresql postgresql-contrib${NC}"
            echo -e "${BLUE}  sudo systemctl start postgresql${NC}"
        fi
        exit 1
    fi
}

# Qdrantのローカルインストール確認
check_qdrant() {
    echo -e "${YELLOW}🔍 Qdrant をチェックしています...${NC}"
    
    if command -v qdrant &> /dev/null; then
        echo -e "${GREEN}✅ Qdrant が見つかりました${NC}"
    else
        echo -e "${YELLOW}Qdrant をインストールしています...${NC}"
        
        if [[ "$MACHINE" == "Mac" ]]; then
            # macOS用のインストール
            if ! command -v brew &> /dev/null; then
                echo -e "${RED}❌ Homebrew が必要です: https://brew.sh${NC}"
                exit 1
            fi
            
            # Qdrantバイナリのダウンロード
            QDRANT_VERSION="v1.8.1"
            echo -e "${BLUE}Qdrant ${QDRANT_VERSION} をダウンロードしています...${NC}"
            
            mkdir -p ~/.local/bin
            curl -L "https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/qdrant-x86_64-apple-darwin.tar.gz" | tar xz -C ~/.local/bin
            
            # PATHに追加
            if ! echo $PATH | grep -q "$HOME/.local/bin"; then
                echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
                export PATH="$HOME/.local/bin:$PATH"
            fi
            
        else
            # Linux用のインストール
            QDRANT_VERSION="v1.8.1"
            echo -e "${BLUE}Qdrant ${QDRANT_VERSION} をダウンロードしています...${NC}"
            
            mkdir -p ~/.local/bin
            curl -L "https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/qdrant-x86_64-unknown-linux-gnu.tar.gz" | tar xz -C ~/.local/bin
            
            # PATHに追加
            if ! echo $PATH | grep -q "$HOME/.local/bin"; then
                echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
                export PATH="$HOME/.local/bin:$PATH"
            fi
        fi
        
        echo -e "${GREEN}✅ Qdrant がインストールされました${NC}"
    fi
}

# データベース設定
setup_database() {
    echo -e "${YELLOW}🗃️  データベースを設定しています...${NC}"
    
    # PostgreSQL データベース作成
    if [[ "$MACHINE" == "Mac" ]]; then
        # macOSの場合
        DB_USER=$(whoami)
        createdb podcast 2>/dev/null || echo "データベース 'podcast' は既に存在します"
    else
        # Linuxの場合
        sudo -u postgres createdb podcast 2>/dev/null || echo "データベース 'podcast' は既に存在します"
        sudo -u postgres createuser -s $(whoami) 2>/dev/null || echo "ユーザー '$(whoami)' は既に存在します"
    fi
    
    echo -e "${GREEN}✅ データベースが設定されました${NC}"
}

# 環境変数設定（ローカル用）
setup_local_environment() {
    echo -e "${YELLOW}🔧 ローカル用環境変数を設定しています...${NC}"
    
    if [[ "$MACHINE" == "Mac" ]]; then
        DB_URL="postgresql://$(whoami)@localhost:5432/podcast"
    else
        DB_URL="postgresql://$(whoami)@localhost:5432/podcast"
    fi
    
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
    
    echo -e "${GREEN}✅ ローカル用環境変数が設定されました${NC}"
    echo -e "${YELLOW}⚠️  OpenAI API Keyを apps/api/.env.local に設定してください${NC}"
}

# Qdrantサービス起動
start_qdrant() {
    echo -e "${YELLOW}🚀 Qdrant を起動しています...${NC}"
    
    # Qdrant設定ディレクトリ作成
    mkdir -p ~/.qdrant/storage
    
    # Qdrantを背景で起動
    nohup qdrant --config-path ~/.qdrant/config.yaml > qdrant-local.log 2>&1 & echo $! > qdrant.pid
    
    # 起動確認
    sleep 3
    max_attempts=10
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:6333/collections &> /dev/null; then
            echo -e "${GREEN}✅ Qdrant が起動しました${NC}"
            break
        fi
        attempt=$((attempt + 1))
        echo -e "${YELLOW}Qdrant の起動を待っています... (${attempt}/${max_attempts})${NC}"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Qdrant の起動がタイムアウトしました${NC}"
        echo -e "${YELLOW}ログを確認してください: tail -f qdrant-local.log${NC}"
        exit 1
    fi
}

# 依存関係インストール
install_dependencies() {
    echo -e "${YELLOW}📚 依存関係をインストールしています...${NC}"
    
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}pnpm をインストールしています...${NC}"
        npm install -g pnpm@10.14.0
    fi
    
    corepack enable || echo "corepackの有効化をスキップ"
    corepack prepare pnpm@10.14.0 --activate || echo "pnpmの準備をスキップ"
    
    pnpm install --frozen-lockfile
    echo -e "${GREEN}✅ 依存関係のインストールが完了しました${NC}"
}

# データベース初期化
initialize_database() {
    echo -e "${YELLOW}🗃️  データベースを初期化しています...${NC}"
    
    pnpm run db:generate
    pnpm run db:migrate
    
    echo -e "${GREEN}✅ データベースの初期化が完了しました${NC}"
}

# ビルド
build_packages() {
    echo -e "${YELLOW}🔨 パッケージをビルドしています...${NC}"
    
    pnpm run build:packages
    
    echo -e "${GREEN}✅ パッケージのビルドが完了しました${NC}"
}

# サービス停止
stop_local_services() {
    echo -e "${YELLOW}⏹️  ローカルサービスを停止しています...${NC}"
    
    # Qdrant停止
    if [ -f qdrant.pid ]; then
        qdrant_pid=$(cat qdrant.pid)
        if ps -p $qdrant_pid > /dev/null; then
            kill $qdrant_pid
            echo -e "${GREEN}✅ Qdrant を停止しました${NC}"
        fi
        rm -f qdrant.pid
    fi
    
    # API サーバーとAdmin UI停止（start-background-services.shと共通）
    if [ -f api.pid ]; then
        api_pid=$(cat api.pid)
        if ps -p $api_pid > /dev/null; then
            kill $api_pid
            echo -e "${GREEN}✅ API Server を停止しました${NC}"
        fi
        rm -f api.pid
    fi
    
    if [ -f admin-ui.pid ]; then
        ui_pid=$(cat admin-ui.pid)
        if ps -p $ui_pid > /dev/null; then
            kill $ui_pid
            echo -e "${GREEN}✅ Admin UI を停止しました${NC}"
        fi
        rm -f admin-ui.pid
    fi
    
    # ログファイルのクリーンアップ
    rm -f qdrant-local.log api.log admin-ui.log
    echo -e "${GREEN}✅ ログファイルをクリーンアップしました${NC}"
}

# 状態確認
check_local_status() {
    echo -e "${YELLOW}📊 ローカルサービス状態:${NC}"
    
    # PostgreSQL
    if command -v psql &> /dev/null; then
        if psql -d podcast -c '\q' &> /dev/null; then
            echo -e "${GREEN}✅ PostgreSQL: 接続可能${NC}"
        else
            echo -e "${RED}❌ PostgreSQL: 接続不可${NC}"
        fi
    else
        echo -e "${RED}❌ PostgreSQL: インストールされていません${NC}"
    fi
    
    # Qdrant
    if curl -f http://localhost:6333/collections &> /dev/null; then
        echo -e "${GREEN}✅ Qdrant: 接続可能${NC}"
    else
        echo -e "${RED}❌ Qdrant: 接続不可${NC}"
    fi
    
    # プロセス確認
    echo ""
    echo -e "${BLUE}プロセス情報:${NC}"
    if [ -f qdrant.pid ]; then
        qdrant_pid=$(cat qdrant.pid)
        if ps -p $qdrant_pid > /dev/null; then
            echo -e "${GREEN}✅ Qdrant (PID: $qdrant_pid)${NC}"
        else
            echo -e "${RED}❌ Qdrant (プロセスが見つかりません)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Qdrant PIDファイルが見つかりません${NC}"
    fi
}

# メイン実行
main() {
    echo -e "${GREEN}🎯 Podcast Search Local Installation${NC}"
    echo "========================================"
    
    check_postgresql
    check_qdrant
    setup_database
    setup_local_environment
    install_dependencies
    initialize_database
    build_packages
    start_qdrant
    
    echo ""
    echo -e "${GREEN}🎉 ローカルインストールが完了しました！${NC}"
    echo "========================================"
    
    check_local_status
    
    echo ""
    echo -e "${BLUE}次のステップ:${NC}"
    echo -e "1. apps/api/.env.local でOpenAI API Keyを設定"
    echo -e "2. API サーバーを起動: ${GREEN}pnpm run dev:api${NC}"
    echo -e "3. Admin UI を起動: ${GREEN}pnpm run dev:admin-ui${NC}"
    echo -e "4. または両方同時に: ${GREEN}pnpm run dev${NC}"
}

# コマンドライン引数の処理
case "${1:-}" in
    "status")
        check_local_status
        ;;
    "stop")
        stop_local_services
        ;;
    "help"|"-h"|"--help")
        echo "使用方法: $0 [COMMAND]"
        echo ""
        echo "COMMANDS:"
        echo "  (なし)   ローカルインストールを実行"
        echo "  status   サービス状態を確認"
        echo "  stop     ローカルサービスを停止"
        echo "  help     このヘルプを表示"
        ;;
    *)
        main
        ;;
esac
