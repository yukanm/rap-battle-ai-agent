import vertexai
from vertexai.preview.generative_models import GenerativeModel, Part

def generate_rap(project_id: str, location: str) -> str:
    """
    指定されたテーマに基づいて日本語のラップを生成します。

    Args:
        project_id (str): Google CloudプロジェクトID。
        location (str): モデルがデプロイされているリージョン（例: "asia-northeast1"）

    Returns:
        str: 生成されたラップのテキスト。
    """
    print(f"--- デバッグ: Vertex AI 初期化開始 (Project: {project_id}, Location: {location}) ---")
    try:
        # Vertex AI の初期化
        vertexai.init(project=project_id, location=location)
        print("--- デバッグ: Vertex AI 初期化成功 ---")

        print("--- デバッグ: Gemini Pro モデルロード開始 ---")
        # Gemini Pro モデルのロード
        model = GenerativeModel("gemini-1.5-pro")
        print("--- デバッグ: Gemini Pro モデルロード成功 ---")

        # プロンプトの構築
        prompt = f"""
        以下の2人による8小節×4ターンの日本語ラップバトルを生成してください。
        ・ストリートでラップバトルを長年やってきた覇者のような存在のラッパー
        ・エンジニアとして長年キャリアを積んで副業でラッパーをやっている人
        日本語の韻を踏み、リズミカルに生成してください。
        ラップ:
        """
        print(f"--- デバッグ: プロンプト構築完了。プロンプトの長さ: {len(prompt)}文字 ---")
        # デバッグ用にプロンプトの冒頭を表示することもできますが、長いので注意
        # print(f"--- デバッグ: プロンプト冒頭: {prompt[:200]}...")


        # モデルの生成設定
        generation_config = {
            "temperature": 0.9,
            "max_output_tokens": 1000,
            "top_p": 0.9,
            "top_k": 40
        }
        print(f"--- デバッグ: 生成設定完了: {generation_config} ---")

        print(f"--- ラップ生成リクエスト送信中 ---")
        # テキスト生成リクエストの送信
        response = model.generate_content(
            contents=[Part.from_text(prompt)],
            generation_config=generation_config
        )
        print("--- デバッグ: ラップ生成リクエスト受信成功 ---")

        # 生成されたテキストの取得
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            rap_lyrics = response.candidates[0].content.parts[0].text
            print("--- デバッグ: ラップ歌詞抽出成功 ---")
            return rap_lyrics
        else:
            print("--- デバッグ: ラップの生成に失敗。レスポンス候補またはコンテンツが空 ---")
            # さらに詳細なデバッグ情報が必要な場合、responseオブジェクト全体を出力してみる
            # print(f"--- デバッグ: レスポンスオブジェクト: {response} ---")
            return "ラップの生成に失敗しました。応答がありませんでした。"

    except Exception as e:
        # ここに到達した場合、e に具体的なエラーメッセージが含まれる
        print(f"--- エラー発生！ 具体的なエラーメッセージ: {e} ---")
        print(f"--- エラータイプ: {type(e)} ---")
        # さらに詳細なスタックトレースが必要な場合
        import traceback
        traceback.print_exc()
        return "ラップの生成中にエラーが発生しました。時間を置いて再度お試しください。"

if __name__ == "__main__":
    project_id = "rap-agent-202506"
    location = "asia-northeast1"

    print(f"\n=== スクリプト実行開始（Project: {project_id}, Location: {location}） ===\n")
    generated_rap = generate_rap(project_id, location)
    print("\n--- 生成されたラップ ---")
    print(generated_rap)
    print("----------------------")
    print("\n=== スクリプト実行終了 ===\n")