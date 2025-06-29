# -*- coding: utf-8 -*-
import uuid
import os

from google.cloud.dialogflowcx_v3.services.sessions import SessionsClient
from google.cloud.dialogflowcx_v3.types.session import TextInput, QueryInput, DetectIntentRequest

# ---------------------------------------------------
# TODO: この下の4つの変数を、ご自身の情報に書き換えてください
# ---------------------------------------------------

# 1. サービスアカウントキーのJSONファイルへのパス
# 例: "/path/to/your/rap-agent-caller-key.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "rap-agent-202506-974cb26c7c90.json"

# 2. あなたのプロジェクトID
PROJECT_ID = "rap-agent-202506"

# 3. エージェントを作成したリージョン (例: "global" または "us-central1")
# Agent BuilderのURL `.../locations/asia-northeast1/...` の部分です
LOCATION = "asia-northeast1"

# 4. エージェントのID
# Agent BuilderのURL `.../agents/135b32f7-...` の部分です
AGENT_ID = "135b32f7-45b4-4781-8c58-9fe4044dbfa2"

# ---------------------------------------------------

def detect_intent_texts(text: str, session_id: str) -> list[str]:
    """指定されたテキストでインテントを検出し、エージェントの応答を返します。"""

    session_path = f"projects/{PROJECT_ID}/locations/{LOCATION}/agents/{AGENT_ID}/sessions/{session_id}"
    client_options = {"api_endpoint": f"{LOCATION}-dialogflow.googleapis.com"}
    client = SessionsClient(client_options=client_options)

    text_input = TextInput(text=text)
    query_input = QueryInput(text=text_input, language_code="ja")
    request = DetectIntentRequest(session=session_path, query_input=query_input)

    response = client.detect_intent(request=request)

    response_messages = [
        " ".join(msg.text.text) for msg in response.query_result.response_messages
    ]
    return response_messages


if __name__ == "__main__":
    # セッションIDは、会話ごとにユニークなIDを生成します
    session_id = str(uuid.uuid4())
    print(f"セッション開始 (ID: {session_id})\n")

    while True:
        user_input = input(">> あなた: ")
        if user_input.lower() in ["exit", "quit", "終了"]:
            print("\nセッションを終了します。")
            break

        agent_responses = detect_intent_texts(user_input, session_id)
        
        print("🤖 エージェント:")
        for message in agent_responses:
            print(f"  {message}")
        print("\n")