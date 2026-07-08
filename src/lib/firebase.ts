import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { GameMode, LeaderboardEntry, UserProfile, GameHistoryItem } from '../types';

// Config copied from firebase-applet-config.json
const firebaseConfig = {
  projectId: "caramel-boulder-m40ks",
  appId: "1:691678842026:web:9b4b12ff6373f98ad414d3",
  apiKey: "AIzaSyDOFlfOYKH__OzhTxgq2Yxw2Sdh7yRjda0",
  authDomain: "caramel-boulder-m40ks.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-6a04a545-a003-4770-a60b-3ef1022c3540",
  storageBucket: "caramel-boulder-m40ks.firebasestorage.app",
  messagingSenderId: "691678842026"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const LEADERBOARD_COLLECTION = 'leaderboard';
const USERS_COLLECTION = 'users';

/**
 * Submits a new score to the global leaderboard.
 */
export async function submitScore(name: string, score: number, mode: GameMode, level: number): Promise<void> {
  try {
    const colRef = collection(db, LEADERBOARD_COLLECTION);
    await addDoc(colRef, {
      name,
      score,
      mode,
      level,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to submit score to Firebase, falling back to local simulation:', error);
    // Simulate locally
    const localScores = JSON.parse(localStorage.getItem('local_leaderboard') || '[]');
    localScores.push({
      id: Math.random().toString(36).substr(2, 9),
      name,
      score,
      mode,
      level,
      date: new Date().toLocaleDateString()
    });
    localStorage.setItem('local_leaderboard', JSON.stringify(localScores));
  }
}

/**
 * Retrieves the top 10 high scores for a given game mode.
 */
export async function getLeaderboard(mode: GameMode): Promise<LeaderboardEntry[]> {
  try {
    const colRef = collection(db, LEADERBOARD_COLLECTION);
    const q = query(
      colRef,
      where('mode', '==', mode),
      orderBy('score', 'desc'),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let dateString = new Date().toLocaleDateString();
      if (data.timestamp) {
        const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        dateString = dateObj.toLocaleDateString();
      }
      entries.push({
        id: doc.id,
        name: data.name || 'Anonymous',
        score: Number(data.score) || 0,
        mode: data.mode as GameMode,
        level: Number(data.level) || 1,
        date: dateString
      });
    });

    return entries.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.warn('Failed to fetch from Firebase, returning local fallback scores:', error);
    const localScores: any[] = JSON.parse(localStorage.getItem('local_leaderboard') || '[]');
    const filtered = localScores
      .filter(s => s.mode === mode)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
      
    if (filtered.length === 0) {
      return [
        { id: '1', name: 'Alonzo Church', score: 1250, mode, level: 8, date: '2026/07/01' },
        { id: '2', name: 'Alan Turing', score: 980, mode, level: 6, date: '2026/07/03' },
        { id: '3', name: 'Ada Lovelace', score: 850, mode, level: 5, date: '2026/07/05' },
        { id: '4', name: 'Grace Hopper', score: 620, mode, level: 4, date: '2026/07/07' }
      ];
    }
    return filtered;
  }
}

/**
 * Creates default local stats for guests.
 */
export function getLocalGuestProfile(defaultName = 'Guest Solver'): UserProfile {
  const local = localStorage.getItem('sumblocks_guest_profile');
  if (local) {
    try {
      return JSON.parse(local) as UserProfile;
    } catch {
      // fallback
    }
  }

  const profile: UserProfile = {
    uid: 'guest',
    username: defaultName,
    email: 'guest@sumblocks.local',
    createdAt: new Date().toLocaleDateString(),
    classicHighScore: 0,
    timeHighScore: 0,
    totalGamesPlayed: 0,
    totalClearedBlocks: 0,
    maxLevelReached: 1,
    recentHistory: []
  };
  localStorage.setItem('sumblocks_guest_profile', JSON.stringify(profile));
  return profile;
}

/**
 * Retrieves a detailed user profile from Firestore or falls back to local.
 */
export async function getUserProfile(uid: string, defaultName = 'New Player'): Promise<UserProfile> {
  if (uid === 'guest') {
    return getLocalGuestProfile(defaultName);
  }

  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    } else {
      // Initialize detailed stats in firestore
      const newProfile: UserProfile = {
        uid,
        username: defaultName,
        email: auth.currentUser?.email || '',
        createdAt: new Date().toLocaleDateString(),
        classicHighScore: 0,
        timeHighScore: 0,
        totalGamesPlayed: 0,
        totalClearedBlocks: 0,
        maxLevelReached: 1,
        recentHistory: []
      };
      await setDoc(docRef, newProfile);
      return newProfile;
    }
  } catch (error) {
    console.error('Failed to fetch profile, using local fallback:', error);
    return getLocalGuestProfile(defaultName);
  }
}

