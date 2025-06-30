'use client'

import React from 'react';
import { useBattleStore } from '@/store/battleStore';
import { Play, Square, Brain, Wifi, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

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

export const BattleControlsEnhanced: React.FC = () => {
  const { 
    battleStatus, 
    endBattle, 
    useAgentAPI,
    battleResult,
    currentRound,
    totalRounds 
  } = useBattleStore();

  const handleEndBattle = () => {
    endBattle();
  };

  return (
    <div className="w-full bg-black/60 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/10 flex flex-col gap-4 sm:gap-6 items-center">
      <div className="text-center mb-2 sm:mb-4">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <span>バトルコントロール</span>
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-white/10">
            {useAgentAPI ? (
              <>
                <Brain className="w-4 h-4 text-pink-400" />
                <span className="text-pink-400">Agent API</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400">WebSocket</span>
              </>
            )}
          </div>
        </h2>
        <p className="text-gray-400">
          {useAgentAPI 
            ? 'AIエージェントが自動でバトルを進行中' 
            : 'リアルタイムストリーミングモード'}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
        {battleStatus === 'active' && (
          <Button
            onClick={handleEndBattle}
            variant="destructive"
            className="w-full sm:w-auto px-8 py-4 text-lg font-bold rounded-xl shadow-md"
          >
            <Square className="w-5 h-5 mr-2" />バトル終了
          </Button>
        )}
      </div>
      {useAgentAPI && battleStatus === 'completed' && battleResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 sm:mt-6 lg:mt-8 p-4 sm:p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl w-full"
        >
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
            AI評価結果
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">勝者:</span>
              <span className="text-lg font-semibold text-white">
                {battleResult.winner === 'ai1' ? 'Gemini Flash' : 
                 battleResult.winner === 'ai2' ? 'Gemini Pro' : '引き分け'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">スコア:</span>
              <span className="text-white">
                Flash: {battleResult.scores.ai1} - Pro: {battleResult.scores.ai2}
              </span>
            </div>
            {battleResult.analysis && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-300">{battleResult.analysis}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
      {battleStatus === 'active' && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center space-x-3 px-4 py-2 bg-green-900/30 border border-green-500/30 rounded-full">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">
                {useAgentAPI ? 'AIバトル進行中' : 'バトル進行中'}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};