# Python 3.10をベースイメージとして使用
FROM python:3.10-slim

# 環境変数を設定
ENV PYTHONUNBUFFERED True
ENV APP_HOME /app
WORKDIR $APP_HOME

# バックエンドのrequirements.txtをコピーしてインストール
COPY app/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY app/ ./

# コンテナがリッスンするポートを指定
EXPOSE 8080

# アプリケーションを実行するコマンド
# Cloud Runが設定するPORT環境変数を使用
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "8", "--timeout", "0", "api_server:app"]