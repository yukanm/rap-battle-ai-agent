from google.cloud import speech
import logging
import mimetypes
import os

logger = logging.getLogger(__name__)
speech_client = speech.SpeechClient()

def get_audio_config(audio_content: bytes, filename: str = None):
    """音声ファイルの形式に応じて適切な設定を取得"""
    
    mime_type = None
    ext = None
    if filename:
        mime_type, _ = mimetypes.guess_type(filename)
        ext = os.path.splitext(filename)[1].lower()
        logger.info(f"ファイル名: {filename}, 拡張子: {ext}, 推測MIMEタイプ: {mime_type}")
    
    # デフォルト
    encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
    sample_rate = 48000

    # 拡張子優先で判定
    if ext in [".mp3"]:
        encoding = speech.RecognitionConfig.AudioEncoding.MP3
        sample_rate = 44100
        logger.info("拡張子でMP3として処理")
    elif ext in [".wav"]:
        encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
        sample_rate = 16000
        logger.info("拡張子でWAVとして処理")
    elif ext in [".ogg"]:
        encoding = speech.RecognitionConfig.AudioEncoding.OGG_OPUS
        sample_rate = 48000
        logger.info("拡張子でOGGとして処理")
    elif ext in [".m4a", ".aac"]:
        encoding = speech.RecognitionConfig.AudioEncoding.MP3
        sample_rate = 44100
        logger.info("拡張子でM4A/AACとして処理（MP3として扱う）")
    elif ext in [".webm"]:
        encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
        sample_rate = 48000
        logger.info("拡張子でWebMとして処理")
    # MIMEタイプで判定（拡張子で判定できなかった場合）
    elif mime_type:
        if "mpeg" in mime_type or "mp3" in mime_type:
            encoding = speech.RecognitionConfig.AudioEncoding.MP3
            sample_rate = 44100
            logger.info("MIMEタイプでMP3として処理")
        elif "wav" in mime_type:
            encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
            sample_rate = 16000
            logger.info("MIMEタイプでWAVとして処理")
        elif "ogg" in mime_type:
            encoding = speech.RecognitionConfig.AudioEncoding.OGG_OPUS
            sample_rate = 48000
            logger.info("MIMEタイプでOGGとして処理")
        elif "m4a" in mime_type or "aac" in mime_type or "mp4a-latm" in mime_type:
            encoding = speech.RecognitionConfig.AudioEncoding.MP3
            sample_rate = 44100
            logger.info("MIMEタイプでM4A/AACとして処理（MP3として扱う）")
        elif "webm" in mime_type:
            encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
            sample_rate = 48000
            logger.info("MIMEタイプでWebMとして処理")
        else:
            logger.info(f"未知のMIMEタイプ: {mime_type}, デフォルト設定を使用")
    else:
        # MIMEタイプと拡張子の両方が不明な場合、ファイルの先頭バイトで判定を試行
        if len(audio_content) >= 4:
            # WebMファイルのマジックナンバーをチェック
            if audio_content[:4] == b'\x1a\x45\xdf\xa3':
                encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
                sample_rate = 48000
                logger.info("マジックナンバーでWebMとして処理")
            # MP3ファイルのマジックナンバーをチェック
            elif audio_content[:3] == b'ID3' or audio_content[:2] == b'\xff\xfb':
                encoding = speech.RecognitionConfig.AudioEncoding.MP3
                sample_rate = 44100
                logger.info("マジックナンバーでMP3として処理")
            else:
                logger.info("マジックナンバーで判定できませんでした, デフォルト設定を使用")
        else:
            logger.info("ファイルサイズが小さすぎて判定できませんでした, デフォルト設定を使用")

    config = speech.RecognitionConfig(
        encoding=encoding,
        language_code="ja-JP",
        sample_rate_hertz=sample_rate,
        enable_automatic_punctuation=True,
    )
    logger.info(f"最終設定 - エンコーディング: {encoding}, サンプルレート: {sample_rate}")
    return config

def transcribe_audio(audio_content: bytes, filename: str = None) -> str:
    try:
        audio = speech.RecognitionAudio(content=audio_content)
        config = get_audio_config(audio_content, filename)
        
        logger.info(f"音声認識を開始します... ファイルサイズ: {len(audio_content)} bytes")

        # ファイルサイズが小さすぎる場合のチェック
        if len(audio_content) < 1000:  # 1KB未満
            logger.warning(f"音声ファイルが小さすぎます: {len(audio_content)} bytes")
            return "音声ファイルが小さすぎます。もう少し長く話してください。"

        # より長い音声ファイルに対応するため、閾値を500KBに下げる
        if len(audio_content) > 500 * 1024:  # 500KB以上
            logger.info("長い音声ファイルのため、LongRunningRecognizeを使用します")
            operation = speech_client.long_running_recognize(config=config, audio=audio)
            # タイムアウト時間を300秒（5分）に延長
            response = operation.result(timeout=300)
        else:
            response = speech_client.recognize(config=config, audio=audio)
        
        if not response.results:
            logger.warning("音声認識結果が空でした")
            return "音声を認識できませんでした。もう少しはっきりと話してください。"
        
        transcript = response.results[0].alternatives[0].transcript
        confidence = response.results[0].alternatives[0].confidence
        logger.info(f"音声認識結果: {transcript} (信頼度: {confidence:.2f})")
        
        # 信頼度が低すぎる場合の警告
        if confidence < 0.3:
            logger.warning(f"音声認識の信頼度が低いです: {confidence:.2f}")
            return f"音声認識の信頼度が低いです。もう一度はっきりと話してください。認識結果: {transcript}"
        
        return transcript
        
    except Exception as e:
        logger.error(f"音声認識エラー: {e}")
        # エラーメッセージに基づいて再試行
        if "MP3 encoding" in str(e) and "webm" in str(e).lower():
            logger.info("WebMファイルをMP3として処理しようとしました。WebM_OPUSで再試行します")
            try:
                # WebM_OPUSで再試行
                config = speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
                    language_code="ja-JP",
                    sample_rate_hertz=48000,
                    enable_automatic_punctuation=True,
                )
                audio = speech.RecognitionAudio(content=audio_content)
                response = speech_client.recognize(config=config, audio=audio)
                
                if response.results:
                    transcript = response.results[0].alternatives[0].transcript
                    confidence = response.results[0].alternatives[0].confidence
                    logger.info(f"再試行成功 - 音声認識結果: {transcript} (信頼度: {confidence:.2f})")
                    return transcript
            except Exception as retry_error:
                logger.error(f"再試行も失敗: {retry_error}")
        
        # より具体的なエラーメッセージ
        if "400" in str(e):
            return "音声ファイルの形式が正しくありません。"
        elif "413" in str(e):
            return "音声ファイルが大きすぎます。"
        elif "timeout" in str(e).lower():
            return "音声認識がタイムアウトしました。もう一度お試しください。"
        else:
            return f"音声認識中にエラーが発生しました: {str(e)}"

