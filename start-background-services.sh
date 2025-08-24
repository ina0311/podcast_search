#!/bin/bash

# Background Services Start Script for Podcast Search
# 本スクリプトはPodcast Searchのbackground agent（ローカル版）を起動します

set -e  # エラー時に終了

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Podcast Search Background Services 起動中...${NC}"
echo -e "${BLUE}💻 ローカルインストール版（Docker不要）${NC}"

# 環境確認
check_prerequisites() {
    echo -e "${YELLOW}📋 前提条件をチェックしています...${NC}"
    
    # pnpm確認
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}❌ pnpm が見つかりません。./install.sh を実行してください${NC}"
        exit 1
    fi
    
    # PostgreSQL確認
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ PostgreSQL が見つかりません。./install.sh を実行してください${NC}"
        exit 1
    fi
    
    # Qdrant確認
    if ! command -v qdrant &> /dev/null; then
        echo -e "${RED}❌ Qdrant が見つかりません。./install.sh を実行してください${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ すべての前提条件が満たされています${NC}"
}

# ローカルサービスの起動
start_local_services() {
    echo -e "${YELLOW}🐘 PostgreSQL と Qdrant を起動しています...${NC}"
    
    # PostgreSQLサービスの起動確認
    OS="$(uname -s)"
    case "${OS}" in
        Darwin*)    
            if ! brew services list | grep postgresql | grep started &> /dev/null; then
                echo -e "${YELLOW}PostgreSQL サービスを起動しています...${NC}"
                brew services start postgresql@16 || brew services start postgresql
            fi
            ;;
        Linux*)     
            if ! systemctl is-active --quiet postgresql; then
                echo -e "${YELLOW}PostgreSQL サービスを起動しています...${NC}"
                sudo systemctl start postgresql
            fi
            ;;
    esac
    
    # PostgreSQLの接続確認
    echo -e "${BLUE}PostgreSQL の接続を確認しています...${NC}"
    max_attempts=10
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if psql -d podcast -c '\q' &> /dev/null; then
            echo -e "${GREEN}✅ PostgreSQL が利用可能です${NC}"
            break
        fi
        attempt=$((attempt + 1))
        echo -e "${YELLOW}PostgreSQL の接続を待っています... (${attempt}/${max_attempts})${NC}"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ PostgreSQL への接続がタイムアウトしました${NC}"
        exit 1
    fi
    
    # Qdrantの起動
    echo -e "${BLUE}Qdrant を起動しています...${NC}"
    if [ ! -f qdrant.pid ] || ! ps -p $(cat qdrant.pid) > /dev/null 2>&1; then
        mkdir -p ~/.qdrant/storage
        nohup qdrant > qdrant-local.log 2>&1 & echo $! > qdrant.pid
        echo -e "${GREEN}✅ Qdrant を起動しました${NC}"
    else
        echo -e "${GREEN}✅ Qdrant は既に起動中です${NC}"
    fi
    
    # Qdrantの接続確認
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:6333/collections &> /dev/null; then
            echo -e "${GREEN}✅ Qdrant が利用可能です${NC}"
            break
        fi
        attempt=$((attempt + 1))
        echo -e "${YELLOW}Qdrant の起動を待っています... (${attempt}/${max_attempts})${NC}"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Qdrant の起動がタイムアウトしました${NC}"
        exit 1
    fi
}

# API サーバーの起動（バックグラウンド）
start_api_server() {
    echo -e "${YELLOW}🌐 API サーバーを起動しています...${NC}"
    
    # 環境変数ファイルの確認
    if [ ! -f apps/api/.env.local ]; then
        echo -e "${RED}❌ apps/api/.env.local が見つかりません${NC}"
        echo -e "${YELLOW}./install.sh を実行して環境変数を設定してください${NC}"
        exit 1
    fi
    
    # API サーバーをバックグラウンドで起動
    echo -e "${BLUE}API サーバーを起動中... (http://localhost:3001)${NC}"
    nohup pnpm run dev:api > api.log 2>&1 & echo $! > api.pid
    
    # 起動確認
    sleep 5
    attempt=0
    max_attempts=10
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3001/episodes &> /dev/null; then
            echo -e "${GREEN}✅ API サーバーが起動しました${NC}"
            break
        fi
        attempt=$((attempt + 1))
        echo -e "${YELLOW}API サーバーの起動を待っています... (${attempt}/${max_attempts})${NC}"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ API サーバーの起動がタイムアウトしました${NC}"
        echo -e "${YELLOW}ログを確認してください: tail -f api.log${NC}"
        exit 1
    fi
}

# Admin UIの起動（バックグラウンド）
start_admin_ui() {
    echo -e "${YELLOW}💻 Admin UI を起動しています...${NC}"
    
    # Admin UIをバックグラウンドで起動
    echo -e "${BLUE}Admin UI を起動中... (http://localhost:5173)${NC}"
    nohup pnpm run dev:admin-ui > admin-ui.log 2>&1 & echo $! > admin-ui.pid
    
    # 起動確認
    sleep 5
    attempt=0
    max_attempts=10
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:5173 &> /dev/null; then
            echo -e "${GREEN}✅ Admin UI が起動しました${NC}"
            break
        fi
        attempt=$((attempt + 1))
        echo -e "${YELLOW}Admin UI の起動を待っています... (${attempt}/${max_attempts})${NC}"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Admin UI の起動がタイムアウトしました${NC}"
        echo -e "${YELLOW}ログを確認してください: tail -f admin-ui.log${NC}"
        exit 1
    fi
}

