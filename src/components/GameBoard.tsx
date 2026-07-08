import React, { useState, useEffect, useRef } from 'react';
import { GameMode, MathOp, Language, Cell, UserConfig, UserProfile } from '../types';
import { translations } from '../lib/translations';
import { soundEffects } from '../lib/audio';
import { submitScore } from '../lib/firebase';
import { 
  XCircle, 
  Plus, 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Trophy, 
  ArrowLeft, 
  Info,
  Flame,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ROWS = 9;
const COLS = 6;

interface GameBoardProps {
  mode: GameMode;
  mathOp: MathOp;
  lang: Language;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  config: UserConfig;
  updateHighScore: (mode: GameMode, score: number) => void;
  onBackToMenu: () => void;
  currentProfile: UserProfile;
  onProfileUpdated: (profile: UserProfile) => void;
}

export default function GameBoard({
  mode,
  mathOp,
  lang,
  soundEnabled,
  setSoundEnabled,
  config,
  updateHighScore,
  onBackToMenu,
  currentProfile,
  onProfileUpdated
}: GameBoardProps) {
  const t = translations[lang];

  // Game States
  const [grid, setGrid] = useState<number[][]>([]);
  const [selected, setSelected] = useState<boolean[][]>([]);
  const [selectedOrder, setSelectedOrder] = useState<{ r: number; c: number }[]>([]);
  const [targetNum, setTargetNum] = useState<number>(10);
  const [activeTurnOp, setActiveTurnOp] = useState<MathOp>('addition');
  const [score, setScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [clearedCount, setClearedCount] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  
  // Combos & Feedback
  const [combo, setCombo] = useState<number>(0);
  const [floatingText, setFloatingText] = useState<{ id: number; text: string; r: number; c: number }[]>([]);
  const nextFloatingId = useRef(0);

  // Time Mode specific
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [maxTime, setMaxTime] = useState<number>(15);

  // Auto-shift timer in Classic Mode (optional fun addition, say every 35s to prevent stalling)
  const [classicTimeLeft, setClassicTimeLeft] = useState<number>(35);

  // Sound Toggle Handler
  const toggleSound = () => {
    soundEffects.playSelect();
    setSoundEnabled(!soundEnabled);
  };

  // 1. Initialize Game
  useEffect(() => {
    startNewGame();
  }, [mode, mathOp]);

  const startNewGame = () => {
    // 1. Generate empty grid (9 rows x 6 cols)
    const initialGrid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    
    // 2. Populate bottom 4 rows (rows 5, 6, 7, 8) with random values 1 to 9
    for (let r = 5; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        initialGrid[r][c] = getRandomValue();
      }
    }

    // 3. Set states
    setGrid(initialGrid);
    setSelected(Array(ROWS).fill(null).map(() => Array(COLS).fill(false)));
    setSelectedOrder([]);
    setScore(0);
    setLevel(1);
    setClearedCount(0);
    setGameOver(false);
    setIsNewHighScore(false);
    setCombo(0);
    setFloatingText([]);

    // Set Time limits
    const initialTime = getTimeLimitForLevel(1);
    setTimeLeft(initialTime);
    setMaxTime(initialTime);
    setClassicTimeLeft(35);

    // 4. Generate first target
    const result = getSolvableTarget(initialGrid, 1, mathOp);
    setTargetNum(result.target);
    setActiveTurnOp(result.operator);
  };

  const getRandomValue = () => {
    // Return weighted random values: more 1-5s, fewer 7-9s to make math pleasant
    const rand = Math.random();
    if (rand < 0.2) return 1;
    if (rand < 0.4) return 2;
    if (rand < 0.55) return 3;
    if (rand < 0.7) return 4;
    if (rand < 0.8) return 5;
    if (rand < 0.88) return 6;
    if (rand < 0.94) return 7;
    if (rand < 0.97) return 8;
    return 9;
  };

  const getTimeLimitForLevel = (lvl: number) => {
    // Starts at 15s, decreases by 0.5s per level, minimum 6s
    return Math.max(15 - (lvl - 1) * 0.5, 6);
  };

  // 2. Main Game Countdown Timer
  useEffect(() => {
    if (gameOver) return;

    const timer = setInterval(() => {
      if (mode === 'time') {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time is up!
            handleTimeOut();
            return getTimeLimitForLevel(level);
          }
          // Play ticking sound in last 3 seconds
          if (prev <= 4 && soundEnabled) {
            soundEffects.playSelect();
          }
          return prev - 1;
        });
      } else {
        // Classic mode slow auto-shift (35 seconds) to prevent infinite thinking/stalling
        setClassicTimeLeft((prev) => {
          if (prev <= 1) {
            forceNewRow(true); // Auto-add row on timeout
            return 35;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, mode, level, grid, soundEnabled]);

  const handleTimeOut = () => {
    // Reset selection
    setSelected(Array(ROWS).fill(null).map(() => Array(COLS).fill(false)));
    setSelectedOrder([]);
    
    // Play timeout/error sound
    soundEffects.playError();

    // Trigger floating warning text
    triggerGlobalFloatingText(lang === 'zh' ? '时间到！新增一行' : 'Time Out! Row Added');

    // Force add a bottom row
    forceNewRow(false); // No points for timed out row
  };

  const triggerGlobalFloatingText = (text: string) => {
    const id = nextFloatingId.current++;
    setFloatingText((prev) => [...prev, { id, text, r: 3, c: 2 }]);
    setTimeout(() => {
      setFloatingText((prev) => prev.filter((item) => item.id !== id));
    }, 1200);
  };

  const triggerCellFloatingText = (text: string, r: number, c: number) => {
    const id = nextFloatingId.current++;
    setFloatingText((prev) => [...prev, { id, text, r, c }]);
    setTimeout(() => {
      setFloatingText((prev) => prev.filter((item) => item.id !== id));
    }, 1200);
  };

  // 3. Grid Row Shifting (Classic and Time Penalty)
  const forceNewRow = (awardBonusPoints = false) => {
    if (gameOver) return;

    // Check if any cell in row 0 has a block. If yes, shifting up causes game over!
    let willGameOver = false;
    for (let c = 0; c < COLS; c++) {
      if (grid[0]?.[c] > 0) {
        willGameOver = true;
        break;
      }
    }

    if (willGameOver) {
      triggerGameOver();
      return;
    }

    // Shift all rows up by 1
    const nextGrid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        nextGrid[r][c] = grid[r + 1][c];
      }
    }

    // Generate brand new numbers for the bottom row (row 8)
    for (let c = 0; c < COLS; c++) {
      nextGrid[ROWS - 1][c] = getRandomValue();
    }

    // Update grid state
    setGrid(nextGrid);
    
    // We must also shift the selected cells array up accordingly
    const nextSelected = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        nextSelected[r][c] = selected[r + 1][c];
      }
    }
    setSelected(nextSelected);

    // Shift selectedOrder coords up by 1 row
    setSelectedOrder((prev) => 
      prev
        .map((item) => ({ r: item.r - 1, c: item.c }))
        .filter((item) => item.r >= 0)
    );

    // Play row sounds
    soundEffects.playNewRow();

    // Reset auto-shift timers
    setClassicTimeLeft(35);

    // Award bonus if manually or strategically added
    if (awardBonusPoints) {
      const bonus = 100 * level;
      setScore((prev) => prev + bonus);
      triggerGlobalFloatingText(`+${bonus} Row Bonus!`);
    }

    // Recalculate target if the board state changed and current target became impossible
    // Or just choose a fresh target to keep things lively
    const result = getSolvableTarget(nextGrid, level, mathOp);
    setTargetNum(result.target);
    setActiveTurnOp(result.operator);
  };

  const triggerGameOver = () => {
    setGameOver(true);
    soundEffects.playGameOver();

    // Check high score
    const currentHighScore = config.highScores[mode];
    if (score > currentHighScore) {
      setIsNewHighScore(true);
      updateHighScore(mode, score);
    }

    // Auto submit to Firebase leaderboard
    const activeUsername = currentProfile.username || config.username || 'Player';
    submitScore(activeUsername, score, mode, level);

    // Sync statistics to local or cloud account profile
    import('../lib/firebase').then(({ recordGameResult }) => {
      recordGameResult(currentProfile.uid, mode, score, level, clearedCount).then((updatedProfile) => {
        onProfileUpdated(updatedProfile);
      });
    });
  };

  // 4. Solvability Target Solver
  const getSolvableTarget = (board: number[][], lvl: number, baseOp: MathOp): { target: number; operator: MathOp } => {
    const activeValues: { r: number; c: number; val: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r]?.[c] > 0) {
          activeValues.push({ r, c, val: board[r][c] });
        }
      }
    }

    // If empty board, return fallback
    if (activeValues.length === 0) {
      return { target: 10, operator: baseOp === 'mixed' ? 'addition' : baseOp };
    }

    // Determine operator for this specific turn
    let turnOp: MathOp = baseOp;
    if (baseOp === 'mixed') {
      const ops: MathOp[] = ['addition', 'subtraction', 'multiplication', 'division'];
      turnOp = ops[Math.floor(Math.random() * ops.length)];
    }

    // Generate target based on turnOp
    if (turnOp === 'addition') {
      // Sum of 2 to 4 random active cells
      let comboCount = 2;
      if (lvl > 2) comboCount = 3;
      if (lvl > 6) comboCount = 4;
      
      const countToSum = Math.min(
        Math.floor(Math.random() * (comboCount - 1)) + 2, // 2 to comboCount
        activeValues.length
      );
      
      const shuffled = [...activeValues].sort(() => Math.random() - 0.5);
      const subset = shuffled.slice(0, countToSum);
      const sum = subset.reduce((a, b) => a + b.val, 0);
      return { target: sum < 2 ? 10 : sum, operator: 'addition' };

    } else if (turnOp === 'subtraction') {
      // V1 - V2 or V1 - V2 - V3 (must be > 0)
      const shuffled = [...activeValues].sort((a, b) => b.val - a.val); // descending
      if (shuffled.length >= 2 && shuffled[0].val > shuffled[1].val) {
        const v1 = shuffled[0].val;
        const v2 = shuffled[1].val;
        if (lvl > 4 && shuffled.length >= 3 && v1 - v2 - shuffled[2].val > 0) {
          return { target: v1 - v2 - shuffled[2].val, operator: 'subtraction' };
        }
        return { target: v1 - v2, operator: 'subtraction' };
      }
      // Fallback subtraction
      const anyShuffled = [...activeValues].sort(() => Math.random() - 0.5);
      if (anyShuffled.length >= 2) {
        const maxV = Math.max(anyShuffled[0].val, anyShuffled[1].val);
        const minV = Math.min(anyShuffled[0].val, anyShuffled[1].val);
        if (maxV - minV > 0) {
          return { target: maxV - minV, operator: 'subtraction' };
        }
      }
      return { target: 1, operator: 'addition' }; // hard fallback

    } else if (turnOp === 'multiplication') {
      // V1 * V2
      const shuffled = [...activeValues].sort(() => Math.random() - 0.5);
      if (shuffled.length >= 2) {
        const v1 = shuffled[0].val;
        const v2 = shuffled[1].val;
        const prod = v1 * v2;
        return { target: prod > 120 ? 12 : prod, operator: 'multiplication' };
      }
      return { target: shuffled[0].val, operator: 'multiplication' };

    } else if (turnOp === 'division') {
      // Search for any integer division combination: V1 % V2 === 0
      const shuffled = [...activeValues].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        for (let j = 0; j < shuffled.length; j++) {
          if (i !== j) {
            const v1 = shuffled[i].val;
            const v2 = shuffled[j].val;
            if (v1 > v2 && v2 > 0 && v1 % v2 === 0) {
              return { target: Math.floor(v1 / v2), operator: 'division' };
            }
          }
        }
      }
      // Fallback division
      const hasOne = activeValues.some(a => a.val === 1);
      if (hasOne) {
        const nonOne = activeValues.find(a => a.val > 1);
        if (nonOne) {
          return { target: nonOne.val, operator: 'division' };
        }
      }
      return { target: 1, operator: 'division' };
    }

    return { target: 10, operator: 'addition' };
  };

  // 5. Select/Toggle Logic
  const handleCellClick = (r: number, c: number) => {
    if (gameOver) return;
    
    const val = grid[r]?.[c];
    if (!val || val === 0) return; // Ignore empty spaces

    const isSelected = selected[r]?.[c] || false;
    const nextSelected = selected.map((rowArr, ri) => 
      rowArr.map((selVal, ci) => (ri === r && ci === c ? !selVal : selVal))
    );
    setSelected(nextSelected);

    if (!isSelected) {
      // Adding to sequence
      setSelectedOrder((prev) => [...prev, { r, c }]);
      soundEffects.playSelect();
    } else {
      // Removing from sequence
      setSelectedOrder((prev) => prev.filter((item) => !(item.r === r && item.c === c)));
      soundEffects.playDeselect();
    }
  };

  // Calculate Running Selected Sum & Formulas
  const getSelectedFormulaAndResult = () => {
    if (selectedOrder.length === 0) {
      return { result: 0, formulaStr: '', isValid: false, count: 0, blocks: [] };
    }

    const blocks = selectedOrder.map(coord => ({
      r: coord.r,
      c: coord.c,
      val: grid[coord.r]?.[coord.c] || 0
    })).filter(b => b.val > 0);

    const values = blocks.map(b => b.val);
    if (values.length === 0) {
      return { result: 0, formulaStr: '', isValid: false, count: 0, blocks: [] };
    }

    let result = 0;
    let formulaStr = '';
    let isValid = true;

    if (activeTurnOp === 'addition') {
      result = values.reduce((a, b) => a + b, 0);
      formulaStr = values.join(' + ');
    } else if (activeTurnOp === 'subtraction') {
      result = values[0];
      for (let i = 1; i < values.length; i++) {
        result -= values[i];
      }
      formulaStr = values.join(' - ');
      if (values.length < 2) {
        isValid = false; // Need at least 2 blocks to be valid subtraction formula
      }
    } else if (activeTurnOp === 'multiplication') {
      result = values.reduce((a, b) => a * b, 1);
      formulaStr = values.join(' × ');
    } else if (activeTurnOp === 'division') {
      result = values[0];
      formulaStr = `${values[0]}`;
      for (let i = 1; i < values.length; i++) {
        if (values[i] === 0 || result % values[i] !== 0) {
          isValid = false;
        }
        result = Math.floor(result / values[i]);
        formulaStr += ` ÷ ${values[i]}`;
      }
      if (values.length < 2) {
        isValid = false; // Need at least 2 blocks for division formula
      }
    }

    return { result, formulaStr, isValid, count: values.length, blocks };
  };

  const { result: currentSum, formulaStr, isValid: formulaIsValid, count: selectedCount, blocks: selectedBlocks } = getSelectedFormulaAndResult();

  // 6. Check for Sum Match Trigger
  useEffect(() => {
    if (selectedCount === 0) return;

    if (formulaIsValid && currentSum === targetNum) {
      // SUCCESS MATCH!
      handleMatchSuccess(selectedBlocks);
    }
  }, [currentSum, formulaIsValid, targetNum, selectedCount]);

  const handleMatchSuccess = (matchedList: { r: number; c: number; val: number }[]) => {
    const blockCount = matchedList.length;

    // 1. Calculate Score & Multipliers
    let basePoints = targetNum * 10;
    let multiplier = 1.0;
    let comboMsg = '';

    if (blockCount === 3) {
      multiplier = 1.5;
      comboMsg = `Combo x1.5!`;
    } else if (blockCount === 4) {
      multiplier = 2.0;
      comboMsg = `MEGA Combo x2.0!`;
    } else if (blockCount >= 5) {
      multiplier = 3.0;
      comboMsg = `HYPER Combo x3.0!`;
    }

    const finalPoints = Math.round(basePoints * multiplier * level);
    setScore((prev) => prev + finalPoints);
    setClearedCount((prev) => prev + blockCount);

    // 2. Play success sounds & combos
    if (blockCount >= 3) {
      soundEffects.playCombo();
    } else {
      soundEffects.playSuccess(blockCount);
    }

    // 3. Floating points indicator on the grid
    const centerBlock = matchedList[Math.floor(matchedList.length / 2)] || { r: 4, c: 3 };
    triggerCellFloatingText(`+${finalPoints} ${comboMsg}`, centerBlock.r, centerBlock.c);

    // 4. Eliminate matched cells from grid (set to 0)
    const nextGrid = grid.map((rowArr) => [...rowArr]);
    matchedList.forEach(({ r, c }) => {
      if (nextGrid[r]) {
        nextGrid[r][c] = 0;
      }
    });

    // 5. Reset selected state
    setSelected(Array(ROWS).fill(null).map(() => Array(COLS).fill(false)));
    setSelectedOrder([]);

    // 6. Apply gravity so remaining numbers fall down to fill holes
    const gridWithGravity = applyGravity(nextGrid);

    // 7. Mode progression logic
    if (mode === 'classic') {
      // Classic Mode: Shifting/Adding a row immediately on match success!
      setGrid(gridWithGravity);
      setTimeout(() => {
        shiftUpGrid(gridWithGravity);
      }, 200);
    } else {
      // Time Mode: Reset timer, update grid, choose new target
      setGrid(gridWithGravity);
      const result = getSolvableTarget(gridWithGravity, level, mathOp);
      setTargetNum(result.target);
      setActiveTurnOp(result.operator);
      
      // Reset timer
      const newTime = getTimeLimitForLevel(level);
      setTimeLeft(newTime);
      setMaxTime(newTime);
    }

    // Level progression: every 12 cleared blocks, level up!
    const nextLevel = Math.floor((clearedCount + blockCount) / 12) + 1;
    if (nextLevel > level) {
      setLevel(nextLevel);
      triggerGlobalFloatingText(`${lang === 'zh' ? '等级提升！' : 'LEVEL UP! '} Lvl ${nextLevel}`);
    }
  };

  const shiftUpGrid = (currentBoard: number[][]) => {
    let willGameOver = false;
    for (let c = 0; c < COLS; c++) {
      if (currentBoard[0]?.[c] > 0) {
        willGameOver = true;
        break;
      }
    }

    if (willGameOver) {
      triggerGameOver();
      return;
    }

    // Shift up
    const nextGrid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        if (currentBoard[r + 1]) {
          nextGrid[r][c] = currentBoard[r + 1][c];
        }
      }
    }

    // Bottom row generated freshly
    for (let c = 0; c < COLS; c++) {
      nextGrid[ROWS - 1][c] = getRandomValue();
    }

    setGrid(nextGrid);
    soundEffects.playNewRow();

    // Choose target on the final shifted grid
    const result = getSolvableTarget(nextGrid, level, mathOp);
    setTargetNum(result.target);
    setActiveTurnOp(result.operator);
  };

  const applyGravity = (currentBoard: number[][]): number[][] => {
    const nextBoard = currentBoard.map((rowArr) => [...rowArr]);
    for (let c = 0; c < COLS; c++) {
      const columnValues: number[] = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (nextBoard[r][c] !== 0) {
          columnValues.push(nextBoard[r][c]);
        }
      }
      let idx = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (idx < columnValues.length) {
          nextBoard[r][c] = columnValues[idx];
          idx++;
        } else {
          nextBoard[r][c] = 0;
        }
      }
    }
    return nextBoard;
  };

  // 7. Grid Column Height Analysis for Warnings
  const getGridWarningState = () => {
    // If any column has blocks in rows 0, 1, 2, we show warning indicators
    let isWarning = false;
    for (let c = 0; c < COLS; c++) {
      if (grid[1]?.[c] > 0 || grid[2]?.[c] > 0) {
        isWarning = true;
        break;
      }
    }
    return isWarning;
  };

  const isCriticalWarning = getGridWarningState();

  // Clear All Selected Elements
  const clearSelection = () => {
    soundEffects.playDeselect();
    setSelected(Array(ROWS).fill(null).map(() => Array(COLS).fill(false)));
    setSelectedOrder([]);
  };

  // Cell Background Palette based on values
  const getCellColorClass = (val: number, isSel: boolean) => {
    if (val === 0) return 'bg-gray-50/40 border border-dashed border-gray-200/50';
    
    if (isSel) {
      return 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-95 border-2 border-indigo-300 ring-2 ring-indigo-400';
    }

    switch (val) {
      case 1: return 'bg-sky-50 text-sky-700 hover:bg-sky-100/80 border border-sky-100';
      case 2: return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-100';
      case 3: return 'bg-teal-50 text-teal-700 hover:bg-teal-100/80 border border-teal-100';
      case 4: return 'bg-amber-50 text-amber-700 hover:bg-amber-100/80 border border-amber-100';
      case 5: return 'bg-orange-50 text-orange-700 hover:bg-orange-100/80 border border-orange-100';
      case 6: return 'bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-100';
      case 7: return 'bg-purple-50 text-purple-700 hover:bg-purple-100/80 border border-purple-100';
      case 8: return 'bg-violet-50 text-violet-700 hover:bg-violet-100/80 border border-violet-100';
      case 9: return 'bg-red-50 text-red-700 hover:bg-red-100/80 border border-red-100';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  // Submit Score modal name state
  const [submitName, setSubmitName] = useState(config.username || '');
  const [submitting, setSubmitting] = useState(false);
  const [submittingDone, setSubmittingDone] = useState(false);

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitName.trim()) return;
    setSubmitting(true);
    await submitScore(submitName.trim(), score, mode, level);
    setSubmitting(false);
    setSubmittingDone(true);
  };

  return (
    <div id="game-arena" className="flex flex-col w-full max-w-4xl mx-auto items-center">
      
      {/* 1. Header Navigation and Toggles */}
      <div className="w-full flex justify-between items-center px-4 py-2 mb-2">
        <button
          onClick={() => {
            soundEffects.playDeselect();
            onBackToMenu();
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/80 hover:bg-white text-gray-600 hover:text-indigo-600 font-sans font-medium rounded-xl border border-gray-100 shadow-sm transition-all hover:translate-x-[-2px] text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToMenu}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-2 bg-white/80 hover:bg-white text-gray-600 hover:text-indigo-600 rounded-xl border border-gray-100 shadow-sm transition-all"
            title={t.audio}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Main Play Grid & Control Interface */}
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 px-4">
        
        {/* Left Side: Scoreboard & Stats Indicator */}
        <div className="md:col-span-4 flex flex-col gap-4">
          
          {/* Main Scoring Card */}
          <div className="bg-white/85 backdrop-blur-md p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] text-gray-50/60 font-sans font-bold text-7xl select-none pointer-events-none">
              #
            </div>
            <div>
              <span className="text-xs font-sans font-bold text-indigo-500 tracking-wider uppercase">
                {mode === 'classic' ? t.classicMode : t.timeMode}
              </span>
              <h2 className="text-3xl font-mono font-black text-gray-800 tracking-tight mt-1">
                {score.toLocaleString()}
              </h2>
              <p className="text-xs font-sans text-gray-400 mt-0.5">
                {t.score}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-50">
              <div>
                <span className="text-xs font-sans text-gray-400 block">{t.level}</span>
                <span className="font-mono font-bold text-lg text-gray-700">Lvl {level}</span>
              </div>
              <div>
                <span className="text-xs font-sans text-gray-400 block">{t.localBest}</span>
                <span className="font-mono font-semibold text-sm text-gray-500">
                  {config.highScores[mode]?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Active Target Panel */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-indigo-50 rounded-full text-[10px] font-sans font-semibold text-indigo-600">
              <Zap className="w-3 h-3 fill-indigo-100" />
              <span>{t.anywhereText}</span>
            </div>

            {/* Dynamic Math Mode Operator Badge */}
            <div className={`absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-sans font-black shadow-sm ring-4 ${
              activeTurnOp === 'addition'
                ? 'bg-emerald-500 text-white ring-emerald-500/10'
                : activeTurnOp === 'subtraction'
                ? 'bg-rose-500 text-white ring-rose-500/10'
                : activeTurnOp === 'multiplication'
                ? 'bg-amber-500 text-white ring-amber-500/10'
                : 'bg-sky-500 text-white ring-sky-500/10'
            }`}>
              <span>
                {activeTurnOp === 'addition' ? '➕ ' + t.addition : activeTurnOp === 'subtraction' ? '➖ ' + t.subtraction : activeTurnOp === 'multiplication' ? '✖️ ' + t.multiplication : '➗ ' + t.division}
              </span>
            </div>
            
            <span className="text-xs font-sans font-bold text-gray-400 uppercase tracking-widest mt-3 block">
              {t.target}
            </span>
            
            {/* BIG target indicator */}
            <motion.div 
              key={targetNum}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-mono font-black text-indigo-600 tracking-tighter my-1 drop-shadow-sm flex items-center justify-center gap-1"
            >
              {targetNum}
            </motion.div>

            {/* Dynamic Formula Display */}
            <div className="w-full mt-2 py-2 px-3 bg-slate-50/70 rounded-xl border border-slate-100 min-h-[52px] flex flex-col justify-center items-center">
              <span className="text-[9px] font-sans text-gray-400 uppercase tracking-widest leading-none mb-1">{t.formula}</span>
              {selectedCount > 0 ? (
                <div className="font-mono font-black text-xs sm:text-sm text-gray-800 break-all leading-tight flex flex-col items-center">
                  <span>{formulaStr}</span>
                  {formulaIsValid ? (
                    <span className="text-xs font-sans font-bold text-emerald-600 mt-0.5">
                      = {currentSum}
                    </span>
                  ) : (
                    <span className="text-[10px] font-sans font-medium text-rose-500 mt-0.5 leading-none">
                      {activeTurnOp === 'division' ? (lang === 'zh' ? '须整除且不少于2个数字' : 'Must divide exactly & select ≥2') : activeTurnOp === 'subtraction' ? (lang === 'zh' ? '须选择不少于2个数字' : 'Select ≥2 cells') : (lang === 'zh' ? '算式不完整' : 'Incomplete formula')}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-gray-400 font-sans italic">
                  {lang === 'zh' ? '选择数字开始计算' : 'Select numbers to build formula'}
                </span>
              )}
            </div>

            {/* Blocks Count info */}
            {selectedCount > 0 && (
              <div className="mt-2 text-xs font-sans text-gray-500 flex items-center gap-1 justify-center">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-100 animate-pulse" />
                <span>{selectedCount} {t.selectedBlocks}</span>
              </div>
            )}
          </div>

          {/* Mode Timing Progress Indicator */}
          {mode === 'time' ? (
            <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-1.5 text-xs font-sans font-semibold text-gray-500">
                <span>{t.timeMode} Countdown</span>
                <span className={`font-mono font-bold ${timeLeft <= 4 ? 'text-rose-500 animate-bounce' : 'text-gray-600'}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    timeLeft / maxTime > 0.5 
                      ? 'bg-emerald-500' 
                      : timeLeft / maxTime > 0.25 
                      ? 'bg-amber-500' 
                      : 'bg-rose-500 animate-pulse'
                  }`}
                  animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-1.5 text-xs font-sans font-semibold text-gray-500">
                <span>Next Auto Row Add</span>
                <span className="font-mono text-gray-600">{classicTimeLeft}s</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(classicTimeLeft / 35) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick instructions or Action tools */}
          <div className="hidden md:flex flex-col gap-2 p-4 bg-indigo-50/40 rounded-2xl border border-indigo-50">
            <div className="flex gap-1.5 items-start text-xs text-indigo-800 leading-relaxed font-sans">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                {t.rules[0]} <span className="font-semibold text-indigo-900">{t.rules[1]}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Interactive Board Grid */}
        <div className="md:col-span-8 flex flex-col items-center">
          
          {/* Critical Height Warnings */}
          {isCriticalWarning && (
            <div className="w-full mb-3 flex items-center justify-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 py-1.5 px-4 rounded-xl text-xs font-sans font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>{lang === 'zh' ? '警告：数字快到顶了！' : 'WARNING: GRID CEILING CRITICAL!'}</span>
            </div>
          )}

          {/* Interactive Core Puzzle Grid container */}
          <div className="relative bg-slate-100/60 p-3 rounded-3xl border border-gray-200/50 shadow-inner w-full aspect-[6/9] max-w-[420px]">
            
            {/* Grid Frame */}
            <div className="grid grid-cols-6 grid-rows-9 gap-1.5 h-full w-full">
              {grid.map((rowArr, r) =>
                rowArr.map((val, c) => {
                  const isSel = selected[r]?.[c] || false;
                  const orderIndex = selectedOrder.findIndex((item) => item.r === r && item.c === c);
                  return (
                    <motion.button
                      key={`${r}-${c}-${val}`}
                      id={`cell-${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      disabled={val === 0}
                      whileHover={val > 0 ? { scale: 1.05 } : {}}
                      whileTap={val > 0 ? { scale: 0.95 } : {}}
                      className={`h-full w-full rounded-xl flex items-center justify-center font-mono font-black text-lg sm:text-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 relative ${getCellColorClass(
                        val,
                        isSel
                      )}`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <span>{val > 0 ? val : ''}</span>
                      {isSel && orderIndex !== -1 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-white/95 text-indigo-950 rounded-full text-[9px] font-sans font-black flex items-center justify-center border border-indigo-100 shadow-sm leading-none">
                          {orderIndex + 1}
                        </span>
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* floating texts Overlay */}
            <AnimatePresence>
              {floatingText.map((f) => {
                // Calculate grid coordinate estimate for placement
                const topPct = (f.r / ROWS) * 100;
                const leftPct = (f.c / COLS) * 100;
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 15, scale: 0.8 }}
                    animate={{ opacity: 1, y: -40, scale: 1.1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.0, ease: 'easeOut' }}
                    className="absolute pointer-events-none font-sans font-black text-sm sm:text-base text-indigo-700 bg-white/95 border border-indigo-200 py-1 px-3 rounded-full shadow-md z-10 text-center"
                    style={{
                      top: `${topPct + 5}%`,
                      left: `${leftPct + 10}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {f.text}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Controls Below Board */}
          <div className="w-full flex justify-between gap-3 max-w-[420px] mt-4">
            <button
              onClick={clearSelection}
              disabled={selectedCount === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 font-sans font-bold text-xs sm:text-sm rounded-xl border border-gray-200 transition-all disabled:cursor-not-allowed shadow-sm"
            >
              <XCircle className="w-4 h-4 text-gray-400" />
              <span>{lang === 'zh' ? '清空选择' : 'Deselect All'}</span>
            </button>

            <button
              onClick={() => forceNewRow(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-sans font-bold text-xs sm:text-sm rounded-xl border border-indigo-100 transition-all shadow-sm group"
              title={t.addManualRowTooltip}
            >
              <Plus className="w-4 h-4 text-indigo-500 group-hover:rotate-90 transition-transform" />
              <span>{t.addManualRow} (+Bonus)</span>
            </button>
          </div>

        </div>

      </div>

      {/* 3. GAME OVER OVERLAY MODAL */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center relative overflow-hidden"
            >
              {/* Confetti / Highscore banner decoration */}
              {isNewHighScore && (
                <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 font-sans font-black text-xs py-1.5 uppercase tracking-widest flex items-center justify-center gap-1 animate-pulse">
                  <Trophy className="w-3.5 h-3.5 fill-amber-950" />
                  <span>{t.newHighScore}</span>
                </div>
              )}

              <div className="mt-4 mb-2 flex justify-center">
                <div className="p-3 bg-rose-50 rounded-full text-rose-500">
                  <XCircle className="w-10 h-10" />
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-sans font-black text-gray-800 tracking-tight">
                {t.gameOver}
              </h2>
              <p className="text-sm font-sans text-gray-500 max-w-[280px] mx-auto mt-1 leading-relaxed">
                {t.gameOverDesc}
              </p>

              {/* Score summary panel */}
              <div className="my-6 bg-slate-50 p-4 rounded-2xl border border-gray-100 grid grid-cols-2 gap-4">
                <div className="border-r border-gray-200">
                  <span className="text-[10px] font-sans text-gray-400 uppercase tracking-widest block">
                    {t.score}
                  </span>
                  <span className="text-2xl font-mono font-black text-indigo-600 block">
                    {score.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-gray-400 uppercase tracking-widest block">
                    {t.totalCleared}
                  </span>
                  <span className="text-2xl font-mono font-black text-gray-700 block">
                    {clearedCount}
                  </span>
                </div>
              </div>

              {/* Cloud Leaderboard Submission */}
              {!submittingDone ? (
                <form onSubmit={handleSubmitScore} className="mb-6">
                  <p className="text-xs font-sans text-gray-400 mb-2">
                    {lang === 'zh' ? '加入全球玩家排行榜：' : 'Upload your record to the global board:'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={15}
                      required
                      value={submitName}
                      onChange={(e) => setSubmitName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 shadow-md shadow-indigo-600/10"
                    >
                      {submitting ? t.submitting : t.submitScore}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mb-6 p-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-sans font-semibold">
                  ✓ {t.submittingSuccess}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={startNewGame}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:translate-y-[-1px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t.restart}</span>
                </button>
                <button
                  onClick={onBackToMenu}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-sans font-bold text-sm rounded-xl transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.backToMenu}</span>
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
