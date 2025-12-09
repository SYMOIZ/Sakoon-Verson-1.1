
import { Memory, Session, JournalEntry, UserSettings, Badge } from '../types';
import { updateUserProfile } from './authService';

// We now prefix keys with the userId to ensure isolation
const getKey = (userId: string, type: 'memories' | 'journal' | 'sessions') => `sakoon_${userId}_${type}`;

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

// --- Sophisticated Context Retrieval Engine ---

const STOP_WORDS = new Set([
  'the', 'and', 'is', 'it', 'to', 'in', 'my', 'i', 'am', 'a', 'of', 'for', 'with', 'that', 'but', 'on', 'at', 'this', 'was', 'have', 'me', 'so', 'be', 'not', 'or', 'an', 'as', 'if', 'by', 'are', 'you', 'can', 'do', 'we'
]);

// Helper: Generate bi-grams (2-word phrases) for better context matching
const getBigrams = (text: string): Set<string> => {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const bigrams = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
        if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i+1])) {
            bigrams.add(`${words[i]} ${words[i+1]}`);
        }
    }
    return bigrams;
};

// Helper: Extract potential proper nouns (simple heuristic: capitalized words not at start of sentence)
const getProperNouns = (text: string): Set<string> => {
    const nouns = new Set<string>();
    const matches = text.matchAll(/(?<!^|\.\s)\b[A-Z][a-z]+\b/g);
    for (const match of matches) {
        nouns.add(match[0].toLowerCase());
    }
    return nouns;
};

const getTokens = (text: string): Set<string> => {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    return new Set(words.filter(w => w.length > 2 && !STOP_WORDS.has(w)));
};

export const retrieveContext = (userId: string, userQuery: string, conversationContext: string = ""): string => {
  const memories = getMemories(userId);
  const journals = getJournals(userId);
  
  const combinedInput = `${userQuery} ${conversationContext}`;
  
  const inputTokens = getTokens(combinedInput);
  const inputBigrams = getBigrams(combinedInput);
  const inputNouns = getProperNouns(combinedInput);

  // --- Process Memories ---
  const scoredMemories = memories.map(mem => {
    let score = 0;
    const memContent = mem.content.toLowerCase();
    const memTokens = getTokens(mem.content);
    const memBigrams = getBigrams(mem.content);

    // 1. Exact Noun Matching (Highest Priority for names/places)
    inputNouns.forEach(noun => {
        if (memContent.includes(noun)) score += 15;
    });

    // 2. Bigram Matching (Contextual Phrases)
    // "New Job" matches "New Job" much stronger than just "Job"
    inputBigrams.forEach(bg => {
        if (memBigrams.has(bg)) score += 8;
    });

    // 3. Keyword Matching
    inputTokens.forEach(token => {
        if (memTokens.has(token)) score += 3;
    });

    // 4. Recency Decay (Linear decay over 30 days)
    const daysOld = (Date.now() - mem.createdAt) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, 10 - (daysOld * 0.3)); // 10 points for today, 0 points after ~30 days
    score += recencyBonus;

    // 5. Core Memory Sticky Bonus
    if (mem.isCore) score += 10;

    return { ...mem, score };
  });

  // --- Process Recent Journals (Last 3 days only) ---
  const recentJournals = journals
    .filter(j => (Date.now() - j.timestamp) < (1000 * 60 * 60 * 24 * 3)) // Last 3 days
    .map(j => ({
        content: `Journal Entry (${new Date(j.timestamp).toLocaleDateString()}): ${j.content} [Mood: ${j.mood}]`,
        score: 5 // Base score for being recent
    }));

  // Sort and Slice
  const topMemories = scoredMemories
    .filter(m => m.score > 5)
    .sort((a,b) => b.score - a.score)
    .slice(0, 5); // Top 5 relevant memories

  const contextParts = [];

  if (topMemories.length > 0) {
      contextParts.push(`[LONG-TERM MEMORY]:\n${topMemories.map(m => `- ${m.content}`).join('\n')}`);
  }

  if (recentJournals.length > 0) {
      contextParts.push(`[RECENT JOURNAL ENTRIES]:\n${recentJournals.map(j => `- ${j.content}`).join('\n')}`);
  }

  return contextParts.join('\n\n');
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
