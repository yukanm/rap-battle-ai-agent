import React from 'react';

interface AudioUploaderProps {
  onAudioUpload: (audioBlob: Blob) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ 
  onAudioUpload, 
  disabled = false,
  isLoading = false
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // ファイル形式の検証（MIMEタイプと拡張子の両方をチェック）
      const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'audio/aac'];
      const allowedExtensions = ['.webm', '.wav', '.mp3', '.m4a', '.ogg', '.aac'];
      
      const hasValidType = allowedTypes.includes(file.type);
      const hasValidExtension = allowedExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidType && !hasValidExtension) {
        alert('サポートされていない音声ファイル形式です。WebM、WAV、MP3、M4A、OGG、AAC形式をサポートしています。');
        return;
      }

      // ファイルサイズの検証（10MB以下）
      if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
        return;
      }

      // Blobに変換してコールバックを呼び出し
      const audioBlob = new Blob([file], { type: file.type });
      onAudioUpload(audioBlob);
    }
  };

  const handleClick = () => {
    if (!disabled && !isLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || isLoading}
      />
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`
          px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
          ${isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-500 hover:bg-green-600'
          }
          text-white
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        `}
        title={isLoading ? "音声処理中..." : "音声ファイルをアップロード"}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            処理中...
          </>
        ) : (
          <>
            📁
            ファイルアップロード
          </>
        )}
      </button>
    </>
  );
}; 