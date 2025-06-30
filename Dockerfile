# Python 3.10をベースイメージとして使用
FROM python:3.10-slim

# 環境変数を設定
ENV PYTHONUNBUFFERED True
ENV APP_HOME /app
ENV DOCKER_ENV true
ENV PORT 8080

# Dialogflow CX設定（デフォルト値）
ENV DIALOGFLOW_PROJECT_ID rap-agent-202506
ENV DIALOGFLOW_LOCATION_ID asia-northeast1
ENV DIALOGFLOW_AGENT_ID 135b32f7-45b4-4781-8c58-9fe4044dbfa2
ENV DIALOGFLOW_LANGUAGE_CODE ja-JP

WORKDIR $APP_HOME

# システムパッケージの更新と必要なツールのインストール
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# バックエンドのrequirements.txtをコピーしてインストール
COPY app/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY app/ /app/

# 認証情報ファイルをコピー
COPY rap-agent-202506-974cb26c7c90.json ./

# GOOGLE_APPLICATION_CREDENTIALS 環境変数を設定
ENV GOOGLE_APPLICATION_CREDENTIALS /app/rap-agent-202506-974cb26c7c90.json

# ヘルスチェック用のスクリプトを作成
RUN echo '#!/bin/bash\ncurl -f http://localhost:${PORT:-8080}/health || exit 1' > /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh

# コンテナがリッスンするポートを指定
EXPOSE 8080

# ヘルスチェックを設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /app/healthcheck.sh

# アプリケーションを実行するコマンド
# 複数の起動方法を試行する堅牢なスクリプト
CMD ["sh", "-c", "cd /app && python -m uvicorn api_server:app --host 0.0.0.0 --port ${PORT:-8080} --log-level info"]