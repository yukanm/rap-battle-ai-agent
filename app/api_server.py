from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import logging

from dialogflow_client import detect_intent_texts
from app.stt import transcribe_audio

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS設定を追加
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],  # ReactアプリのURL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str
    session_id: Optional[str] = None

@app.post("/text_chat")
async def text_chat(request: TextRequest):
    logger.info(f"Received request: {request}")
    
    # セッションIDが提供されていない場合は新しいセッションを作成
    if not request.session_id:
        session_id = str(uuid.uuid4())
    else:
        session_id = request.session_id
    
    logger.info(f"Using session_id: {session_id}")
    
    try:
        responses = detect_intent_texts(request.text, session_id)
        
        # レスポンスを文字列に結合
        response_text = " ".join(responses) if isinstance(responses, list) else str(responses)
        
        logger.info(f"Response: {response_text}")
        
        return {
            "response": response_text,
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Error in text_chat: {e}")
        return {
            "response": f"エラーが発生しました: {str(e)}",
            "session_id": session_id
        }

@app.post("/voice_chat")
async def voice_chat(file: UploadFile = File(...)):
    logger.info(f"音声ファイルを受信: {file.filename}, サイズ: {file.size} bytes, タイプ: {file.content_type}")
    
    try:
        # ファイル形式の検証
        allowed_extensions = ['.webm', '.wav', '.mp3', '.m4a', '.ogg']
        if not file.filename or not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
            return {
                "error": f"サポートされていない音声ファイル形式です。サポート形式: {', '.join(allowed_extensions)}"
            }
        
        # ファイルサイズ制限を10MBに緩和
        if file.size and file.size > 10 * 1024 * 1024:  # 10MB
            return {
                "error": "音声ファイルが大きすぎます。10MB以下のファイルをアップロードしてください。"
            }
        
        audio_content = await file.read()
        logger.info(f"音声ファイルサイズ: {len(audio_content)} bytes")
        
        if len(audio_content) == 0:
            return {
                "error": "空の音声ファイルです"
            }
        
        # STT処理（ファイル名を渡す）
        transcript = transcribe_audio(audio_content, file.filename)
        
        if transcript.startswith("音声認識中にエラーが発生しました"):
            return {
                "error": transcript
            }
        
        if transcript == "音声を認識できませんでした":
            return {
                "error": "音声を認識できませんでした。もう一度お試しください。"
            }
        
        # 新しいセッションIDを生成
        session_id = str(uuid.uuid4())
        
        # Dialogflow CXで応答を取得
        responses = detect_intent_texts(transcript, session_id)
        response_text = " ".join(responses) if isinstance(responses, list) else str(responses)
        
        logger.info(f"音声認識結果: {transcript}")
        logger.info(f"エージェント応答: {response_text}")
        
        return {
            "transcript": transcript,
            "response": response_text,
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"音声チャットエラー: {e}")
        return {
            "error": f"音声処理中にエラーが発生しました: {str(e)}"
        }

