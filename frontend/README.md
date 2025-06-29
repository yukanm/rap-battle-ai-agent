# AIエージェントチャット UI

React + TypeScript + Tailwind CSSで構築されたモダンなチャットインターフェースです。

## 機能

- ✅ リアルタイムチャット
- ✅ チャット履歴保持
- ✅ ローディング状態表示
- ✅ レスポンシブデザイン
- ✅ セッション管理
- ✅ エラーハンドリング

## セットアップ

### 依存関係のインストール

```bash
cd frontend
npm install
```

### 開発サーバーの起動

```bash
npm start
```

ブラウザで `http://localhost:3000` にアクセスしてください。

### ビルド

```bash
npm run build
```

## 使用方法

1. バックエンドAPIサーバー（`http://localhost:8080`）が起動していることを確認
2. ブラウザでチャットアプリにアクセス
3. メッセージを入力してAIエージェントと会話
4. 「新しいセッション」ボタンでチャット履歴をリセット

## 技術スタック

- React 18
- TypeScript
- Tailwind CSS
- Lucide React（アイコン）
- clsx（条件付きクラス名） 