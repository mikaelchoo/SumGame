export type GameMode = 'classic' | 'time';
export type Language = 'zh' | 'en';
export type MathOp = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';

export interface Cell {
  id: string;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  mode: GameMode;
  level: number;
  date: string;
}

export interface GameHistoryItem {
  id: string;
  mode: GameMode;
  score: number;
  level: number;
  cleared: number;
  date: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  createdAt: string;
  classicHighScore: number;
  timeHighScore: number;
  totalGamesPlayed: number;
  totalClearedBlocks: number;
  maxLevelReached: number;
  recentHistory: GameHistoryItem[];
}

export interface UserConfig {
  username: string;
  soundEnabled: boolean;
  language: Language;
  highScores: {
    classic: number;
    time: number;
  };
}

