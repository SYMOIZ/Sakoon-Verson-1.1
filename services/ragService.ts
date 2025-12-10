import { Memory, Session, JournalEntry, UserSettings, Badge } from '../types';
import { updateUserProfile } from './authService';

// We now prefix keys with the userId to ensure isolation
const getKey = (userId: string, type: 'memories' | 'journal' | 'sessions') => `sukoon_${userId}_${type}`;

// --- Memories ---
export const getMemories = (userId: string): Memory[] => {
  const stored = localStorage.getItem(getKey(userId, 'memories'));
  return stored ? JSON.parse(stored) : [];
};

export const saveMemories = (userId: string, memories: Memory[]) => {
  localStorage.setItem(getKey(userId, 'memories'), JSON.stringify(memories));
};

export const addMemory = (userId: string, content: string, isCore: boolean = false): Memory => {
  const memories = getMemories(userId);
  const newMemory: Memory = {
    id: crypto.randomUUID(),
    content,
    tags: [],
    createdAt: Date.now(),
    isCore,
  };
  memories.push(newMemory);
  saveMemories(userId, memories);
  return newMemory;
};

export const deleteMemory = (userId: string, id: string) => {
  const memories = getMemories(userId);
  const filtered = memories.filter(m => m.id !== id);
  saveMemories(userId, filtered);
};

// --- Sophisticated Context Retrieval ---

const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '');
const STOP_WORDS = new Set(['the', 'and', 'is', 'it', 'to', 'in', 'my', 'i', 'am', 'a', 'of', 'for', 'with', 'that', 'but', 'on', 'at', 'this', 'was', 'have', 'me', 'so', 'be', 'not', 'or', 'an', 'as', 'if', 'by', 'are', 'you']);

const getTokens = (text: string): Set<string> => {
    const words = normalizeText(text).split(/\s+/);
    return new Set(words.filter(w => w.length > 2 && !STOP_WORDS.has(w)));
};

export const retrieveContext = (userId: string, userQuery: string, conversationContext: string = ""): string => {
  const memories = getMemories(userId);
  if (memories.length === 0) return "";

  const queryTokens = getTokens(userQuery);
  const contextTokens = getTokens(conversationContext);

  const scoredMemories = memories.map(mem => {
    let score = 0;
    const memContentNormalized = normalizeText(mem.content);
    const memTokens = getTokens(mem.content);

    // 1. Exact Query Token Matches (High Weight)
    // Matches what the user is explicitly asking/talking about right now
    queryTokens.forEach(token => {
        if (memTokens.has(token)) score += 10;
        else if (memContentNormalized.includes(token)) score += 4; // Partial match bonus
    });

    // 2. Context History Matches (Medium Weight)
    // Matches topics discussed in the last few turns (resolves implicit refs)
    contextTokens.forEach(token => {
        if (memTokens.has(token)) score += 3;
    });

    // 3. Recency Scoring (0 to 5 points)
    // Prioritize memories from the last 7 days, decay linearly
    const daysOld = (Date.now() - mem.createdAt) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 5 - daysOld);
    score += recencyScore;

    // 4. Core Memory Boost (Sticky)
    // Important facts (names, traumas, major events) get a permanent boost
    if (mem.isCore) score += 6;

    return { ...mem, score };
  });

  // Filter: Keep memories that have at least some relevance (score > 5)
  // This threshold ensures we don't return random memories just because they are 'Core' if they are totally irrelevant.
  // (A Core memory with 0 keyword matches would have score ~6-11 depending on recency. 
  // A relevant recent non-core memory would be 10+5 = 15).
  
  const relevant = scoredMemories
    .filter(m => m.score >= 5) 
    .sort((a,b) => b.score - a.score)
    .slice(0, 6); // Keep top 6 most relevant

  if (relevant.length === 0) return "";

  return `
[RECALLED MEMORIES - Prioritize these details if relevant]:
${relevant.map(m => `- ${m.content}`).join('\n')}
`;
};

// --- Sessions ---
export const getSessions = (userId: string): Session[] => {
  const stored = localStorage.getItem(getKey(userId, 'sessions'));
  return stored ? JSON.parse(stored) : [];
};

export const saveSession = (userId: string, session: Session) => {
  const sessions = getSessions(userId);
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(getKey(userId, 'sessions'), JSON.stringify(sessions));
};

export const deleteSession = (userId: string, sessionId: string) => {
  const sessions = getSessions(userId);
  const filtered = sessions.filter(s => s.id !== sessionId);
  localStorage.setItem(getKey(userId, 'sessions'), JSON.stringify(filtered));
};

// --- Journals ---
export const getJournals = (userId: string): JournalEntry[] => {
    const stored = localStorage.getItem(getKey(userId, 'journal'));
    return stored ? JSON.parse(stored) : [];
}

export const saveJournals = (userId: string, entries: JournalEntry[]) => {
    localStorage.setItem(getKey(userId, 'journal'), JSON.stringify(entries));
}

// --- Deletion Logic ---
export const deleteTodayData = (userId: string) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  // Filter Memories
  const mems = getMemories(userId).filter(m => m.createdAt < startOfDay);
  saveMemories(userId, mems);

  // Filter Journals
  const journals = getJournals(userId).filter(j => j.timestamp < startOfDay);
  saveJournals(userId, journals);

  // Filter Sessions
  const sessions = getSessions(userId).filter(s => s.startTime < startOfDay);
  localStorage.setItem(getKey(userId, 'sessions'), JSON.stringify(sessions));
};

export const deleteAllData = (userId: string) => {
  localStorage.removeItem(getKey(userId, 'memories'));
  localStorage.removeItem(getKey(userId, 'journal'));
  localStorage.removeItem(getKey(userId, 'sessions'));
};

export const deleteDateData = (userId: string, dateStr: string) => {
  // dateStr is YYYY-MM-DD
  const targetDate = new Date(dateStr);
  const start = targetDate.setHours(0,0,0,0);
  const end = targetDate.setHours(23,59,59,999);

  const filterFn = (ts: number) => ts < start || ts > end;

  saveMemories(userId, getMemories(userId).filter(m => filterFn(m.createdAt)));
  
  const journals = getJournals(userId);
  saveJournals(userId, journals.filter(j => filterFn(j.timestamp)));

  const sessions = getSessions(userId);
  localStorage.setItem(getKey(userId, 'sessions'), JSON.stringify(sessions.filter(s => filterFn(s.startTime))));
};


// --- Streaks & Badges ---
export const trackUserActivity = (user: UserSettings): { updatedUser: UserSettings, newBadge?: Badge } => {
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    const stats = { ...user.stats };

    // If already active today, do nothing
    if (stats.lastActiveDate === todayStr) {
        return { updatedUser: user };
    }

    // Increment days
    stats.lastActiveDate = todayStr;
    stats.totalActiveDays += 1;

    // Check for new badges
    let newBadge: Badge | undefined;
    const updatedBadges = stats.badges.map(b => {
        if (!b.unlockedAt && stats.totalActiveDays >= b.requiredDays) {
            const unlocked = { ...b, unlockedAt: Date.now() };
            if (!newBadge) newBadge = unlocked; // Only notify one at a time usually
            return unlocked;
        }
        return b;
    });
    
    stats.badges = updatedBadges;

    const updatedUser = { ...user, stats };
    updateUserProfile(updatedUser);
    
    return { updatedUser, newBadge };
};