import { useState, useCallback, useRef } from 'react';

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      mediaRecorder.start();
    } catch (error) {
      console.error('録音の開始に失敗しました:', error);
      alert('マイクへのアクセスが許可されていません');
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('録音が開始されていません'));
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          resolve(event.data);
        } else {
          reject(new Error('音声データが取得できませんでした'));
        }
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  const checkSupport = useCallback(() => {
    const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setIsSupported(isSupported);
    return isSupported;
  }, []);

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    checkSupport,
  };
};
