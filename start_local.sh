#!/bin/bash

# ローカル開発用起動スクリプト
set -e

echo "=== ローカル開発サーバー起動 ==="

# 環境変数を設定
export DOCKER_ENV=false
export PORT=8081

# 必要なディレクトリに移動
cd app

# 依存関係の確認
echo "依存関係を確認中..."
if [ ! -f "requirements.txt" ]; then
    echo "エラー: requirements.txtが見つかりません"
    exit 1
fi

# Python仮想環境の確認（オプション）
if [ -d "../venv" ]; then
    echo "仮想環境を有効化中..."
    source ../venv/bin/activate
fi

# サーバー起動
echo "FastAPIサーバーを起動中..."
echo "URL: http://localhost:8081"
echo "ヘルスチェック: http://localhost:8081/health"
echo "API Docs: http://localhost:8081/docs"
echo ""
echo "終了するには Ctrl+C を押してください"
echo ""

python -m uvicorn api_server:app --host 0.0.0.0 --port 8081 --reload --log-level info 