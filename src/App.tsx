import React, { useState, useEffect } from 'react';
import { GameMode, MathOp, Language, UserConfig, UserProfile } from './types';
import { translations } from './lib/translations';
import { soundEffects, setSoundEnabled as setAudioSoundEnabled } from './lib/audio';
import GameBoard from './components/GameBoard';
import Leaderboard from './components/Leaderboard';
import UserProfileStats from './components/UserProfileStats';
import { auth, getUserProfile, getLocalGuestProfile } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Trophy, 
  Gamepad2, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Languages, 
  User, 
  HelpCircle, 
  Save, 
  TrendingUp, 
  Calendar,
  Layers,
  Clock,
  ChevronRight,
  Calculator,
  ShieldCheck,
  UserCog
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Generates a random fun player name
function generateDefaultName(): string {
  const titles = ['Euler', 'Gauss', 'Newton', 'Pythagoras', 'Turing', 'Loveless', 'Fermi', 'Curie', 'Pascal', 'Ramanujan'];
  const nouns = ['Solver', 'Nerd', 'Brain', 'Genius', 'Master', 'Spark', 'Vector', 'Matrix', 'SumBot', 'Wizard'];
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${randomTitle}${randomNoun}${num}`;
}

export default function App() {
  const [view, setView] = useState<'home' | 'playing'>('home');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [lang, setLang] = useState<Language>('zh'); // Default to Chinese with easy toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [homeTab, setHomeTab] = useState<'arena' | 'profile'>('arena');
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(() => getLocalGuestProfile());
  
  const [config, setConfig] = useState<UserConfig>({
    username: '',
    soundEnabled: true,
    language: 'zh',
    highScores: { classic: 0, time: 0 }
  });

  const [leaderboardMode, setLeaderboardMode] = useState<GameMode>('classic');
  const [selectedMathOp, setSelectedMathOp] = useState<MathOp>('addition');

  // 1. Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User logged in! Load their Cloud Profile
        const profile = await getUserProfile(user.uid, user.displayName || 'Cloud Solver');
        setCurrentProfile(profile);
        
        // Update user config to match cloud values
        setConfig((prev) => {
          const updatedScores = {
            classic: Math.max(prev.highScores.classic, profile.classicHighScore),
            time: Math.max(prev.highScores.time, profile.timeHighScore)
          };
          const next = {
            ...prev,
            username: profile.username,
            highScores: updatedScores
          };
          localStorage.setItem('sumblocks_config', JSON.stringify(next));
          return next;
        });
      } else {
        // User logged out or playing as Guest
        const guest = getLocalGuestProfile(config.username || undefined);
        setCurrentProfile(guest);
      }
    });
    return () => unsubscribe();
  }, [config.username]);

  // 2. Load User configuration on Mount
  useEffect(() => {
    // Detect preferred language
    const browserLang = navigator.language.toLowerCase();
    const initialLang: Language = browserLang.includes('zh') ? 'zh' : 'en';
    setLang(initialLang);

    const savedConfig = localStorage.getItem('sumblocks_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as UserConfig;
        setConfig(parsed);
        setLang(parsed.language || initialLang);
        setSoundEnabled(parsed.soundEnabled !== false);
        setAudioSoundEnabled(parsed.soundEnabled !== false);
      } catch (e) {
        console.error('Failed to parse saved config', e);
      }
    } else {
      // Create new config
      const defaultName = generateDefaultName();
      const newConfig: UserConfig = {
        username: defaultName,
        soundEnabled: true,
        language: initialLang,
        highScores: { classic: 0, time: 0 }
      };
      setConfig(newConfig);
      localStorage.setItem('sumblocks_config', JSON.stringify(newConfig));
    }
  }, []);

  // Sync sounds state with Audio Engine
  useEffect(() => {
    setAudioSoundEnabled(soundEnabled);
    updateConfigField('soundEnabled', soundEnabled);
  }, [soundEnabled]);

  const updateConfigField = <K extends keyof UserConfig>(key: K, value: UserConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('sumblocks_config', JSON.stringify(next));
      return next;
    });
  };

  const updateHighScore = (mode: GameMode, score: number) => {
    setConfig((prev) => {
      const nextScores = { ...prev.highScores, [mode]: Math.max(prev.highScores[mode], score) };
      const next = { ...prev, highScores: nextScores };
      localStorage.setItem('sumblocks_config', JSON.stringify(next));
      return next;
    });
  };

  const toggleLanguage = () => {
    soundEffects.playSelect();
    const nextLang: Language = lang === 'en' ? 'zh' : 'en';
    setLang(nextLang);
    updateConfigField('language', nextLang);
  };

  const toggleSound = () => {
    soundEffects.playSelect();
    setSoundEnabled(!soundEnabled);
  };

  const launchGame = (mode: GameMode) => {
    soundEffects.playSuccess(2);
    setSelectedMode(mode);
    setView('playing');
  };

  const t = translations[lang];

  return (
    <div id="game-app-root" className="min-h-screen bg-slate-50 text-slate-800 relative flex flex-col items-center py-6 px-4 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Background Ambience Dots pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Header Panel */}
      <header className="w-full max-w-5xl flex justify-between items-center z-10 mb-6 border-b border-gray-100 pb-4">
        <div 
          onClick={() => { soundEffects.playSelect(); setView('home'); setHomeTab('arena'); }}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-all">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-sans font-black tracking-tight text-gray-800">
              {t.title}
            </h1>
            <p className="text-[10px] sm:text-xs font-sans font-semibold text-indigo-500 uppercase tracking-widest leading-none">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Floating Utility Controls */}
        <div className="flex items-center gap-2">
          
          {/* User Auth/Profile Button */}
          <button
            onClick={() => {
              soundEffects.playSelect();
              setView('home');
              setHomeTab(homeTab === 'profile' ? 'arena' : 'profile');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-xs font-sans font-bold shadow-sm cursor-pointer ${
              homeTab === 'profile' && view === 'home'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white hover:bg-gray-50 text-gray-600 hover:text-indigo-600 border-gray-200/60'
            }`}
            title={t.myProfile}
          >
            {currentProfile.uid === 'guest' ? (
              <>
                <User className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline">{lang === 'zh' ? '登录 / 注册' : 'Login / Register'}</span>
                <span className="inline sm:hidden">{lang === 'zh' ? '游客' : 'Guest'}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="max-w-[80px] truncate">{currentProfile.username}</span>
              </>
            )}
          </button>

          {/* Language Selector */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 hover:text-indigo-600 rounded-xl border border-gray-200/60 shadow-sm transition-all text-xs font-sans font-bold cursor-pointer"
            title={t.language}
          >
            <Languages className="w-4 h-4 text-indigo-500" />
            <span className="uppercase">{lang}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 bg-white hover:bg-gray-50 text-gray-600 hover:text-indigo-600 rounded-xl border border-gray-200/60 shadow-sm transition-all cursor-pointer"
            title={t.audio}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-500" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </header>

      {/* Main Container view switching */}
      <main className="w-full max-w-5xl z-10 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div
              key="home-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              
              {/* Primary Navigation Tabs */}
              <div className="flex bg-white/90 p-1.5 rounded-2xl border border-gray-100 shadow-sm max-w-md w-full mx-auto text-xs sm:text-sm font-sans font-black uppercase tracking-wider text-gray-500">
                <button
                  onClick={() => { soundEffects.playSelect(); setHomeTab('arena'); }}
                  className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    homeTab === 'arena' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'hover:text-indigo-600'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>{lang === 'zh' ? '消除对局' : 'Play Arena'}</span>
                </button>
                <button
                  onClick={() => { soundEffects.playSelect(); setHomeTab('profile'); }}
                  className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                    homeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'hover:text-indigo-600'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span>{lang === 'zh' ? '我的成就' : 'My Stats'}</span>
                  {currentProfile.uid === 'guest' && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 border border-white rounded-full" />
                  )}
                </button>
              </div>

              {homeTab === 'arena' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column (Main menus, Mode Selectors, Configs) */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    
                    {/* 1. Quick Welcome banner */}
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-3xl p-6 shadow-md shadow-indigo-600/10 relative overflow-hidden">
                      <div className="absolute right-[-20px] top-[-20px] text-white/5 font-sans font-black text-9xl select-none pointer-events-none">
                        +
                      </div>
                      <h3 className="text-xl sm:text-2xl font-sans font-black tracking-tight flex items-center gap-1.5">
                        <Sparkles className="w-6 h-6 text-yellow-300 fill-yellow-300 animate-pulse" />
                        <span>{lang === 'zh' ? `欢迎，${currentProfile.username}！` : `Welcome, ${currentProfile.username}!`}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-indigo-100 mt-1.5 leading-relaxed font-sans font-medium">
                        {currentProfile.uid === 'guest' 
                          ? t.loginRequired 
                          : t.syncNotice}
                      </p>
                    </div>

                    {/* Math Operator Selector Panel */}
                    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-gray-150/60 shadow-sm flex flex-col gap-4">
                      <div>
                        <span className="text-[10px] font-sans font-black uppercase text-indigo-500 tracking-wider">
                          {t.mathOp}
                        </span>
                        <h4 className="text-lg font-sans font-black text-gray-800 tracking-tight leading-tight mt-0.5">
                          {lang === 'zh' ? '1. 选择运算规则' : '1. Select Calculation Rule'}
                        </h4>
                      </div>

                      {/* Operators Horizontal Grid / Segmented control */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {([
                          { value: 'addition', label: t.addition, symbol: '➕', color: 'emerald' },
                          { value: 'subtraction', label: t.subtraction, symbol: '➖', color: 'rose' },
                          { value: 'multiplication', label: t.multiplication, symbol: '✖️', color: 'amber' },
                          { value: 'division', label: t.division, symbol: '➗', color: 'sky' },
                          { value: 'mixed', label: t.mixed, symbol: '🎲', color: 'purple' }
                        ] as const).map((op) => {
                          const isActive = selectedMathOp === op.value;
                          const activeStyles = {
                            emerald: 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/10',
                            rose: 'bg-rose-500 border-rose-500 text-white shadow-rose-500/10',
                            amber: 'bg-amber-500 border-amber-500 text-white shadow-amber-500/10',
                            sky: 'bg-sky-500 border-sky-500 text-white shadow-sky-500/10',
                            purple: 'bg-purple-500 border-purple-500 text-white shadow-purple-500/10'
                          }[op.color];

                          const hoverBorderStyles = {
                            emerald: 'hover:border-emerald-200 hover:text-emerald-600',
                            rose: 'hover:border-rose-200 hover:text-rose-600',
                            amber: 'hover:border-amber-200 hover:text-amber-600',
                            sky: 'hover:border-sky-200 hover:text-sky-600',
                            purple: 'hover:border-purple-200 hover:text-purple-600'
                          }[op.color];

                          return (
                            <button
                              key={op.value}
                              onClick={() => {
                                soundEffects.playSelect();
                                setSelectedMathOp(op.value);
                              }}
                              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                                isActive 
                                  ? `${activeStyles} shadow-lg scale-102 font-black border-2`
                                  : `bg-slate-50 border-gray-100 text-slate-600 font-semibold ${hoverBorderStyles}`
                              } ${op.value === 'mixed' ? 'col-span-2 sm:col-span-1' : ''}`}
                            >
                              <span className="text-lg leading-none mb-1">{op.symbol}</span>
                              <span className="text-[10px] leading-tight text-center truncate w-full">{op.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Brief helper description of the chosen operator rule */}
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs text-gray-500 leading-relaxed font-sans font-medium flex items-start gap-2">
                        <span className="text-base leading-none">💡</span>
                        <span>
                          {selectedMathOp === 'addition' && t.opCardDescAddition}
                          {selectedMathOp === 'subtraction' && t.opCardDescSubtraction}
                          {selectedMathOp === 'multiplication' && t.opCardDescMultiplication}
                          {selectedMathOp === 'division' && t.opCardDescDivision}
                          {selectedMathOp === 'mixed' && t.opCardDescMixed}
                        </span>
                      </div>
                    </div>

                    {/* Step 2 instruction */}
                    <div className="mt-2">
                      <h4 className="text-sm font-sans font-black text-gray-400 uppercase tracking-wider">
                        {lang === 'zh' ? '2. 选择对局模式开始挑战' : '2. Choose Game Mode'}
                      </h4>
                    </div>

                    {/* 2. Interactive Game Mode Selector Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Classic Mode Card */}
                      <div 
                        onClick={() => launchGame('classic')}
                        className="bg-gradient-to-br from-white to-slate-50 hover:to-indigo-50/20 rounded-2xl p-6 border border-gray-100 hover:border-indigo-100 shadow-sm hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between h-[190px] relative overflow-hidden"
                      >
                        <div className="absolute right-[-10px] bottom-[-10px] text-indigo-500/5 font-sans font-black text-8xl select-none pointer-events-none group-hover:scale-110 transition-transform">
                          C
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <Layers className="w-5 h-5" />
                            </span>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-400 block font-sans uppercase font-bold tracking-wider">{t.highScore}</span>
                              <span className="font-mono font-bold text-sm text-indigo-600">
                                {Math.max(config.highScores.classic, currentProfile.classicHighScore).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <h3 className="font-sans font-black text-lg text-gray-800 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                            {t.classicMode}
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                          </h3>
                          <p className="text-xs font-sans text-gray-400 mt-1 leading-relaxed">
                            {t.classicDesc}
                          </p>
                        </div>
                      </div>

                      {/* Time Mode Card */}
                      <div 
                        onClick={() => launchGame('time')}
                        className="bg-gradient-to-br from-white to-slate-50 hover:to-amber-50/20 rounded-2xl p-6 border border-gray-100 hover:border-amber-100 shadow-sm hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between h-[190px] relative overflow-hidden"
                      >
                        <div className="absolute right-[-10px] bottom-[-10px] text-amber-500/5 font-sans font-black text-8xl select-none pointer-events-none group-hover:scale-110 transition-transform">
                          T
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                              <Clock className="w-5 h-5" />
                            </span>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-400 block font-sans uppercase font-bold tracking-wider">{t.highScore}</span>
                              <span className="font-mono font-bold text-sm text-amber-600">
                                {Math.max(config.highScores.time, currentProfile.timeHighScore).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <h3 className="font-sans font-black text-lg text-gray-800 flex items-center gap-1 group-hover:text-amber-600 transition-colors">
                            {t.timeMode}
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                          </h3>
                          <p className="text-xs font-sans text-gray-400 mt-1 leading-relaxed">
                            {t.timeDesc}
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* 3. Detailed Rules / Help Manual */}
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider mb-4 border-b border-gray-50 pb-2">
                        <HelpCircle className="w-4 h-4" />
                        <span>{t.howToPlay}</span>
                      </div>

                      <ul className="space-y-3">
                        {t.rules.map((rule, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start text-xs sm:text-sm text-gray-500 leading-relaxed font-sans">
                            <span className="p-1 rounded-full bg-indigo-50 text-indigo-600 font-mono font-black text-[10px] shrink-0 mt-0.5 min-w-[20px] text-center">
                              {idx + 1}
                            </span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* Right Column (Leaderboards) */}
                  <div className="lg:col-span-5 flex flex-col gap-4 h-full">
                    {/* Tab buttons to toggle leaderboards */}
                    <div className="bg-white/80 p-1 rounded-xl border border-gray-100 shadow-sm flex">
                      <button
                        onClick={() => { soundEffects.playSelect(); setLeaderboardMode('classic'); }}
                        className={`flex-1 py-2 text-xs font-sans font-bold rounded-lg transition-all cursor-pointer ${
                          leaderboardMode === 'classic'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-500 hover:text-indigo-600'
                        }`}
                      >
                        {t.classicMode}
                      </button>
                      <button
                        onClick={() => { soundEffects.playSelect(); setLeaderboardMode('time'); }}
                        className={`flex-1 py-2 text-xs font-sans font-bold rounded-lg transition-all cursor-pointer ${
                          leaderboardMode === 'time'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-500 hover:text-indigo-600'
                        }`}
                      >
                        {t.timeMode}
                      </button>
                    </div>

                    <Leaderboard mode={leaderboardMode} lang={lang} />
                  </div>

                </div>
              ) : (
                <UserProfileStats 
                  lang={lang} 
                  currentProfile={currentProfile} 
                  onProfileUpdated={setCurrentProfile} 
                />
              )}

            </motion.div>
          ) : (
            <motion.div
              key="gameplay-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <GameBoard
                mode={selectedMode}
                mathOp={selectedMathOp}
                lang={lang}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                config={config}
                updateHighScore={updateHighScore}
                onBackToMenu={() => setView('home')}
                currentProfile={currentProfile}
                onProfileUpdated={setCurrentProfile}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full max-w-5xl mt-10 text-center text-xs text-gray-400 font-sans border-t border-gray-100 pt-4 z-10 flex flex-col sm:flex-row justify-between items-center gap-2">
        <p>© 2026 SumBlocks Math Sum Elimination. All Rights Reserved.</p>
        <p className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200/50">
          Cloud-Synced Active Database & Authenticated Integration
        </p>
      </footer>

    </div>
  );
}
