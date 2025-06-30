import os
from google.cloud.dialogflowcx_v3.services.sessions import SessionsClient
from google.cloud.dialogflowcx_v3.types.session import TextInput, QueryInput, DetectIntentRequest

# 環境変数から設定を取得（デフォルト値付き）
PROJECT_ID = os.environ.get("DIALOGFLOW_PROJECT_ID", "rap-agent-202506")
LOCATION_ID = os.environ.get("DIALOGFLOW_LOCATION_ID", "asia-northeast1")
AGENT_ID = os.environ.get("DIALOGFLOW_AGENT_ID", "135b32f7-45b4-4781-8c58-9fe4044dbfa2")
LANGUAGE_CODE = os.environ.get("DIALOGFLOW_LANGUAGE_CODE", "ja-JP")

def detect_intent_texts(text: str, session_id: str) -> list[str]:
    """
    Dialogflow CXでテキストの意図を検出し、応答を取得する
    
    Args:
        text: ユーザーの入力テキスト
        session_id: セッションID
        
    Returns:
        list[str]: 応答メッセージのリスト
    """
    try:
        session_path = f"projects/{PROJECT_ID}/locations/{LOCATION_ID}/agents/{AGENT_ID}/sessions/{session_id}"
        client_options = {"api_endpoint": f"{LOCATION_ID}-dialogflow.googleapis.com"}
        client = SessionsClient(client_options=client_options)

        text_input = TextInput(text=text)
        query_input = QueryInput(text=text_input, language_code=LANGUAGE_CODE)
        request = DetectIntentRequest(session=session_path, query_input=query_input)

        response = client.detect_intent(request=request)

        response_messages = [
            " ".join(msg.text.text) for msg in response.query_result.response_messages
        ]
        
        # レスポンスが空の場合のデフォルト応答
        if not response_messages:
            response_messages = ["申し訳ありませんが、適切な応答を生成できませんでした。"]
            
        return response_messages
        
    except Exception as e:
        print(f"Dialogflow CX エラー: {e}")
        return [f"エラーが発生しました: {str(e)}"]
