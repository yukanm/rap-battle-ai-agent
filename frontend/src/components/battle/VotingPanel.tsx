import React, { useState } from 'react';
import { useBattleStore } from '@/store/battleStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, Zap, Star, Trophy, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoteButtonProps {
  aiId: 'ai1' | 'ai2';
  aiName: string;
  color: string;
  votes: number;
  onVote: () => void;
  hasVoted: boolean;
  disabled: boolean;
}

const VoteButton: React.FC<VoteButtonProps> = ({
  aiId,
  aiName,
  color,
  votes,
  onVote,
  hasVoted,
  disabled
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const gradients = {
    ai1: 'from-cyan-500 to-cyan-600',
    ai2: 'from-purple-500 to-purple-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onVote}
        disabled={disabled}
        className={`
          relative w-full p-6 rounded-xl transition-all duration-300
          ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
          ${hasVoted ? 'ring-2 ring-offset-2 ring-offset-gray-900' : ''}
          ${hasVoted && aiId === 'ai1' ? 'ring-cyan-500' : ''}
          ${hasVoted && aiId === 'ai2' ? 'ring-purple-500' : ''}
        `}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gray-800/50 backdrop-blur-sm rounded-xl" />
        
        {/* Gradient overlay on hover */}
        <AnimatePresence>
          {isHovered && !disabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 bg-gradient-to-r ${gradients[aiId]} rounded-xl`}
            />
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xl font-bold text-${color}-400`}>{aiName}</h3>
            {hasVoted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`p-2 rounded-full bg-gradient-to-r ${gradients[aiId]}`}
              >
                <Star className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Vote className={`w-5 h-5 text-${color}-400`} />
              <span className="text-3xl font-bold text-white">{votes}</span>
              <span className="text-gray-400">票</span>
            </div>

            {!hasVoted && !disabled && (
              <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${gradients[aiId]} text-white font-semibold`}>
                投票する
              </div>
            )}
          </div>

          {/* Vote animation */}
          <AnimatePresence>
            {hasVoted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 text-center"
              >
                <span className={`text-sm text-${color}-400`}>投票ありがとうございます！</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
    </motion.div>
  );
};

export const VotingPanel: React.FC = () => {
  const { battleStatus, votes, voteForAI } = useBattleStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<'ai1' | 'ai2' | null>(null);

  const handleVote = (aiId: 'ai1' | 'ai2') => {
    if (!hasVoted && battleStatus === 'active') {
      voteForAI(aiId);
      setHasVoted(true);
      setVotedFor(aiId);
    }
  };
  const totalVotes = votes.ai1 + votes.ai2;
  const votePercentage = {
    ai1: totalVotes > 0 ? Math.round((votes.ai1 / totalVotes) * 100) : 50,
    ai2: totalVotes > 0 ? Math.round((votes.ai2 / totalVotes) * 100) : 50
  };

  return (
    <div className="w-full bg-black/60 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/10 flex flex-col gap-4 sm:gap-6 items-center overflow-hidden">
      <div className="text-center mb-4 sm:mb-6 lg:mb-8">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center justify-center"
        >
          <Trophy className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mr-2 text-yellow-400" />
          <span>投票パネル</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400"
        >
          お気に入りのAIラッパーに投票しよう
        </motion.p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 w-full max-w-xl justify-center items-stretch">
        <Button
          onClick={() => handleVote('ai1')}
          disabled={hasVoted || battleStatus !== 'active'}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl shadow-lg text-sm sm:text-base lg:text-lg whitespace-nowrap"
        >
          Gemini Flashに投票
        </Button>
        <Button
          onClick={() => handleVote('ai2')}
          disabled={hasVoted || battleStatus !== 'active'}
          className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl shadow-lg text-sm sm:text-base lg:text-lg whitespace-nowrap"
        >
          Gemini Proに投票
        </Button>
      </div>
      <div className="w-full mt-4 sm:mt-6 max-w-xl">
        <div className="flex justify-between text-sm sm:text-base text-white font-bold mb-2">
          <span>Gemini Flash: {votes.ai1}票</span>
          <span>Gemini Pro: {votes.ai2}票</span>
        </div>
        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden flex">
          <div
            className="bg-purple-500 h-4 transition-all duration-500"
            style={{ width: `${votePercentage.ai1}%` }}
          />
          <div
            className="bg-pink-500 h-4 transition-all duration-500"
            style={{ width: `${votePercentage.ai2}%` }}
          />
        </div>
      </div>
      {hasVoted && (
        <div className="mt-3 sm:mt-4 text-sm sm:text-base text-green-400 font-bold">投票ありがとうございました！</div>
      )}
    </div>
  );
};