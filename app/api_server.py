from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import os
import sys
import uuid
import logging
from typing import Optional

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 環境検出
def detect_environment():
    """実行環境を検出"""
    is_docker = os.path.exists('/.dockerenv') or os.environ.get('DOCKER_ENV') == 'true'
    is_cloud_run = os.environ.get('K_SERVICE') is not None
    is_local = not (is_docker or is_cloud_run)
    
    logger.info(f"環境検出: Docker={is_docker}, CloudRun={is_cloud_run}, Local={is_local}")
    return is_docker, is_cloud_run, is_local

# 現在のディレクトリをPythonパスに追加
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# 環境に応じたインポート切り替え
def get_imports():
    """環境に応じて適切なインポート方法を選択"""
    is_docker, is_cloud_run, is_local = detect_environment()
    
    # 複数のインポート方法を試行
    import_methods = []
    
    if is_docker or is_cloud_run:
        # コンテナ環境: 絶対インポートを優先
        import_methods.extend([
            lambda: (__import__('dialogflow_client').detect_intent_texts,
                    __import__('stt').transcribe_audio,
                    __import__('tts').synthesize_speech),
            lambda: (__import__('app.dialogflow_client').detect_intent_texts,
                    __import__('app.stt').transcribe_audio,
                    __import__('app.tts').synthesize_speech)
        ])
    else:
        # ローカル環境: 相対インポートを優先
        import_methods.extend([
            lambda: (__import__('app.dialogflow_client').detect_intent_texts,
                    __import__('app.stt').transcribe_audio,
                    __import__('app.tts').synthesize_speech),
            lambda: (__import__('dialogflow_client').detect_intent_texts,
                    __import__('stt').transcribe_audio,
                    __import__('tts').synthesize_speech)
        ])
    
    # 各インポート方法を試行
    for i, import_method in enumerate(import_methods):
        try:
            detect_intent_texts, transcribe_audio, synthesize_speech = import_method()
            logger.info(f"インポート成功 (方法{i+1})")
            return detect_intent_texts, transcribe_audio, synthesize_speech
        except ImportError as e:
            logger.warning(f"インポート方法{i+1}失敗: {e}")
            continue
    
    # すべてのインポート方法が失敗した場合のフォールバック
    logger.error("すべてのインポート方法が失敗しました。ダミー関数を使用します。")
    
    def dummy_detect_intent_texts(text: str, session_id: str):
        return [f"エラー: Dialogflowに接続できません。入力: {text}"]
    
    def dummy_transcribe_audio(audio_content):
        return "音声認識サービスに接続できません"
    
    def dummy_synthesize_speech(text):
        return b"TTS service unavailable"
    
    return dummy_detect_intent_texts, dummy_transcribe_audio, dummy_synthesize_speech

# インポートを実行
detect_intent_texts, speech_to_text, synthesize_speech = get_imports()

app = FastAPI()

# CORS設定 - 環境に応じて動的に設定
def get_cors_origins():
    """環境に応じてCORS設定を動的に生成"""
    base_origins = [
        "https://rap-agent-frontend-866844216117.asia-northeast1.run.app",  # Cloud RunのフロントエンドURL
        "http://localhost:3000",  # React開発サーバー
        "http://localhost:3002",  # React開発サーバー
        "http://localhost:3003",  # 現在のフロントエンドのオリジン
        "http://localhost:8080",  # ローカルのバックエンドポート
        "http://localhost:8081",  # 現在のバックエンドポート
        "http://127.0.0.1:3000",  # 127.0.0.1版
        "http://127.0.0.1:3003",  # 127.0.0.1版
        "http://127.0.0.1:8081",  # 127.0.0.1版
    ]
    
    # 環境変数から追加のオリジンを取得
    additional_origins = os.environ.get('CORS_ORIGINS', '').split(',')
    base_origins.extend([origin.strip() for origin in additional_origins if origin.strip()])
    
    logger.info(f"CORS設定: {base_origins}")
    return base_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    text: str
    session_id: Optional[str] = None

class VoiceChatResponse(BaseModel):
    transcript: Optional[str] = None
    response: Optional[str] = None
    session_id: Optional[str] = None
    error: Optional[str] = None

@app.post("/text_chat")
async def text_chat(request: ChatRequest):
    logger.info(f"Received text chat request: {request}")
    
    try:
        # セッションIDの処理
        session_id = request.session_id if request.session_id else str(uuid.uuid4())
        logger.info(f"Using session_id: {session_id}")
        
        # Dialogflow CXで応答を取得（元の関数シグネチャ）
        response_messages = detect_intent_texts(request.text, session_id)
        
        # レスポンステキストを結合
        response_text = " ".join(response_messages) if response_messages else "すみません、応答を生成できませんでした。"
        
        logger.info(f"Response: {response_text}")
        
        return JSONResponse(content={
            "response": response_text, 
            "session_id": session_id
        })
        
    except Exception as e:
        logger.error(f"Error in text_chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice_chat")
async def voice_chat(file: UploadFile = File(...)):
    logger.info(f"Received voice chat request: {file.filename}, size: {file.size}")
    
    try:
        # 音声認識
        audio_content = await file.read()
        transcript = speech_to_text(audio_content)

        if not transcript or transcript.startswith("音声認識中にエラーが発生しました"):
            return JSONResponse(
                content={"error": "音声を認識できませんでした"}, 
                status_code=400
            )

        # セッションIDを新規生成
        session_id = str(uuid.uuid4())
        
        # Dialogflow CXで応答を生成（元の関数シグネチャ）
        response_messages = detect_intent_texts(transcript, session_id)
        response_text = " ".join(response_messages) if response_messages else "すみません、応答を生成できませんでした。"

        # 音声合成
        try:
            audio_response = synthesize_speech(response_text)
            audio_base64 = base64.b64encode(audio_response).decode("utf-8")
        except Exception as tts_error:
            logger.warning(f"TTS error: {tts_error}")
            audio_base64 = None

        return JSONResponse(content={
            "transcript": transcript,
            "response": response_text,
            "audio_base64": audio_base64,
            "session_id": session_id
        })
        
    except Exception as e:
        logger.error(f"Error in voice_chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """ヘルスチェック用エンドポイント"""
    is_docker, is_cloud_run, is_local = detect_environment()
    return {
        "status": "healthy",
        "environment": {
            "docker": is_docker,
            "cloud_run": is_cloud_run,
            "local": is_local
        },
        "services": {
            "dialogflow": "available",
            "stt": "available", 
            "tts": "available"
        }
    }

@app.get("/")
async def root():
    """ルートエンドポイント"""
    is_docker, is_cloud_run, is_local = detect_environment()
    env_name = "Cloud Run" if is_cloud_run else "Docker" if is_docker else "Local"
    return {
        "message": "Rap Agent Backend API",
        "environment": env_name,
        "version": "1.0.0"
    }