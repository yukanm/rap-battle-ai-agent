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
RUN npm run build

# Step 2: 本番環境の準備
FROM nginx:1.25-alpine

# ビルド成果物（静的ファイル）をNginxの公開ディレクトリにコピー
COPY --from=build /app/build /usr/share/nginx/html

# コンテナがリッスンするポートを指定
EXPOSE 8080

# Nginxを起動
CMD ["nginx", "-g", "daemon off;"]
