#!/bin/bash

# Environment Check Script for Podcast Search
# 環境の問題を診断し、解決策を提案します

set -e

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🔍 Podcast Search 環境診断中...${NC}"

# OS検出
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo -e "${BLUE}OS: ${MACHINE}${NC}"

# 基本ツールの確認
check_basic_tools() {
    echo -e "${YELLOW}🛠️  基本ツールをチェック中...${NC}"
    
    # curl
    if command -v curl &> /dev/null; then
        echo -e "${GREEN}✅ curl: $(curl --version | head -n1)${NC}"
    else
        echo -e "${RED}❌ curl が見つかりません${NC}"
        echo -e "${BLUE}インストール方法:${NC}"
        if [[ "$MACHINE" == "Mac" ]]; then
            echo -e "${BLUE}  brew install curl${NC}"
        else
            echo -e "${BLUE}  sudo apt update && sudo apt install curl${NC}"
        fi
    fi
    
    # git
    if command -v git &> /dev/null; then
        echo -e "${GREEN}✅ git: $(git --version)${NC}"
    else
        echo -e "${RED}❌ git が見つかりません${NC}"
    fi
    
    # Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✅ Node.js: ${NODE_VERSION}${NC}"
        
        # バージョンチェック
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            echo -e "${YELLOW}⚠️  Node.js v18以上を推奨します${NC}"
        fi
    else
        echo -e "${RED}❌ Node.js が見つかりません${NC}"
        echo -e "${BLUE}インストール方法:${NC}"
        if [[ "$MACHINE" == "Mac" ]]; then
            echo -e "${BLUE}  brew install node${NC}"
        else
            echo -e "${BLUE}  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -${NC}"
            echo -e "${BLUE}  sudo apt-get install -y nodejs${NC}"
        fi
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
    else
        echo -e "${YELLOW}⚠️  npm が見つかりません（Node.jsと一緒にインストールされるはずです）${NC}"
    fi
    
    # pnpm
    if command -v pnpm &> /dev/null; then
        echo -e "${GREEN}✅ pnpm: $(pnpm --version)${NC}"
    else
        echo -e "${YELLOW}⚠️  pnpm が見つかりません${NC}"
        echo -e "${BLUE}インストール方法:${NC}"
        echo -e "${BLUE}  curl -fsSL https://get.pnpm.io/install.sh | sh -${NC}"
        echo -e "${BLUE}  または: npm install -g pnpm@10.14.0${NC}"
    fi
}

# データベースツールの確認
check_database_tools() {
    echo -e "${YELLOW}🗃️  データベースツールをチェック中...${NC}"
    
    # PostgreSQL
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL: $(psql --version)${NC}"
        
        # サービス状態の確認
        if [[ "$MACHINE" == "Mac" ]]; then
            if brew services list | grep postgresql | grep started &> /dev/null; then
                echo -e "${GREEN}✅ PostgreSQL サービスが起動中${NC}"
            else
                echo -e "${YELLOW}⚠️  PostgreSQL サービスが停止中${NC}"
                echo -e "${BLUE}起動方法: brew services start postgresql@16${NC}"
            fi
        else
            if systemctl is-active --quiet postgresql; then
                echo -e "${GREEN}✅ PostgreSQL サービスが起動中${NC}"
            else
                echo -e "${YELLOW}⚠️  PostgreSQL サービスが停止中${NC}"
                echo -e "${BLUE}起動方法: sudo systemctl start postgresql${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ PostgreSQL が見つかりません${NC}"
        echo -e "${BLUE}インストール方法:${NC}"
        if [[ "$MACHINE" == "Mac" ]]; then
            echo -e "${BLUE}  brew install postgresql@16${NC}"
            echo -e "${BLUE}  brew services start postgresql@16${NC}"
        else
            echo -e "${BLUE}  sudo apt update${NC}"
            echo -e "${BLUE}  sudo apt install postgresql postgresql-contrib${NC}"
            echo -e "${BLUE}  sudo systemctl start postgresql${NC}"
        fi
    fi
    
    # Qdrant
    if command -v qdrant &> /dev/null; then
        echo -e "${GREEN}✅ Qdrant: $(qdrant --version)${NC}"
    else
        echo -e "${YELLOW}⚠️  Qdrant が見つかりません${NC}"
        echo -e "${BLUE}自動インストール: ./install.sh${NC}"
    fi
}