/**
 * Updates user profile stats after completing a game run.
 */
export async function recordGameResult(
  uid: string,
  mode: GameMode,
  score: number,
  level: number,
  cleared: number
): Promise<UserProfile> {
  const dateStr = new Date().toLocaleDateString();
  const newItem: GameHistoryItem = {
    id: Math.random().toString(36).substr(2, 9),
    mode,
    score,
    level,
    cleared,
    date: dateStr
  };

  if (uid === 'guest') {
    const current = getLocalGuestProfile();
    const nextClassicBest = mode === 'classic' ? Math.max(current.classicHighScore, score) : current.classicHighScore;
    const nextTimeBest = mode === 'time' ? Math.max(current.timeHighScore, score) : current.timeHighScore;
    
    const updated: UserProfile = {
      ...current,
      classicHighScore: nextClassicBest,
      timeHighScore: nextTimeBest,
      totalGamesPlayed: current.totalGamesPlayed + 1,
      totalClearedBlocks: current.totalClearedBlocks + cleared,
      maxLevelReached: Math.max(current.maxLevelReached, level),
      recentHistory: [newItem, ...current.recentHistory].slice(0, 5)
    };
    
    localStorage.setItem('sumblocks_guest_profile', JSON.stringify(updated));
    return updated;
  }

  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    let currentProfile: UserProfile;

    if (docSnap.exists()) {
      currentProfile = docSnap.data() as UserProfile;
    } else {
      currentProfile = {
        uid,
        username: auth.currentUser?.displayName || 'Cloud Player',
        email: auth.currentUser?.email || '',
        createdAt: new Date().toLocaleDateString(),
        classicHighScore: 0,
        timeHighScore: 0,
        totalGamesPlayed: 0,
        totalClearedBlocks: 0,
        maxLevelReached: 1,
        recentHistory: []
      };
    }

    const nextClassicBest = mode === 'classic' ? Math.max(currentProfile.classicHighScore, score) : currentProfile.classicHighScore;
    const nextTimeBest = mode === 'time' ? Math.max(currentProfile.timeHighScore, score) : currentProfile.timeHighScore;

    const updated: UserProfile = {
      ...currentProfile,
      classicHighScore: nextClassicBest,
      timeHighScore: nextTimeBest,
      totalGamesPlayed: currentProfile.totalGamesPlayed + 1,
      totalClearedBlocks: currentProfile.totalClearedBlocks + cleared,
      maxLevelReached: Math.max(currentProfile.maxLevelReached, level),
      recentHistory: [newItem, ...currentProfile.recentHistory].slice(0, 5)
    };

    await setDoc(docRef, updated, { merge: true });
    return updated;
  } catch (error) {
    console.error('Failed to update stats on Firestore:', error);
    // fallback to updating guest state in local
    return getLocalGuestProfile();
  }
}

/**
 * Updates player profile name.
 */
export async function updateProfileName(uid: string, nextName: string): Promise<void> {
  if (uid === 'guest') {
    const current = getLocalGuestProfile();
    const updated = { ...current, username: nextName };
    localStorage.setItem('sumblocks_guest_profile', JSON.stringify(updated));
    return;
  }

  try {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: nextName });
    }
    const docRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(docRef, { username: nextName });
  } catch (error) {
    console.error('Failed to update name on Cloud Firestore:', error);
  }
}
