
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  isCrisisResponse?: boolean;
  audioBase64?: string;
  groundingLinks?: string[];
  image?: string; 
  videoUri?: string;
}

export interface Memory {
  id: string;
  content: string;
  tags: string[];
  createdAt: number;
  isCore: boolean;
}

// Simplified Moods per Professional requirements
export type Mood = 'happy' | 'calm' | 'neutral' | 'sad' | 'anxious' | 'frustrated';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: Mood;
  timestamp: number;
}

export interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  messages: Message[];
  moodStart?: Mood;
  moodEnd?: Mood;
  summary?: string;
  ratingId?: string;
}

export type TherapistStyle = 'gentle' | 'cbt' | 'mindfulness';
export type PersonalityMode = 'introvert' | 'extrovert';

// New Personalization Types
export type Gender = 'Male' | 'Female' | 'Other';
export type Profession = 'Working Professional' | 'Student' | 'Both' | 'Other';
export type TonePreference = 'Cute' | 'Mature' | 'Friendly' | 'Soft' | 'Calm' | 'Direct';
export type Language = 'English' | 'Urdu' | 'Roman Urdu' | 'Sindhi' | 'Pashto' | 'Siraiki' | 'Arabic' | 'Spanish';
export type Religion = 'Hindu' | 'Muslim' | 'Christian' | 'Other';

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  requiredDays: number;
}

export interface UserStats {
  totalActiveDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  badges: Badge[];
}

export interface UserSettings {
  id: string;
  email: string;
  name: string;
  is_anonymous?: boolean;
  
  // Expanded Profile
  age: number;
  region: string;
  gender: Gender;
  religion: Religion;
  profession: Profession;
  preferredLanguage: Language;
  
  voiceEnabled: boolean;
  autoPlayAudio: boolean;
  memoryEnabled: boolean;
  deepMode?: boolean; 
  
  therapistStyle: TherapistStyle;
  personalityMode: PersonalityMode;
  tonePreference: TonePreference;
  
  darkMode: boolean;
  isAdmin?: boolean; 
  stats: UserStats;
}

export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
}

export interface Therapist {
  id: string;
  name: string;
  specialty: string;
  location: string;
  languages: string[];
  experience: number;
  bio: string;
  imageUrl?: string;
  bookingUrl: string;
  availableSlots: { day: string, time: string, duration: string }[];
}

export interface SessionRating {
  id: string;
  sessionId: string;
  rating: number; // 1-5
  remark?: string;
  timestamp: number;
}

// --- Admin Types ---

export interface AdminStats {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeekly: number;
  activeUsersMonthly: number;
  totalSessions: number;
  avgSessionDuration: number; // minutes
  moodDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
  professionDistribution: Record<string, number>;
  toneDistribution: Record<string, number>;
  regionDistribution: Record<string, number>;
  userGrowth: { date: string, count: number }[];
}

export interface AdminAlert {
  id: string;
  type: 'High Risk' | 'Pattern' | 'Security';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  userId: string;
  timestamp: number;
  status: 'active' | 'resolved';
}

export interface AdminReport {
  id: string;
  title: string;
  type: 'growth' | 'mood' | 'session' | 'demographics';
  dateGenerated: string;
  downloadUrl: string;
}

export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  region: string;
  age: number;
  gender: Gender;
  profession: Profession;
  language: Language;
  lastActive: number;
  sessionCount: number;
  status: 'active' | 'suspended';
}

// --- New Features Types ---

export interface TherapyNote {
  id: string;
  userId: string;
  therapistId: string; // or 'admin'
  dateOfNote: string; // YYYY-MM-DD
  title: string;
  details: string;
  markType: 'Progress' | 'Warning' | 'Emotional Drop' | 'Improvement' | 'Needs Follow-up';
  nextReminder?: string; // YYYY-MM-DD
  createdAt: number;
}

export interface BugReport {
  id: string;
  userId: string;
  sessionId: string;
  issueType: 'Technical Issue' | 'Wrong Response' | 'Slow Response' | 'UI/Design Problem' | 'Other';
  description: string;
  capturedContext: Message[]; // Last 5 messages for debugging
  deviceInfo: string;
  browser: string;
  appVersion: string;
  status: 'new' | 'in_review' | 'resolved';
  resolutionNote?: string;
  timestamp: number;
}

export interface UserFeedback {
  id: string;
  userId: string;
  feedbackType: 'Positive' | 'Neutral' | 'Negative';
  category: 'User Experience' | 'Design/UI' | 'Features' | 'Accuracy' | 'Overall';
  note: string;
  timestamp: number;
}

export interface CheckInEvent {
  event: 'checkin_answer';
  questionId: string;
  response: string;
  timestamp: number;
}