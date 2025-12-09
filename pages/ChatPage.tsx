import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageRole, Mood, Session, UserSettings, SessionRating, Badge, BugReport, UserFeedback } from '../types';
import { ChatMessage } from '../components/ChatMessage';
import { EmergencyOverlay } from '../components/EmergencyOverlay';
import { SessionRatingModal } from '../components/SessionRatingModal';
import { FeedbackModal } from '../components/FeedbackModal';
import { checkForCrisis, generateTherapistResponse, generateSpeech, transcribeAudio } from '../services/geminiService';
import { addMemory, saveSession, trackUserActivity } from '../services/ragService';
import { saveRating, saveBugReport, saveUserFeedback, detectPII, createSafetyCase } from '../services/dataService';
import { MOODS } from '../constants';

interface ChatPageProps {
  settings: UserSettings;
  onUpdateUser: (u: UserSettings) => void;
}

const GUEST_LIMIT = 10;

export const ChatPage: React.FC<ChatPageProps> = ({ settings, onUpdateUser }) => {
  const [sessionId, setSessionId] = useState(crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionMood, setSessionMood] = useState<Mood | undefined>(undefined);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  
  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<'bug' | 'feedback'>('feedback');
  
  // Safe Mode (Tarash Zone)
  const [safeMode, setSafeMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasInitialized = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guest Logic
  const isGuest = settings.id.startsWith('guest-');
  const userMessageCount = messages.filter(m => m.role === MessageRole.USER).length;
  const isLimitReached = isGuest && userMessageCount >= GUEST_LIMIT;

  useEffect(() => {
    if (!hasInitialized.current) {
        let welcomeText = "";
        if (settings.isAdmin) {
            welcomeText = "Admin System Online. Business Analytics Mode Active.";
        } else {
            // Soft, personalized welcome
            welcomeText = `Hello, ${settings.name}. I'm Sakoon. I'm here to listen and support you in a safe, private space. How are you feeling today?`;
            
            // Gender preference handling (simulation)
            if (settings.preferredTherapistGender !== 'No Preference') {
               // In a real app, this would route to a specific model persona. 
               // For now, we just acknowledge it gently in the system prompt context later.
            }
        }
        setMessages([{ id: 'welcome', role: MessageRole.MODEL, text: welcomeText, timestamp: Date.now() }]);
        hasInitialized.current = true;
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.log("Location denied")
        );
    }
  }, [settings.name, settings.isAdmin]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
      if (messages.length > 1 && !safeMode && !settings.isAdmin) {
          const session: Session = {
              id: sessionId,
              startTime: messages[0].timestamp,
              endTime: Date.now(),
              messages: messages,
              moodStart: sessionMood,
          };
          saveSession(settings.id, session);
      }
  }, [messages, sessionMood, sessionId, settings.id, safeMode]);

  const toggleSafeMode = () => {
      const newState = !safeMode;
      setSafeMode(newState);
      if (newState) {
           setMessages(prev => [...prev, {
               id: crypto.randomUUID(), role: MessageRole.MODEL, timestamp: Date.now(),
               text: "This is the Tarash Zone. Nothing written here will be saved or used for analysis. You may express yourself freely."
           }]);
      }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsTyping(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              const text = await transcribeAudio(base64, file.type);
              setInputText(prev => (prev ? prev + ' ' : '') + text);
              setIsTyping(false);
          };
          reader.readAsDataURL(file);
      }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    if (isLimitReached) return; // Prevent send if limit reached

    // --- PII DETECTION ---
    const piiResult = detectPII(inputText);
    const finalUserText = piiResult.found ? piiResult.redactedText : inputText;
    
    if (piiResult.found && !safeMode && !settings.isAdmin) {
        // Log safety case quietly
        createSafetyCase(settings.id, 'PII_EXPOSURE', `User shared potential ${piiResult.type} information.`);
    }

    if (!safeMode) {
        const { updatedUser, newBadge: earnedBadge } = trackUserActivity(settings);
        if (updatedUser.stats.totalActiveDays !== settings.stats.totalActiveDays) {
            onUpdateUser(updatedUser);
        }
        if (earnedBadge) {
            setNewBadge(earnedBadge);
            setTimeout(() => setNewBadge(null), 5000);
        }
    }

    const userMsg: Message = { 
        id: crypto.randomUUID(), 
        role: MessageRole.USER, 
        text: finalUserText, 
        timestamp: Date.now(),
        isRedacted: piiResult.found 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    
    if (piiResult.found && !safeMode && !settings.isAdmin) {
        // System Warning
        const warningMsg: Message = {
            id: crypto.randomUUID(),
            role: MessageRole.SYSTEM,
            text: "We noticed you shared potentially sensitive information. For your safety, we have hidden it. If you want a therapist or admin to view it to provide specific support, please give explicit consent.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, warningMsg]);
        // We still let the AI reply to the context, but based on redacted text
    }

    setIsTyping(true);

    if (checkForCrisis(userMsg.text)) {
      setIsCrisis(true);
      setIsTyping(false);
      return;
    }

    const history = messages.slice(-10).map(m => ({ role: m.role, text: m.text }));
    
    const response = await generateTherapistResponse(
        settings.id, history, userMsg.text,
        {
            name: settings.name, age: settings.age, gender: settings.gender, profession: settings.profession,
            language: settings.preferredLanguage, tone: settings.tonePreference, 
            aiResponseStyle: settings.aiResponseStyle, // Pass new style
            isAdmin: settings.isAdmin
        },
        location, settings.therapistStyle, settings.personalityMode,
        settings.memoryEnabled && !safeMode
    );
    
    if (checkForCrisis(response.text)) {
        setIsCrisis(true);
        setIsTyping(false);
        return;
    }

    let audioData: string | undefined;
    if ((settings.voiceEnabled || settings.autoPlayAudio) && !settings.isAdmin) {
        audioData = await generateSpeech(response.text);
    }

    const botMsg: Message = {
      id: crypto.randomUUID(), role: MessageRole.MODEL, text: response.text,
      timestamp: Date.now(), audioBase64: audioData, groundingLinks: response.groundingLinks
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);

    if (settings.autoPlayAudio && audioData) playAudio(audioData);
    if (settings.memoryEnabled && !safeMode && !settings.isAdmin && userMsg.text.length > 60) {
        addMemory(settings.id, userMsg.text); 
    }
  };

  const playAudio = async (base64: string) => {
    try {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const ctx = audioContextRef.current;
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (e) { console.error("Audio error", e); }
  };

  const handleEndSession = () => setShowRating(true);
  const handleRatingSubmit = (rating: SessionRating) => { saveRating(rating); setShowRating(false); alert("Thank you for your feedback."); };

  const handleSubmitBug = async (report: Omit<BugReport, 'id' | 'timestamp' | 'status'>) => {
      await saveBugReport({ ...report, id: crypto.randomUUID(), timestamp: Date.now(), status: 'new' });
      alert("Report submitted. Thank you for helping us improve.");
  }

  const handleSubmitFeedback = async (feedback: Omit<UserFeedback, 'id' | 'timestamp'>) => {
      await saveUserFeedback({ ...feedback, id: crypto.randomUUID(), timestamp: Date.now() });
      alert("Feedback received. We appreciate your thoughts!");
  }

  return (
    <div className="flex flex-col h-full relative font-sans">
      {isCrisis && <EmergencyOverlay onClose={() => setIsCrisis(false)} />}
      {showRating && <SessionRatingModal sessionId={sessionId} onSubmit={handleRatingSubmit} onClose={() => setShowRating(false)} />}
      {showFeedbackModal && (
          <FeedbackModal 
            mode={feedbackMode}
            userId={settings.id}
            sessionId={sessionId}
            contextLogs={messages.slice(-5)}
            onClose={() => setShowFeedbackModal(false)}
            onSubmitBug={handleSubmitBug}
            onSubmitFeedback={handleSubmitFeedback}
          />
      )}
      
      {newBadge && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
              <div className="bg-gradient-to-r from-amber-200 to-yellow-400 text-slate-900 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-yellow-300">
                  <span className="text-2xl">{newBadge.icon}</span>
                  <div><div className="font-bold text-sm">Badge Unlocked!</div><div className="text-xs font-medium">{newBadge.label}</div></div>
              </div>
          </div>
      )}

      {/* Guest Limit Overlay */}
      {isLimitReached && (
          <div className="absolute bottom-20 left-4 right-4 md:left-20 md:right-20 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-20 animate-fade-in flex justify-between items-center">
              <div>
                  <div className="font-bold text-sm mb-1">Guest Preview Ended</div>
                  <div className="text-xs text-slate-400">You've reached the message limit. Create a free account to continue.</div>
              </div>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-teal-500 rounded-lg text-xs font-bold hover:bg-teal-600 transition-colors">Sign Up Now</button>
          </div>
      )}

      <header className="bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border-b border-lavender-100 dark:border-navy-800 px-6 py-4 flex items-center justify-between z-10 sticky top-0">
        <div>
           <h1 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">Current Session {safeMode && <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">Tarash Zone</span>}</h1>
           <p className="text-xs text-slate-400 dark:text-slate-500">{settings.isAdmin ? 'Admin Mode' : 'Professional Support'}</p>
        </div>
        <div className="flex gap-2">
             {!settings.isAdmin && (
                 <>
                    <button onClick={toggleSafeMode} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${safeMode ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'}`}>
                        {safeMode ? "Exit Tarash Zone" : "Enter Tarash Zone"}
                    </button>
                    <div className="flex rounded-lg bg-slate-100 dark:bg-navy-800 p-0.5">
                        <button onClick={() => { setFeedbackMode('bug'); setShowFeedbackModal(true); }} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800">Report</button>
                        <div className="w-px bg-slate-200 dark:bg-navy-700 mx-1"></div>
                        <button onClick={() => { setFeedbackMode('feedback'); setShowFeedbackModal(true); }} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800">Feedback</button>
                    </div>
                 </>
             )}
             <button onClick={() => setIsCrisis(true)} className="px-3 py-1.5 bg-rose-100 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-200 transition-colors">Emergency</button>
             <button onClick={handleEndSession} className="px-3 py-1.5 bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">End</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-20 py-6 scrollbar-hide">
        {!sessionMood && messages.length < 3 && !settings.isAdmin && (
            <div className="mb-8 flex flex-col items-center animate-fade-in">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">How are you feeling?</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {MOODS.map(m => (
                        <button key={m.id} onClick={() => setSessionMood(m.id as Mood)} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-navy-800 rounded-2xl shadow-sm hover:scale-110 transition-transform">
                            <span className="text-2xl">{m.emoji}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}
        {messages.map(msg => <ChatMessage key={msg.id} message={msg} onPlayAudio={playAudio} />)}
        {isTyping && <div className="flex items-center gap-2 text-lavender-400 text-xs ml-4 mb-6"><span className="w-2 h-2 bg-lavender-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-lavender-400 rounded-full animate-bounce delay-75"></span><span className="w-2 h-2 bg-lavender-400 rounded-full animate-bounce delay-150"></span></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-navy-900 border-t border-lavender-100 dark:border-navy-800">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <div className="flex-1 bg-slate-50 dark:bg-navy-950 rounded-3xl px-6 py-4 shadow-inner focus-within:ring-2 focus-within:ring-lavender-400 transition-all flex items-center gap-2">
            {/* Progress Bar for Guest */}
            {isGuest && (
                <div className="absolute bottom-full left-0 w-full px-6 pb-2">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mb-1">
                        <span>Guest Preview</span>
                        <span>{userMessageCount}/{GUEST_LIMIT} msgs</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1">
                        <div className={`h-full rounded-full transition-all ${isLimitReached ? 'bg-rose-500' : 'bg-teal-500'}`} style={{ width: `${(userMessageCount / GUEST_LIMIT) * 100}%` }}></div>
                    </div>
                </div>
            )}
            
            <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleAudioUpload}/>
            <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-teal-600 transition-colors" title="Upload Audio"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
            <textarea 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} 
                placeholder={isLimitReached ? "Preview limit reached." : "Type thoughtfully..."} 
                className="w-full bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400 h-6 max-h-32" 
                rows={1} 
                disabled={isLimitReached}
            />
          </div>
          <button onClick={handleSendMessage} disabled={!inputText.trim() || isTyping || isLimitReached} className={`p-4 rounded-full transition-all shadow-lg ${!inputText.trim() || isLimitReached ? 'bg-slate-200 dark:bg-navy-800 text-slate-400' : 'bg-lavender-500 text-white hover:bg-lavender-600 hover:scale-105'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg></button>
        </div>
      </div>
    </div>
  );
};