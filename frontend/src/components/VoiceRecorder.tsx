import React from 'react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onRecordingComplete, 
  disabled = false 
}) => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const startRecording = React.useCallback(async () => {
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

  const stopRecording = React.useCallback((): Promise<Blob> => {
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

  const checkSupport = React.useCallback(() => {
    const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setIsSupported(isSupported);
    return isSupported;
  }, []);

  React.useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  const handleRecordingToggle = async () => {
    if (isRecording) {
      try {
        const audioBlob = await stopRecording();
        onRecordingComplete(audioBlob);
      } catch (error) {
        console.error('録音の停止に失敗しました:', error);
        alert('録音の停止に失敗しました');
      }
    } else {
      await startRecording();
    }
  };

  if (!isSupported) {
    return (
      <button
        className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
        disabled
        title="お使いのブラウザは音声録音をサポートしていません"
      >
        🎤 音声録音非対応
      </button>
    );
  }

  return (
    <button
      onClick={handleRecordingToggle}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
        ${isRecording 
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
      `}
      title={isRecording ? '録音を停止' : '音声でメッセージを送信'}
    >
      {isRecording ? (
        <>
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          録音中...
        </>
      ) : (
        <>
          🎤
          音声録音
        </>
      )}
    </button>
  );
};
