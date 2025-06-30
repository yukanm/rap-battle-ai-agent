import React, { useState } from 'react';
import { useBattleStore } from '@/store/battleStore';
import { Play, Square, Mic, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ControlButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon: React.ElementType;
  children: React.ReactNode;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  onClick,
  disabled = false,
  variant = 'primary',
  icon: Icon,
  children
}) => {
  const variants = {
    primary: 'from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500',
    secondary: 'from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500',
    danger: 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500'
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative group px-6 py-3 rounded-lg font-semibold transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${variants[variant]} rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-center space-x-2 text-white">
        <Icon className="w-5 h-5" />
        <span>{children}</span>
      </div>
    </motion.button>
  );
};

const themeSuggestions = [
  '東京の夜景',
  'サムライ vs ニンジャ',
  '未来の世界',
  'ストリートファイター',
  'AIの反乱'
];

export const BattleControls: React.FC = () => {
  const { battleStatus, startBattle, endBattle, setBattleTheme } = useBattleStore();
  const [theme, setTheme] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleStartBattle = () => {
    if (theme.trim()) {
      setBattleTheme(theme.trim());
      startBattle();
    }
  };

  const handleEndBattle = () => {
    endBattle();
    setTheme('');
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setTheme(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            バトルコントロール
          </h2>
          <p className="text-gray-400">
            テーマを入力してAIラップバトルを開始
          </p>
        </div>

        {/* Theme Input */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mic className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="バトルテーマを入力..."
              disabled={battleStatus === 'active'}
              className="
                w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl
                text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500
                transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
            
            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && battleStatus !== 'active' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-10"
                >
                  <div className="p-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wider px-3 py-2">
                      テーマの提案
                    </p>
                    {themeSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="
                          w-full text-left px-3 py-2 rounded-md text-white
                          hover:bg-gray-700 transition-colors duration-200
                          flex items-center space-x-2
                        "
                      >
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {battleStatus !== 'active' ? (
            <ControlButton
              onClick={handleStartBattle}
              disabled={!theme.trim()}
              variant="primary"
              icon={Play}
            >
              バトル開始
            </ControlButton>
          ) : (
            <ControlButton
              onClick={handleEndBattle}
              variant="danger"
              icon={Square}
            >
              バトル終了
            </ControlButton>
          )}
        </div>

        {/* Status Indicator */}
        {battleStatus === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center space-x-3 px-4 py-2 bg-green-900/30 border border-green-500/30 rounded-full">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">バトル進行中</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};