import React from 'react';

interface SimpleVoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const SimpleVoiceRecorder: React.FC<SimpleVoiceRecorderProps> = ({ 
  onRecordingComplete, 
  disabled = false,
  isLoading = false
}) => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startRecording = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      
      // 録音時間のカウント開始
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // より長い録音に対応するため、タイムスライスを設定
      mediaRecorder.start(1000); // 1秒ごとにデータを取得
      
      console.log('録音を開始しました');
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
      
      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data.size > 0) {
          console.log(`録音データサイズ: ${event.data.size} bytes`);
          resolve(event.data);
        } else {
          reject(new Error('音声データが取得できませんでした'));
        }
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        setRecordingTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track: any) => track.stop());
          streamRef.current = null;
        }
        console.log('録音を停止しました');
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
        // 最小録音時間チェック（1秒未満は警告）
        if (recordingTime < 1) {
          alert('録音時間が短すぎます。もう少し長く話してください。');
          return;
        }
        
        const audioBlob = await stopRecording();
        console.log(`録音完了: ${audioBlob.size} bytes, ${recordingTime}秒`);
        onRecordingComplete(audioBlob);
      } catch (error) {
        console.error('録音の停止に失敗しました:', error);
        alert('録音の停止に失敗しました');
      }
    } else {
      await startRecording();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      disabled={disabled || isLoading}
      className={`
        px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
        ${isRecording 
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
          : isLoading
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-600 text-white'
        }
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
      `}
      title={isRecording ? '録音を停止' : isLoading ? '音声処理中...' : '音声でメッセージを送信'}
    >
      {isRecording ? (
        <>
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          録音中... {formatTime(recordingTime)}
        </>
      ) : isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          処理中...
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