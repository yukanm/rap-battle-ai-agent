# AIエージェントチャットアプリケーション

Dialogflow CXを使用したAIエージェントとチャットできるWebアプリケーションです。

## 構成

- **フロントエンド**: React + TypeScript + Tailwind CSS
- **バックエンド**: FastAPI + Python
- **AI**: Google Cloud Dialogflow CX

## セットアップ

### 1. 環境準備

```bash
# Python仮想環境のアクティベート
source venv/bin/activate

# 依存関係のインストール
pip install -r requirements.txt
```

### 2. 環境変数の設定

`rap-agent-202506-974cb26c7c90.json`ファイルがプロジェクトルートに配置されていることを確認してください。

### 3. バックエンドAPIサーバーの起動

```bash
python -m uvicorn app.api_server:app --host 0.0.0.0 --port 8081 --reload
```

### 4. フロントエンドの起動

```bash
cd frontend
npm install
npm start
```

## 使用方法

1. ブラウザで `http://localhost:3000` にアクセス
2. チャットボックスにメッセージを入力
3. AIエージェントとの会話を開始
4. 「新しいセッション」ボタンでチャット履歴をリセット

## 機能

### フロントエンド機能
- ✅ リアルタイムチャット
- ✅ チャット履歴保持
- ✅ ローディング状態表示
- ✅ レスポンシブデザイン
- ✅ セッション管理
- ✅ エラーハンドリング

### バックエンド機能
- ✅ Dialogflow CX API連携
- ✅ セッション管理
- ✅ CORS対応
- ✅ 音声認識（STT）
- ✅ 音声合成（TTS）

## ファイル構成

```
googleagenthackathon/
├── frontend/                 # Reactアプリ
│   ├── src/
│   │   ├── components/      # Reactコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── types/          # TypeScript型定義
│   │   └── App.tsx         # メインアプリ
│   └── package.json
├── app/                     # Pythonバックエンド
│   ├── api_server.py       # FastAPIサーバー
│   ├── dialogflow_client.py # Dialogflow CXクライアント
│   ├── stt.py              # 音声認識
│   └── tts.py              # 音声合成
├── main.py                 # コンソール版チャット
├── api_client_test.py      # APIテスト
└── requirements.txt        # Python依存関係
```

## 開発

### フロントエンド開発

```bash
cd frontend
npm start
```

### バックエンド開発

```bash
python -m uvicorn app.api_server:app --reload --port 8081
```

### APIテスト

```bash
python api_client_test.py
```

## トラブルシューティング

### モジュールが見つからないエラー

```bash
# 仮想環境をアクティベート
source venv/bin/activate

# パッケージを再インストール
pip install google-cloud-dialogflow-cx
```

### CORSエラー

バックエンドAPIサーバーが起動していることを確認してください。

### ポートが使用中

```bash
# ポート8081の使用状況を確認
lsof -i :8081

# プロセスを終了
kill -9 <PID>
```

## ライセンス

MIT License 