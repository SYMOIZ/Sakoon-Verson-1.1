
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageRole, Mood, Session, UserSettings, SessionRating, Badge, BugReport, UserFeedback, Gender, Profession } from '../types';
import { ChatMessage } from '../components/ChatMessage';
import { EmergencyOverlay } from '../components/EmergencyOverlay';
import { SessionRatingModal } from '../components/SessionRatingModal';
import { FeedbackModal } from '../components/FeedbackModal';
import { checkForCrisis, generateTherapistResponse, generateSpeech, transcribeAudio } from '../services/geminiService';
import { trackUserActivity } from '../services/ragService';
import { saveRating, saveBugReport, saveUserFeedback, triggerRiskAlert, checkPendingInterventions, scanForPII, suspendUser } from '../services/dataService';
import { chatPersistenceService } from '../services/chatPersistenceService';
import { MOODS } from '../constants';

interface ChatPageProps {
  settings: UserSettings;
  onUpdateUser: (u: UserSettings) => void;
  onSignUp: () => void;
}

const GUEST_LIMIT = 10;
const RISK_KEYWORDS_HIGH = ["kill myself", "suicide", "end it all", "want to die", "cutting myself", "hurt myself", "take my own life"];

export const ChatPage: React.FC<ChatPageProps> = ({ settings, onUpdateUser, onSignUp }) => {
  const [sessionId, setSessionId] = useState<string>('');
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

  // Disqualification State
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [disqualificationReason, setDisqualificationReason] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // Guest Logic
  const isGuest = settings.is_anonymous;
  const userMessageCount = messages.filter(m => m.role === MessageRole.USER).length;
  const isLimitReached = !!isGuest && userMessageCount >= GUEST_LIMIT;

  // --- 1. INITIALIZATION & HISTORY RESTORE ---
  useEffect(() => {
    const initSession = async () => {
        if (hasInitialized.current) return;
        
        // A. Check Disqualification
        if (settings.accountStatus === 'suspended') {
            setIsDisqualified(true);
            setDisqualificationReason(settings.suspensionReason || "Account Suspended");
            return;
        }

        // B. Recover or Create Session
        let activeSessionId = sessionId;
        
        if (!settings.isAdmin && !isGuest) {
            const lastSession = await chatPersistenceService.getLastActiveSession(settings.id);
            if (lastSession) {
                // Restore Found Session
                activeSessionId = lastSession.id;
                setSessionId(activeSessionId);
                const history = await chatPersistenceService.getChatHistory(activeSessionId);
                setMessages(history);
                if (history.length > 0) hasInitialized.current = true;
            } else {
                // Create New Session
                activeSessionId = await chatPersistenceService.createSession(settings.id);
                setSessionId(activeSessionId);
            }
        } else {
            // Guest/Admin (Ephemeral Session)
            if(!activeSessionId) {
                activeSessionId = crypto.randomUUID();
                setSessionId(activeSessionId);
            }
        }

        // C. Welcome Message (Only if chat is empty)
        if (messages.length === 0 && !hasInitialized.current) {
            let welcomeText = "";
            if (settings.isAdmin) {
                welcomeText = "Admin System Online. Business Analytics Mode Active.";
            } else {
                welcomeText = `Hello, ${settings.name}. I'm Sukoon. I'm here to listen. How are you feeling right now?`;
            }
            const welcomeMsg: Message = { id: crypto.randomUUID(), role: MessageRole.MODEL, text: welcomeText, timestamp: Date.now() };
            setMessages([welcomeMsg]);
            
            // Persist welcome message if not admin/guest
            if (!settings.isAdmin && !isGuest) {
                chatPersistenceService.saveMessage(settings.id, activeSessionId, welcomeMsg);
            }
        }
        
        hasInitialized.current = true;
    };

    initSession();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.log("Location denied")
        );
    }
  }, [settings.id, settings.name, settings.isAdmin, settings.accountStatus]);

  // Poll for Interventions
  useEffect(() => {
      if (settings.isAdmin || isDisqualified) return;
      const interval = setInterval(() => {
          const interventions = checkPendingInterventions(settings.id);
          if (interventions.length > 0) {
              setMessages(prev => [...prev, ...interventions]);
          }
      }, 3000);
      return () => clearInterval(interval);
  }, [settings.id, settings.isAdmin, isDisqualified]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
    if (isLimitReached) return; 
    if (isDisqualified) return;

    // --- ZERO TOLERANCE PII CHECK ---
    const piiCheck = scanForPII(inputText);
    if (piiCheck.detected && !settings.isAdmin) {
        const reason = `Zero-Tolerance Violation: Attempted to share ${piiCheck.type} (${piiCheck.match})`;
        await suspendUser(settings.id, reason);
        triggerRiskAlert({ type: 'Policy Violation', message: `User attempted to share contact info: "${inputText}"`, userId: settings.id, userName: settings.name, triggerKeyword: piiCheck.match, id: '', studentId: settings.id, studentName: settings.name, detectedAt: Date.now(), status: 'Active' });
        setIsDisqualified(true);
        setDisqualificationReason("Attempting to share personal contact details (Phone/ID) outside the secure channel.");
        return; 
    }

    // --- SAFETY INTERVENTION CHECK ---
    const lowerInput = inputText.toLowerCase();
    const matchedKeyword = RISK_KEYWORDS_HIGH.find(k => lowerInput.includes(k));
    
    if (matchedKeyword) {
        triggerRiskAlert({ type: 'High Risk', message: `User triggered safety protocol. Input: "${inputText}"`, triggerKeyword: matchedKeyword, userId: settings.id, userName: settings.name, id: '', studentId: settings.id, studentName: settings.name, detectedAt: Date.now(), status: 'Active' });
        setInputText('');
        setIsCrisis(true); 
        return; 
    }

    // Update Activity Streak
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

    // 1. Optimistic UI Update (User Message)
    const userMsg: Message = { id: crypto.randomUUID(), role: MessageRole.USER, text: inputText, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // 2. Persist User Message (Async)
    if (!safeMode && !settings.isAdmin && !isGuest && sessionId) {
        chatPersistenceService.saveMessage(settings.id, sessionId, userMsg);
    }

    // Crisis Check on Input
    if (checkForCrisis(userMsg.text)) {
      setIsCrisis(true);
      setIsTyping(false);
      return;
    }

    // 3. Generate AI Response (RAG happens inside `generateTherapistResponse` via `retrieveContext`)
    const history = messages.slice(-10).map(m => ({ role: m.role, text: m.text }));
    
    const response = await generateTherapistResponse(
        settings.id, history, userMsg.text,
        {
            name: settings.name, age: settings.age, gender: settings.gender as Gender, profession: settings.profession as Profession,
            language: settings.preferredLanguage, tone: settings.tonePreference, isAdmin: settings.isAdmin
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

    // 4. Optimistic UI Update (AI Message)
    const botMsg: Message = {
      id: crypto.randomUUID(), role: MessageRole.MODEL, text: response.text,
      timestamp: Date.now(), audioBase64: audioData, groundingLinks: response.groundingLinks
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);

    // 5. Persist AI Message (Async)
    if (!safeMode && !settings.isAdmin && !isGuest && sessionId) {
        chatPersistenceService.saveMessage(settings.id, sessionId, botMsg);
    }

    if (settings.autoPlayAudio && audioData) playAudio(audioData);
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
      await saveBugReport({ ...report, id: crypto.randomUUID(), timestamp: Date.now(), status: 'new' }, settings.is_anonymous);
      alert("Report submitted. Thank you for helping us improve.");
  }

  const handleSubmitFeedback = async (feedback: Omit<UserFeedback, 'id' | 'timestamp'>) => {
      await saveUserFeedback({ ...feedback, id: crypto.randomUUID(), timestamp: Date.now() }, settings.is_anonymous);
      alert("Feedback received. We appreciate your thoughts!");
  }

  // --- DISQUALIFIED VIEW ---
  if (isDisqualified) {
      return (
          <div className="fixed inset-0 z-[100] bg-rose-900 flex items-center justify-center p-6 text-center animate-fade-in">
              <div className="bg-white max-w-lg w-full p-10 rounded-3xl shadow-2xl">
                  <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  </div>
                  <h1 className="text-3xl font-bold text-rose-600 mb-4">Account Deactivated</h1>
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-4 text-left mb-6">
                      <p className="font-bold text-rose-900 text-sm uppercase mb-1">Violation Detected:</p>
                      <p className="text-rose-800 text-sm leading-relaxed">
                          "You have been disqualified from the Sukoon Platform for violating our Zero-Tolerance Policy."
                      </p>
                  </div>
                  <p className="text-slate-600 mb-8 leading-relaxed">
                      <strong>Reason:</strong> {disqualificationReason}<br/><br/>
                      This action has been reported to the Administrator. If you believe this is a mistake, contact <span className="font-mono bg-slate-100 px-1 rounded">support@sukoon.com</span>.
                  </p>
                  <button onClick={onSignUp} className="w-full py-4 border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                      Return to Home
                  </button>
              </div>
          </div>
      );
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
              <button onClick={onSignUp} className="px-4 py-2 bg-teal-500 rounded-lg text-xs font-bold hover:bg-teal-600 transition-colors">Sign Up Now</button>
          </div>
      )}

      {/* Main Chat Controls */}
      {!settings.isAdmin && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
             <button onClick={toggleSafeMode} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${safeMode ? 'bg-slate-800 text-white' : 'bg-white/80 backdrop-blur text-slate-600 border border-slate-100 hover:bg-slate-50'}`}>
                {safeMode ? "Exit Tarash Zone" : "Enter Tarash Zone"}
            </button>
            <div className="flex rounded-lg bg-white/80 backdrop-blur border border-slate-100 p-0.5 shadow-sm">
                <button onClick={() => { setFeedbackMode('bug'); setShowFeedbackModal(true); }} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800">Report</button>
                <div className="w-px bg-slate-200 mx-1"></div>
                <button onClick={() => { setFeedbackMode('feedback'); setShowFeedbackModal(true); }} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800">Feedback</button>
            </div>
             <button onClick={() => setIsCrisis(true)} className="px-3 py-1.5 bg-rose-100 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-200 transition-colors shadow-sm">Emergency</button>
             <button onClick={handleEndSession} className="px-3 py-1.5 bg-white/80 backdrop-blur text-slate-600 border border-slate-100 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">End</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 md:px-20 py-6 scrollbar-hide pt-16">
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
