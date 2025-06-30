# Step 1: ビルド環境の準備
FROM node:18 AS build

WORKDIR /app

# 依存関係のファイルをコピー (npm ci のため lock ファイルも必須)
COPY package.json package-lock.json ./

# ★変更点: npm ci を使って依存関係を厳密にインストール
RUN npm ci

# ソースコード全体をコピー
COPY . .

# Reactアプリをビルド
# ★変更: REACT_APP_API_URL をビルド時に渡す
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Step 2: 本番環境の準備
FROM nginx:1.25-alpine

# envsubst をインストール (alpineベースのNginxイメージには通常含まれていないため)
RUN apk add --no-cache gettext

# ビルド成果物（静的ファイル）をNginxの公開ディレクトリにコピー
COPY --from=build /app/build /usr/share/nginx/html

# カスタムNginx設定ファイルをコピー
# Nginxのメイン設定ファイルを上書きする
COPY nginx.conf /etc/nginx/nginx.conf

# コンテナがリッスンするポートを指定
EXPOSE 8080

# ★変更: Nginxを起動する前に環境変数を設定ファイルに埋め込む
# /etc/nginx/nginx.conf はNginxのメイン設定ファイル
CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp && mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]