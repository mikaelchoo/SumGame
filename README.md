# Math Sum Elimination Puzzle (数字消除迷宫)

An addictive, highly-polished math puzzle game built with **React**, **TypeScript**, **Tailwind CSS**, and **Firebase**. Players select adjacent or free numbers from a grid to construct mathematical formulas (addition, subtraction, multiplication, division, or mixed operations) to match dynamically generated target numbers.

---

## 🎨 Game Highlights & Features (游戏特色)

### 1. Dynamic Math Operations (多元数学运算法则)
Before starting a game, you can choose from 5 different mathematical rules to test your mental math agility:
*   ➕ **Addition (加法模式)**: The classic puzzle. Select grid cells to sum up exactly to the target number.
*   ➖ **Subtraction (减法模式)**: Tap a starting larger cell, then select successive cells to subtract until you reach the target.
*   ✖️ **Multiplication (乘法模式)**: Choose multiple numbers that multiply together to reach the target. Score multipliers increase rapidly!
*   ➗ **Division (除法模式)**: Select a starting dividend, and sequentially tap exact divisors to reach the target quotient.
*   🎲 **Mixed Operators (混合混沌模式)**: Chaos mode! Every new target is generated with a different random operator, demanding rapid mathematical adaptation.

### 2. Live Sequence Indicators (点击顺序标识)
To facilitate subtraction, division, and complex formulas, a **Sequence Badge** (1, 2, 3...) appears on the top-right corner of each selected cell. You can trace the exact order of your calculation sequence and review the active formula string in real-time.

### 3. Dual Game Modes (双重挑战模式)
*   ⏳ **Classic Mode (经典挑战)**: A rising grid of numbers climbs higher over time. Matching targets triggers gravity, clears blocks, and shifts rows. Don't let the grid hit the top ceiling!
*   ⚡ **Time Attack Mode (限时模式)**: Solve as many math targets as you can before the countdown timer runs out. Ideal for rapid-fire mental math training.

### 4. Persistence & Leaderboards (数据持久化与排行榜)
*   **Firebase Authentication & Firestore**: Log in or register to secure your gaming profile.
*   **Stats Dashboard**: Tracks your personal high scores for each mode, total cleared blocks, total games played, and level history.
*   **Global Leaderboards**: Pit your mental math skills against players worldwide across both Classic and Time Attack modes.

---

## 🎮 How to Play (玩法说明)

1.  **Configure Rule**: Choose your preferred **Math Operation** on the main menu.
2.  **Select Game Mode**: Launch **Classic** or **Time Attack**.
3.  **Construct Formula**: Tap cells in the grid to build a formula. 
    *   *Example Subtraction*: For target `3`, click `9` (Sequence 1) then `6` (Sequence 2) to build `9 - 6 = 3`.
    *   *Example Division*: For target `2`, click `8` (Sequence 1) then `4` (Sequence 2) to build `8 ÷ 4 = 2`.
4.  **Automatic Match**: Once the running formula value exactly matches the target number, the selected blocks disintegrate with satisfying sound effects, and remaining blocks fall down.
5.  **Cleanse Grid**: Keep matching targets to clear rows, gain score, and keep the tiles away from the top edge!

---

## 📂 Technical Directory Structure (项目目录结构)

```bash
├── src
│   ├── components
│   │   ├── GameBoard.tsx    # Core game loop, grid logic, gravity, scoring, and UI
│   │   ├── AuthModal.tsx    # Firebase-backed user registration and login
│   │   └── ...
│   ├── lib
│   │   ├── audio.ts         # High-quality sound effect synthesizer
│   │   ├── firebase.ts      # Cloud database connection and query handlers
│   │   └── translations.ts  # Complete localization assets (EN / ZH)
│   ├── App.tsx              # Application layout & state manager
│   ├── types.ts             # Strict TypeScript definitions
│   └── index.css            # Tailwind directives and display typography imports
├── package.json             # Build system and dependencies configuration
└── metadata.json            # AI Studio applet permissions and description
```

---

## 🛠️ Getting Started & Development (开发者指南)

### Environment Prerequisites
Make sure Node.js (v18+) is installed.

### Setup and Start Local Server
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Launch developer environment**:
    ```bash
    npm run dev
    ```
3.  Open `http://localhost:3000` to preview the game.

### Code Quality & Validation
To lint the project files for errors:
```bash
npm run lint
```

To compile and package the production distribution:
```bash
npm run build
```
