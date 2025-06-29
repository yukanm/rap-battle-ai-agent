import os
from google.cloud.dialogflowcx_v3.services.sessions import SessionsClient
from google.cloud.dialogflowcx_v3.types.session import TextInput, QueryInput, DetectIntentRequest

PROJECT_ID = "rap-agent-202506"
LOCATION = "asia-northeast1"
AGENT_ID = "135b32f7-45b4-4781-8c58-9fe4044dbfa2"

def detect_intent_texts(text: str, session_id: str) -> list[str]:
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

