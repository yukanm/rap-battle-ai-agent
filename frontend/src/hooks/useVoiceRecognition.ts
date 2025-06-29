import { useState, useCallback } from 'react';

interface UseVoiceRecognitionProps {
  onTranscription: (text: string) => void;
  onError: (error: string) => void;
}

export const useVoiceRecognition = ({ onTranscription, onError }: UseVoiceRecognitionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await sendAudioToSTT(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      onError('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
    }
  }, [onTranscription, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder, isRecording]);

  const sendAudioToSTT = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const response = await fetch('/voice_chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('音声認識に失敗しました');
      }

      const data = await response.json();
      
      if (data.transcript) {
        onTranscription(data.transcript);
      } else {
        onError('音声を認識できませんでした。もう一度お試しください。');
      }
    } catch (error) {
      onError('音声認識中にエラーが発生しました。');
    }
  };

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    toggleRecording,
  };
};
