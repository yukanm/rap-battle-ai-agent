# -*- coding: utf-8 -*-
import uuid
from app.dialogflow_client import detect_intent_texts

def main():
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

if __name__ == "__main__":
    main()
