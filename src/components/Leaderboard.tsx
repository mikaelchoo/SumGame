import React, { useEffect, useState } from 'react';
import { getLeaderboard, submitScore } from '../lib/firebase';
import { GameMode, Language, LeaderboardEntry } from '../types';
import { translations } from '../lib/translations';
import { Trophy, Medal, Crown, Star, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderboardProps {
  mode: GameMode;
  lang: Language;
}

export default function Leaderboard({ mode, lang }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[lang];

  const fetchScores = async () => {
    setLoading(true);
    const data = await getLeaderboard(mode);
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchScores();
  }, [mode]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-slate-400 fill-slate-300" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-700 fill-amber-600" />;
      default:
        return <span className="text-xs font-mono font-bold text-gray-400">{index + 1}</span>;
    }
  };

  return (
    <div id="leaderboard-container" className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-indigo-600" />
          <h3 className="font-sans font-bold text-lg text-gray-800">
            {t.globalRank} - {mode === 'classic' ? t.classicMode : t.timeMode}
          </h3>
        </div>
        <button
          onClick={fetchScores}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500/50" />
          <p className="text-sm font-sans">{t.loading}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-gray-400">
          <Star className="w-8 h-8 mb-2 text-indigo-200" />
          <p className="text-sm font-sans max-w-[200px]">{t.noScoresYet}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 max-h-[350px]">
          <div className="grid grid-cols-12 gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100 mb-2">
            <span className="col-span-2 text-center">{t.rank}</span>
            <span className="col-span-5">{t.player}</span>
            <span className="col-span-3 text-right">{t.score}</span>
            <span className="col-span-2 text-right">{t.level}</span>
          </div>

          <div className="space-y-1.5">
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(idx * 0.05, 0.4) }}
                className={`grid grid-cols-12 gap-2 py-2 px-3 rounded-xl items-center text-sm transition-colors ${
                  idx === 0 
                    ? 'bg-amber-50/50 hover:bg-amber-50 text-amber-950 font-medium border border-amber-100/50' 
                    : idx === 1 
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-800' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="col-span-2 flex justify-center items-center">
                  {getRankIcon(idx)}
                </div>
                <div className="col-span-5 truncate pr-2 flex items-center gap-1.5">
                  <span className="truncate font-sans font-medium text-gray-800">{entry.name}</span>
                </div>
                <div className="col-span-3 text-right font-mono font-bold text-indigo-600">
                  {entry.score.toLocaleString()}
                </div>
                <div className="col-span-2 text-right font-mono text-xs text-gray-500">
                  L{entry.level}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
