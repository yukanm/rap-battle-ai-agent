import React from 'react';
import { useBattleStore } from '@/store/battleStore';
import { Timer, Users, Zap, TrendingUp } from 'lucide-react';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, accent = 'cyan' }) => {
  const accentColors = {
    cyan: 'from-cyan-500 to-cyan-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600'
  };

  return (
    <div className="relative group">
      <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 ${accentColors[accent as keyof typeof accentColors]}`}></div>
      <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-3 sm:p-4 transition-all duration-300 group-hover:border-gray-700">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-r ${accentColors[accent as keyof typeof accentColors]}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wider truncate">{label}</p>
            <p className="text-base sm:text-lg lg:text-xl font-bold text-white">{value}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BattleStats: React.FC = () => {
  const { battleStatus, currentRound, totalRounds, battleTheme, votes, rounds } = useBattleStore();
  const [timeElapsed, setTimeElapsed] = React.useState(0);

  React.useEffect(() => {
    if (battleStatus === 'active') {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeElapsed(0);
    }
  }, [battleStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
  const votePercentages = {
    ai1: totalVotes > 0 ? Math.round((votes.ai1 / totalVotes) * 100) : 50,
    ai2: totalVotes > 0 ? Math.round((votes.ai2 / totalVotes) * 100) : 50
  };

  // Calculate total verses completed
  const totalVersesCompleted = rounds.reduce((total, round) => {
    return total + (round.verses?.length || 0);
  }, 0);
  const versesPerRound = 6; // 3 verses per MC × 2 MCs
  const totalVersesExpected = totalRounds * versesPerRound;

  return (
    <div className="w-full">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
        <StatCard
          icon={Timer}
          label="バトル時間"
          value={formatTime(timeElapsed)}
          accent="cyan"
        />
        <StatCard
          icon={TrendingUp}
          label="進行状況"
          value={`${totalVersesCompleted} / ${totalVersesExpected} バース`}
          accent="purple"
        />
        <StatCard
          icon={Users}
          label="総投票数"
          value={totalVotes.toLocaleString()}
          accent="green"
        />
        <StatCard
          icon={Zap}
          label="ステータス"
          value={battleStatus === 'active' ? 'バトル中' : battleStatus === 'waiting' ? '待機中' : '終了'}
          accent={battleStatus === 'active' ? 'green' : battleStatus === 'waiting' ? 'purple' : 'red'}
        />
      </div>

      {/* Theme Display */}
      {battleTheme && (
        <div className="mb-4 sm:mb-6">
          <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm uppercase tracking-wider text-purple-400 mb-1 sm:mb-2">バトルテーマ</h3>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">{battleTheme}</p>
          </div>
        </div>
      )}

      {/* Vote Progress */}
      {battleStatus === 'active' && totalVotes > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm uppercase tracking-wider text-gray-400 mb-3 sm:mb-4">投票状況</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-cyan-400 font-semibold">Gemini Flash</span>
                <span className="text-white font-bold">{votePercentages.ai1}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500 ease-out"
                  style={{ width: `${votePercentages.ai1}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-400 font-semibold">Gemini Pro</span>
                <span className="text-white font-bold">{votePercentages.ai2}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500 ease-out"
                  style={{ width: `${votePercentages.ai2}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};