import React, { useState, useEffect } from 'react';
import { 
  auth, 
  getUserProfile, 
  updateProfileName 
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { Language, UserProfile, GameMode } from '../types';
import { translations } from '../lib/translations';
import { soundEffects } from '../lib/audio';
import { 
  User, 
  Mail, 
  Lock, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Calendar, 
  Award, 
  BarChart2, 
  Zap, 
  Layers, 
  Clock, 
  CheckCircle2, 
  History, 
  ShieldAlert,
  Loader2,
  TrendingUp,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfileStatsProps {
  lang: Language;
  currentProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
}

export default function UserProfileStats({ lang, currentProfile, onProfileUpdated }: UserProfileStatsProps) {
  const t = translations[lang];

  // Auth form states
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Profile editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(currentProfile.username);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    setEditNameValue(currentProfile.username);
  }, [currentProfile]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setAuthLoading(true);
    setAuthError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      soundEffects.playSuccess(2);
      
      // Load their cloud profile
      const cloudProfile = await getUserProfile(userCredential.user.uid, userCredential.user.displayName || 'Player');
      onProfileUpdated(cloudProfile);
      
      // Reset form
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error(err);
      soundEffects.playError();
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError(lang === 'zh' ? '邮箱或密码不正确' : 'Invalid email or password');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError(lang === 'zh' ? '请输入有效的邮箱地址' : 'Invalid email format');
      } else {
        setAuthError(err.message || 'Login failed');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nickname.trim()) {
      setAuthError(lang === 'zh' ? '请填写所有必填字段' : 'Please fill all fields');
      return;
    }
    if (password.length < 6) {
      setAuthError(lang === 'zh' ? '密码长度不能少于6位' : 'Password must be at least 6 characters');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      // 1. Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // 2. Set display name
      await updateProfile(userCredential.user, { displayName: nickname.trim() });
      
      // 3. Create cloud profile
      const cloudProfile = await getUserProfile(userCredential.user.uid, nickname.trim());
      
      // Migrate local best scores to cloud account if they exist
      if (currentProfile.classicHighScore > 0 || currentProfile.timeHighScore > 0) {
        cloudProfile.classicHighScore = Math.max(cloudProfile.classicHighScore, currentProfile.classicHighScore);
        cloudProfile.timeHighScore = Math.max(cloudProfile.timeHighScore, currentProfile.timeHighScore);
        cloudProfile.totalGamesPlayed += currentProfile.totalGamesPlayed;
        cloudProfile.totalClearedBlocks += currentProfile.totalClearedBlocks;
        cloudProfile.maxLevelReached = Math.max(cloudProfile.maxLevelReached, currentProfile.maxLevelReached);
        cloudProfile.recentHistory = [...cloudProfile.recentHistory, ...currentProfile.recentHistory].slice(0, 5);
        
        // Sync modified back to database
        const { recordGameResult } = await import('../lib/firebase');
        await recordGameResult(userCredential.user.uid, 'classic', cloudProfile.classicHighScore, cloudProfile.maxLevelReached, 0);
      }
      
      soundEffects.playSuccess(3);
      onProfileUpdated(cloudProfile);
      
      // Reset forms
      setEmail('');
      setPassword('');
      setNickname('');
    } catch (err: any) {
      console.error(err);
      soundEffects.playError();
      if (err.code === 'auth/email-already-in-use') {
        setAuthError(lang === 'zh' ? '该邮箱已被注册' : 'Email already in use');
      } else {
        setAuthError(err.message || 'Registration failed');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      soundEffects.playDeselect();
      
      // Switch back to local guest profile
      const { getLocalGuestProfile } = await import('../lib/firebase');
      const guest = getLocalGuestProfile();
      onProfileUpdated(guest);
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const handleUpdateName = async () => {
    if (!editNameValue.trim()) return;
    if (editNameValue.trim() === currentProfile.username) {
      setIsEditingName(false);
      return;
    }

    try {
      await updateProfileName(currentProfile.uid, editNameValue.trim());
      soundEffects.playSuccess(1);
      
      onProfileUpdated({
        ...currentProfile,
        username: editNameValue.trim()
      });
      setIsEditingName(false);
      setNameError('');
    } catch (err) {
      setNameError(lang === 'zh' ? '保存失败，请稍后重试' : 'Failed to save');
    }
  };

  const isGuest = currentProfile.uid === 'guest';

  return (
    <div id="user-profile-widget" className="w-full grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* LEFT PORTION: User statistics dashboard (8 Cols) */}
      <div className="md:col-span-8 flex flex-col gap-6">
        
        {/* Profile Card Summary */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-5 justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <span className={`text-[10px] font-sans font-bold px-2.5 py-1 rounded-full ${
              isGuest ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              {isGuest ? t.guestPlay : t.syncNotice}
            </span>
          </div>

          <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left">
            <div className={`p-4 rounded-2xl ${isGuest ? 'bg-amber-100/60 text-amber-600' : 'bg-indigo-100 text-indigo-600'} shadow-inner`}>
              <User className="w-8 h-8 shrink-0" />
            </div>

            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    maxLength={15}
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-gray-700 font-bold"
                  />
                  <button
                    onClick={handleUpdateName}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-sans font-bold hover:bg-indigo-700 transition-colors"
                  >
                    {t.save}
                  </button>
                  <button
                    onClick={() => { setIsEditingName(false); setEditNameValue(currentProfile.username); }}
                    className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-sans hover:bg-gray-200 transition-colors"
                  >
                    {t.close}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl font-sans font-black text-gray-800 tracking-tight">
                    {currentProfile.username}
                  </h3>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                    title={t.changeName}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-400 mt-1">
                <span className="flex items-center justify-center sm:justify-start gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {isGuest ? 'local_guest_mode' : currentProfile.email}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center justify-center sm:justify-start gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {lang === 'zh' ? '创角时间：' : 'Joined: '} {currentProfile.createdAt}
                </span>
              </div>
            </div>
          </div>

          {!isGuest && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-sans font-bold rounded-xl border border-rose-100 transition-all flex items-center gap-1 shrink-0 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.logout}</span>
            </button>
          )}
        </div>

        {/* stats grid summary */}
        <div>
          <h4 className="text-sm font-sans font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-500" />
            <span>{t.statsTitle}</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* Matches Played */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-wider leading-tight block">
                {t.statsGamesPlayed}
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-mono font-black text-gray-800">
                  {currentProfile.totalGamesPlayed}
                </span>
                <span className="text-xs text-gray-400 font-sans">{lang === 'zh' ? '局' : 'runs'}</span>
              </div>
            </div>

            {/* Blocks Cleared */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-wider leading-tight block">
                {t.statsCleared}
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-mono font-black text-indigo-600">
                  {currentProfile.totalClearedBlocks}
                </span>
                <span className="text-xs text-gray-400 font-sans">{lang === 'zh' ? '个' : 'blocks'}</span>
              </div>
            </div>

            {/* Classic Best */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-wider leading-tight block flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.classicMode} {lang === 'zh' ? '最高分' : 'Best'}</span>
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-mono font-black text-gray-800">
                  {currentProfile.classicHighScore.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Time Best */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-wider leading-tight block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.timeMode} {lang === 'zh' ? '最高分' : 'Best'}</span>
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-mono font-black text-gray-800">
                  {currentProfile.timeHighScore.toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* History Log table */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 text-sm font-sans font-black text-gray-400 uppercase tracking-widest mb-4">
            <History className="w-4 h-4 text-indigo-500" />
            <span>{t.recentGames}</span>
          </div>

          {currentProfile.recentHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-xs font-sans">{t.historyEmpty}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-sans font-bold uppercase tracking-wider text-gray-400">
                    <th className="py-2.5">{t.mode}</th>
                    <th className="py-2.5 text-right">{t.score}</th>
                    <th className="py-2.5 text-right">{t.level}</th>
                    <th className="py-2.5 text-right">{t.totalCleared}</th>
                    <th className="py-2.5 text-right">{t.date}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {currentProfile.recentHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50">
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${
                          h.mode === 'classic' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {h.mode === 'classic' ? t.classicMode : t.timeMode}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-black text-indigo-600">
                        {h.score.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-600">
                        L{h.level}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-600">
                        {h.cleared}
                      </td>
                      <td className="py-3 text-right font-sans text-gray-400">
                        {h.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT PORTION: Register and Login form (if Guest) (4 Cols) */}
      <div className="md:col-span-4 flex flex-col h-full justify-start">
        <AnimatePresence mode="wait">
          {isGuest ? (
            <motion.div
              key="auth-panel"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white/95 backdrop-blur-md rounded-3xl p-6 border border-indigo-100 shadow-md shadow-indigo-600/5 flex flex-col justify-between"
            >
              <div>
                {/* Promo notice */}
                <div className="flex gap-2 items-start p-3 bg-indigo-50/70 border border-indigo-50 rounded-2xl mb-5 text-indigo-800 text-xs leading-relaxed font-sans">
                  <ShieldAlert className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p>{t.loginRequired}</p>
                </div>

                {/* Auth Option Selector tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-4 text-xs font-sans font-bold text-gray-500">
                  <button
                    onClick={() => { soundEffects.playSelect(); setAuthTab('login'); setAuthError(''); }}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      authTab === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-indigo-600'
                    }`}
                  >
                    {lang === 'zh' ? '登 录' : 'Log In'}
                  </button>
                  <button
                    onClick={() => { soundEffects.playSelect(); setAuthTab('register'); setAuthError(''); }}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      authTab === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-indigo-600'
                    }`}
                  >
                    {lang === 'zh' ? '注 册' : 'Sign Up'}
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="space-y-3.5">
                  
                  {authTab === 'register' && (
                    <div>
                      <label className="text-[10px] font-sans font-black uppercase text-gray-400 block mb-1">
                        {t.nickname}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          maxLength={15}
                          placeholder={t.namePlaceholder}
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-sans font-black uppercase text-gray-400 block mb-1">
                      {t.email}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        placeholder="player@sumblocks.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-sans font-black uppercase text-gray-400 block mb-1">
                      {t.password}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {authError && (
                    <p className="text-xs text-rose-500 font-sans font-semibold mt-1 bg-rose-50 border border-rose-100 p-2 rounded-xl">
                      ⚠ {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-sans font-black text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 mt-4 cursor-pointer"
                  >
                    {authLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : authTab === 'login' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>{lang === 'zh' ? '登 录' : 'Log In'}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>{lang === 'zh' ? '注 册 账 户' : 'Register Account'}</span>
                      </>
                    )}
                  </button>

                </form>
              </div>

              <div className="text-center mt-6 pt-4 border-t border-gray-100 text-[10px] font-sans text-gray-400">
                {t.guestNotice}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="active-cloud-notice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-6 text-center flex flex-col items-center justify-center h-full min-h-[300px]"
            >
              <div className="p-3 bg-emerald-100/80 rounded-full text-emerald-600 mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-sans font-black text-sm text-emerald-800 uppercase tracking-wider mb-1">
                {lang === 'zh' ? '云端存档已激活' : 'Cloud Sync Active'}
              </h4>
              <p className="text-xs font-sans text-emerald-600/80 max-w-[200px] leading-relaxed mb-4">
                {lang === 'zh' ? '您的最高纪录和每一次对局数据都在实时自动同步备份。' : 'Your high scores and battle achievements are securely backed up in real time.'}
              </p>
              
              <div className="flex items-center gap-1.5 py-1 px-3 bg-emerald-100/40 rounded-full text-[10px] text-emerald-700 font-sans font-semibold border border-emerald-100/50">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Global Leaderboards Synced</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
