import { useState, useCallback } from 'react';
import { Message, ApiResponse, VoiceResponse } from '../types/chat';

// レスポンスから【結果の提示】部分のみを抽出する関数
const extractResponseContent = (response: string): string => {
  // 【結果の提示】以降の部分を抽出
  const resultIndex = response.indexOf('【結果の提示】');
  if (resultIndex !== -1) {
    const resultContent = response.substring(resultIndex + '【結果の提示】'.length);
    // 前後の空白を削除
    return resultContent.trim();
  }
  
  // 【結果の提示】が見つからない場合は元のレスポンスをそのまま返す
  return response;
};

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const requestBody: any = {
        text: content,
      };
      
      if (sessionId) {
        requestBody.session_id = sessionId;
      }
      
      console.log('Sending request:', requestBody);
      
      const apiUrl = process.env.REACT_APP_API_URL || '';

      const response = await fetch(`${apiUrl}/text_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`API呼び出しに失敗しました: ${response.status} ${errorText}`);
      }

      const data: ApiResponse = await response.json();
      console.log('Response data:', data);
      
      // レスポンスから【結果の提示】部分のみを抽出
      const cleanResponse = extractResponseContent(data.response);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: cleanResponse,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev: Message[]) => [...prev, assistantMessage]);
      
      if (data.session_id) {
        setSessionId(data.session_id);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error ? error.message : 'エラーが発生しました',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const sendVoiceMessage = useCallback(async (audioBlob: Blob) => {
    setIsLoading(true);

    try {
      // 音声ファイルのサイズチェック
      if (audioBlob.size < 1000) {
        throw new Error('録音時間が短すぎます。もう少し長く話してください。');
      }

      console.log(`音声ファイル送信: ${audioBlob.size} bytes, タイプ: ${audioBlob.type}`);

      const formData = new FormData();
      // 適切なファイル名を付ける（WebM形式の場合）
      const fileName = audioBlob.type.includes('webm') ? 'audio.webm' : 'audio.wav';
      formData.append('file', audioBlob, fileName);

      const apiUrl = process.env.REACT_APP_API_URL || '';

      const response = await fetch(`${apiUrl}/voice_chat`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('音声認識APIエラー:', errorText);
        throw new Error(`音声認識に失敗しました: ${response.status} ${errorText}`);
      }

      const data: VoiceResponse = await response.json();
      
      // エラーレスポンスのチェック
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.transcript) {
        // 音声認識結果をユーザーメッセージとして表示
        const userMessage: Message = {
          id: Date.now().toString(),
          content: `🎤 ${data.transcript}`,
          role: 'user',
          timestamp: new Date(),
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);

        // エージェントの応答を表示
        if (data.response) {
          const cleanResponse = extractResponseContent(data.response);
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: cleanResponse,
            role: 'assistant',
            timestamp: new Date(),
          };
          setMessages((prev: Message[]) => [...prev, assistantMessage]);
        }
        
        // セッションIDを更新
        if (data.session_id) {
          setSessionId(data.session_id);
        }
      } else {
        throw new Error('音声を認識できませんでした');
      }
    } catch (error) {
      console.error('Voice chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error ? error.message : '音声認識中にエラーが発生しました',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    sendVoiceMessage,
    clearChat,
  };
};