# 権限の確認
check_permissions() {
    echo -e "${YELLOW}🔐 権限をチェック中...${NC}"
    
    # npm global インストール権限
    if command -v npm &> /dev/null; then
        NPM_PREFIX=$(npm config get prefix)
        if [[ -w "$NPM_PREFIX" ]]; then
            echo -e "${GREEN}✅ npm global インストール権限あり${NC}"
        else
            echo -e "${YELLOW}⚠️  npm global インストール権限なし${NC}"
            echo -e "${BLUE}解決方法: npm config set prefix '~/.npm-global'${NC}"
            echo -e "${BLUE}PATH追加: export PATH=~/.npm-global/bin:\$PATH${NC}"
        fi
    fi
    
    # sudo権限（Linux）
    if [[ "$MACHINE" == "Linux" ]]; then
        if sudo -n true 2>/dev/null; then
            echo -e "${GREEN}✅ sudo権限あり${NC}"
        else
            echo -e "${YELLOW}⚠️  sudo権限が必要な場合があります${NC}"
        fi
    fi
}

# ポート使用状況の確認
check_ports() {
    echo -e "${YELLOW}🌐 ポート使用状況をチェック中...${NC}"
    
    ports=(3001 5173 5432 6333)
    port_names=("API Server" "Admin UI" "PostgreSQL" "Qdrant")
    
    for i in "${!ports[@]}"; do
        port=${ports[$i]}
        name=${port_names[$i]}
        
        if [[ "$MACHINE" == "Mac" ]]; then
            if lsof -i :$port &> /dev/null; then
                echo -e "${YELLOW}⚠️  ポート $port ($name) が使用中${NC}"
                lsof -i :$port
            else
                echo -e "${GREEN}✅ ポート $port ($name) が利用可能${NC}"
            fi
        else
            if ss -tulpn | grep ":$port " &> /dev/null; then
                echo -e "${YELLOW}⚠️  ポート $port ($name) が使用中${NC}"
                ss -tulpn | grep ":$port "
            else
                echo -e "${GREEN}✅ ポート $port ($name) が利用可能${NC}"
            fi
        fi
    done
}

# 推奨アクション
recommend_actions() {
    echo ""
    echo -e "${GREEN}📋 推奨アクション:${NC}"
    echo -e "${BLUE}1. 基本ツールをインストール:${NC}"
    if [[ "$MACHINE" == "Mac" ]]; then
        echo -e "${BLUE}   - Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
        echo -e "${BLUE}   - Node.js: brew install node${NC}"
        echo -e "${BLUE}   - PostgreSQL: brew install postgresql@16${NC}"
    else
        echo -e "${BLUE}   - Node.js: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs${NC}"
        echo -e "${BLUE}   - PostgreSQL: sudo apt update && sudo apt install postgresql postgresql-contrib${NC}"
    fi
    
    echo -e "${BLUE}2. pnpmをインストール:${NC}"
    echo -e "${BLUE}   curl -fsSL https://get.pnpm.io/install.sh | sh -${NC}"
    
    echo -e "${BLUE}3. プロジェクトをセットアップ:${NC}"
    echo -e "${BLUE}   ./install.sh${NC}"
    
    echo -e "${BLUE}4. Background Servicesを起動:${NC}"
    echo -e "${BLUE}   ./start-background-services.sh${NC}"
}

# メイン実行
main() {
    check_basic_tools
    echo ""
    check_database_tools
    echo ""
    check_permissions
    echo ""
    check_ports
    recommend_actions
    
    echo ""
    echo -e "${GREEN}🎯 環境診断完了！${NC}"
}

# コマンドライン引数の処理
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "使用方法: $0"
        echo ""
        echo "このスクリプトは環境の問題を診断し、解決策を提案します。"
        ;;
    *)
        main
        ;;
esac
