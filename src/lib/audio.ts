// Sound Engine utilizing Web Audio API for zero-asset procedural retro game sound effects
let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext() {
  if (!audioCtx) {
    // Lazy initialize to bypass browser autoplay policies
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

function playTone(freq: number, type: OscillatorType, duration: number, gainValue = 0.1, delay = 0) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    
    gainNode.gain.setValueAtTime(gainValue, ctx.currentTime + delay);
    // Exponential decay
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

export const soundEffects = {
  playSelect: () => {
    playTone(600, 'sine', 0.1, 0.15);
  },
  playDeselect: () => {
    playTone(450, 'sine', 0.1, 0.15);
  },
  playSuccess: (blocksCount = 3) => {
    // Play a delightful arpeggio based on the number of blocks cleared
    const baseFreq = 523.25; // C5
    const notes = [1, 1.25, 1.5, 2.0]; // Major 3rd, Perfect 5th, Octave
    const type = 'triangle';
    
    for (let i = 0; i < Math.min(blocksCount, 4); i++) {
      const delay = i * 0.08;
      const freq = baseFreq * (notes[i] || 1);
      playTone(freq, type, 0.3, 0.15, delay);
    }
  },
  playCombo: () => {
    // Fast high pitch chirpy arpeggio
    const type = 'sine';
    const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
    notes.forEach((freq, idx) => {
      playTone(freq, type, 0.25, 0.1, idx * 0.05);
    });
  },
  playError: () => {
    // Buzzing warning
    playTone(150, 'sawtooth', 0.2, 0.12);
  },
  playNewRow: () => {
    // Low sweeping noise
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);
      
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('New Row Audio error:', e);
    }
  },
  playGameOver: () => {
    // Descending sad tune
    const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4 (Minor feeling)
    notes.forEach((freq, idx) => {
      playTone(freq, 'sawtooth', 0.5, 0.1, idx * 0.18);
    });
  }
};
