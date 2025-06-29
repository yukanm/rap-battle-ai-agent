import React from 'react';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { useChat } from './hooks/useChat';
import { RefreshCw } from 'lucide-react';

function App() {
  const { messages, isLoading, sendMessage, sendVoiceMessage, clearChat } = useChat();

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ヘッダー */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">AIエージェントチャット</h1>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            新しいセッション
          </button>
        </div>
      </header>

      {/* チャットエリア */}
      <ChatContainer messages={messages} isLoading={isLoading} />

      {/* 入力エリア */}
      <ChatInput 
        onSendMessage={sendMessage} 
        onVoiceMessage={sendVoiceMessage}
        isLoading={isLoading} 
      />
    </div>
  );
}

export default App; 