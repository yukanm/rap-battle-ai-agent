import streamlit as st
import requests

API_URL = "http://localhost:8080"  # FastAPI サーバーのURLに合わせて変更

st.title("🗣️ AI エージェント チャット")

# テキストチャット
st.header("💬 テキストチャット")
text_input = st.text_input("テキストを入力してください:")

if st.button("送信"):
    if text_input:
        with st.spinner("AI に問い合わせ中..."):
            response = requests.post(
                f"{API_URL}/text_chat",
                json={"text": text_input}
            )
            if response.ok:
                st.success("AI の応答:")
                st.write(response.json()["response"])
            else:
                st.error("API 呼び出しに失敗しました")

# 音声ファイルチャット
st.header("🎤 音声ファイルチャット")
audio_file = st.file_uploader("音声ファイルをアップロードしてください", type=["wav", "mp3", "m4a"])

if st.button("音声送信"):
    if audio_file:
        with st.spinner("音声認識中..."):
            files = {"file": (audio_file.name, audio_file, audio_file.type)}
            response = requests.post(f"{API_URL}/voice_chat", files=files)

            if response.ok:
                result = response.json()
                st.success("文字起こし結果:")
                st.write(result["transcript"])

                st.success("AI の応答:")
                st.write(result["response"])
            else:
                st.error("API 呼び出しに失敗しました")