# サービスの状態確認
check_services_status() {
    echo -e "${YELLOW}📊 サービス状態を確認しています...${NC}"
    
    echo -e "${BLUE}データベース接続:${NC}"
    if psql -d podcast -c '\q' &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL: 接続可能${NC}"
    else
        echo -e "${RED}❌ PostgreSQL: 接続不可${NC}"
    fi
    
    if curl -f http://localhost:6333/collections &> /dev/null; then
        echo -e "${GREEN}✅ Qdrant: 接続可能${NC}"
    else
        echo -e "${RED}❌ Qdrant: 接続不可${NC}"
    fi
    
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
    
    if [ -f api.pid ]; then
        api_pid=$(cat api.pid)
        if ps -p $api_pid > /dev/null; then
            echo -e "${GREEN}✅ API Server (PID: $api_pid)${NC}"
        else
            echo -e "${RED}❌ API Server (プロセスが見つかりません)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  API Server PIDファイルが見つかりません${NC}"
    fi
    
    if [ -f admin-ui.pid ]; then
        ui_pid=$(cat admin-ui.pid)
        if ps -p $ui_pid > /dev/null; then
            echo -e "${GREEN}✅ Admin UI (PID: $ui_pid)${NC}"
        else
            echo -e "${RED}❌ Admin UI (プロセスが見つかりません)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Admin UI PIDファイルが見つかりません${NC}"
    fi
}

# サービスの停止
stop_services() {
    echo -e "${YELLOW}⏹️  すべてのサービスを停止しています...${NC}"
    
    # Qdrantの停止
    if [ -f qdrant.pid ]; then
        qdrant_pid=$(cat qdrant.pid)
        if ps -p $qdrant_pid > /dev/null; then
            kill $qdrant_pid
            echo -e "${GREEN}✅ Qdrant を停止しました${NC}"
        fi
        rm -f qdrant.pid
    fi
    
    # API サーバーの停止
    if [ -f api.pid ]; then
        api_pid=$(cat api.pid)
        if ps -p $api_pid > /dev/null; then
            kill $api_pid
            echo -e "${GREEN}✅ API Server を停止しました${NC}"
        fi
        rm -f api.pid
    fi
    
    # Admin UIの停止
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

# サービス情報の表示
show_service_info() {
    echo ""
    echo -e "${GREEN}🎉 すべてのBackground Servicesが起動しました！${NC}"
    echo "========================================"
    echo -e "${BLUE}サービスURL:${NC}"
    echo -e "  API Server:  ${GREEN}http://localhost:3001${NC}"
    echo -e "  Admin UI:    ${GREEN}http://localhost:5173${NC}"
    echo -e "  PostgreSQL:  ${GREEN}localhost:5432${NC}"
    echo -e "  Qdrant:      ${GREEN}http://localhost:6333${NC}"
    echo ""
    echo -e "${BLUE}ログファイル:${NC}"
    echo -e "  API Server:  ${GREEN}tail -f api.log${NC}"
    echo -e "  Admin UI:    ${GREEN}tail -f admin-ui.log${NC}"
    echo ""
    echo -e "${BLUE}管理コマンド:${NC}"
    echo -e "  状態確認:    ${GREEN}./start-background-services.sh status${NC}"
    echo -e "  サービス停止: ${GREEN}./start-background-services.sh stop${NC}"
    echo -e "  Docker停止:  ${GREEN}./start-background-services.sh docker-stop${NC}"
}

# エラーハンドリング
cleanup_on_error() {
    echo -e "${RED}❌ エラーが発生しました。クリーンアップを実行しています...${NC}"
    stop_services
    exit 1
}

# SIGINTやSIGTERMでのクリーンアップ
trap cleanup_on_error INT TERM ERR

# メイン実行
main() {
    check_prerequisites
    start_local_services
    start_api_server
    start_admin_ui
    show_service_info
}

# コマンドライン引数の処理
case "${1:-}" in
    "status")
        check_services_status
        ;;
    "stop")
        stop_services
        ;;
    "stop-db")
        echo -e "${YELLOW}🗃️  データベースサービスのみを停止しています...${NC}"
        if [ -f qdrant.pid ]; then
            qdrant_pid=$(cat qdrant.pid)
            if ps -p $qdrant_pid > /dev/null; then
                kill $qdrant_pid
                echo -e "${GREEN}✅ Qdrant を停止しました${NC}"
            fi
            rm -f qdrant.pid
        fi
        ;;
    "restart")
        echo -e "${YELLOW}🔄 サービスを再起動しています...${NC}"
        stop_services
        sleep 2
        main
        ;;
    "logs")
        if [ -n "${2:-}" ]; then
            case "$2" in
                "api")
                    tail -f api.log
                    ;;
                "ui"|"admin-ui")
                    tail -f admin-ui.log
                    ;;
                *)
                    echo "使用方法: $0 logs [api|ui]"
                    ;;
            esac
        else
            echo "すべてのログを表示します..."
            echo -e "${BLUE}=== API Log ===${NC}"
            tail -n 20 api.log 2>/dev/null || echo "APIログが見つかりません"
            echo -e "${BLUE}=== Admin UI Log ===${NC}"
            tail -n 20 admin-ui.log 2>/dev/null || echo "Admin UIログが見つかりません"
        fi
        ;;
    "help"|"-h"|"--help")
        echo "使用方法: $0 [COMMAND]"
        echo ""
        echo "COMMANDS:"
        echo "  (なし)       すべてのbackground servicesを起動"
        echo "  status       サービス状態を確認"
        echo "  stop         すべてのサービスを停止"
        echo "  stop-db      データベースサービスのみを停止"
        echo "  restart      サービスを再起動"
        echo "  logs [api|ui] ログを表示"
        echo "  help         このヘルプを表示"
        ;;
    *)
        main
        ;;
esac
