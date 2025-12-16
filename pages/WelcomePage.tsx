
import React, { useState, useEffect } from 'react';
import { UserSettings, Gender, Profession, TonePreference, Language } from '../types';
import { loginUser, registerUser, signInAnonymously, registerTherapist } from '../services/authService';
import { getTeamMembers } from '../services/dataService';
import { TermsPage } from './TermsPage';
import { CHECKIN_POOLS } from '../constants';
import { saveCheckInEvent } from '../services/dataService';

interface WelcomePageProps {
  onComplete: (userSettings: UserSettings) => void;
}

type ViewState = 'landing' | 'login' | 'signup' | 'terms' | 'checkIn' | 'content' | 'therapist-landing' | 'therapist-signup' | 'therapist-pending';

const LANGUAGES: Language[] = ['English', 'Urdu', 'Roman Urdu', 'Sindhi', 'Pashto', 'Siraiki', 'Arabic', 'Spanish'];
const TONES: TonePreference[] = ['Cute', 'Mature', 'Friendly', 'Soft', 'Calm', 'Direct'];

const getRandomQuestion = (pool: string[]) => pool[Math.floor(Math.random() * pool.length)];

// --- CONTENT PAGES DATA ---
const CONTENT_PAGES: Record<string, { title: string, content: string }> = {
    // Therapy Approaches
    '/therapy/types': { title: 'All Therapy Approaches', content: 'Explore our evidence-based therapeutic styles designed to help you navigate your emotions. From structured CBT to mindfulness-based practices, Sukoon offers a variety of ways to heal. We combine modern psychology with accessible AI guidance.' },
    '/therapy/cbt': { title: 'Cognitive Behavioral Therapy (CBT)', content: 'CBT helps you identify unhelpful thoughts and beliefs and replace them with practical, reality-based alternatives. Sukoon offers short exercises and thought logs that you can complete in minutes. Ideal for: stress, anxiety, negative thinking, overthinking.' },
    '/therapy/dbt': { title: 'Dialectical Behavior Therapy (DBT)', content: 'DBT techniques focus on emotion regulation, distress tolerance and interpersonal effectiveness. Sukoon provides step-by-step grounding exercises and crisis-planning templates. Ideal for: emotional ups/downs, anger, impulsivity, conflict.' },
    '/therapy/psychodynamic': { title: 'Psychodynamic Therapy', content: 'This approach explores recurring emotional patterns and early influences. Sukoon gently prompts reflection on patterns that affect present behavior and relationships. Ideal for: long-term patterns, inner conflicts, relationship issues.' },
    '/therapy/gestalt': { title: 'Gestalt Therapy', content: 'Gestalt methods emphasize present-moment awareness and experiential clarity. Sukoon guides short awareness exercises that help you name and process current experience. Ideal for: self-awareness, blocked emotions, confusion.' },
    '/therapy/adlerian': { title: 'Adlerian Therapy', content: 'Adlerian tools help build purpose, social connectedness and confidence. Use Sukoon’s guided reflections to define goals and take small, doable steps toward them. Ideal for: self-esteem, motivation, identity, life direction.' },
    '/therapy/compassion': { title: 'Compassion-Focused Therapy', content: 'Learn to treat yourself with kindness; Sukoon offers self-compassion scripts and exercises to reduce self-criticism. Ideal for: self-criticism, guilt, shame, emotional healing.' },
    '/therapy/mindfulness': { title: 'Mindfulness-Based Support', content: 'Short, practical mindfulness practices for immediate stress relief and improved concentration. Ideal for: anxiety, racing thoughts, burnout, stress.' },
    '/therapy/solution-focused': { title: 'Solution-Focused Brief Support', content: 'When you need quick forward movement, Sukoon helps you generate small, measurable next steps and track progress. Ideal for: quick progress, motivation, short-term goals.' },
    
    // Topics
    '/therapy/topics': { title: 'All Topics', content: 'Sukoon provides support for a wide range of emotional challenges. Whether you are dealing with anxiety, relationship issues, or just daily stress, we are here to listen.' },
    '/topics/depression': { title: 'Depression & Low Mood', content: 'Feeling low, empty, or hopeless can be overwhelming. Sukoon provides simple mood tracking, behavioral activation tasks, and safety guidance to find small steps forward.' },
    '/topics/anxiety': { title: 'Anxiety & Panic', content: 'When worry feels uncontrollable, breathing techniques, grounding, worry scheduling and exposure planning can help calm the mind.' },
    '/topics/stress': { title: 'Stress & Academic Pressure', content: 'Life can get heavy. Learn to manage prioritization frameworks, study routines, and micro-break systems for sustained productivity.' },
    '/topics/self-esteem': { title: 'Self-Esteem & Confidence', content: 'Build a kinder relationship with yourself. We help you challenge inner criticism and use strengths inventories to improve self-talk.' },
    '/topics/trauma': { title: 'Trauma Informed Support', content: 'Healing from the past takes time. We offer grounding and stabilization practices; referrals and escalation guidance if professional care is needed.' },
    '/topics/relationships': { title: 'Relationship Concerns', content: 'Navigating conflict, communication, or breakups? Gain clarity on communication steps, boundary-setting scripts and reflection prompts.' },
    '/topics/academic-pressure': { title: 'Academic Pressure', content: 'Exams, deadlines, and performance anxiety are real. Let’s break down the overwhelm into manageable pieces.' },
    '/topics/identity': { title: 'Identity & Purpose', content: 'Exploring who you are and what matters to you is a journey. We provide structured exploration exercises for values, goals, and next steps.' },
    '/topics/burnout': { title: 'Burnout Recovery', content: 'Exhaustion is a sign to pause. We help you explore rest plans, permission scripts, and recovery pacing.' },

    // Struggles
    '/topics/struggles': { title: 'Everyday Struggles', content: 'You are not alone in what you are facing. From loneliness to procrastination, these challenges are part of the human experience.' },
    '/struggles/loneliness': { title: 'Coping with Loneliness', content: 'Feeling isolated is painful. Sukoon offers guided community events, daily micro-check-ins, and peer support suggestions.' },
    '/struggles/bullying': { title: 'Support for Bullying', content: 'Being targeted hurts deeply. We offer safety planning, assertive communication templates, and escalation guidance.' },
    '/struggles/breakups': { title: 'Healing from Breakups', content: 'Heartbreak is one of life’s toughest challenges. We walk with you through coping steps, rituals for closure, and short journaling prompts.' },
    '/struggles/work-life': { title: 'Work-Life Balance', content: 'Finding equilibrium between career and personal life is key to mental health. Use weekly planning templates and time-boxing tools.' },
    '/struggles/overthinking': { title: 'Calming Overthinking', content: 'When thoughts spiral, it’s hard to find peace. We use worry scheduling and thought-distancing exercises.' },
    '/struggles/procrastination': { title: 'Overcoming Procrastination', content: 'Often rooted in anxiety or perfectionism, putting things off is common. Try our 25-minute focused sprints and immediate rewards.' },
    '/struggles/perfectionism': { title: 'Letting Go of Perfectionism', content: 'The pressure to be flawless is exhausting. We help you embrace "good enough" with exposure to graded tasks and compassionate self-feedback loops.' },
    '/struggles/motivation': { title: 'Finding Motivation', content: 'When the spark is gone, we help you reconnect with micro-goals, habit triggers and progress visualizers.' },

    // University
    '/university-support': { 
        title: 'For University Students', 
        content: 'Sukoon was developed for the rhythm and pressures of university life. We recognize exam cycles, group projects, accommodation moves, and identity exploration as core sources of stress. Features tailored for students include exam-period routines, professor-communication templates, CV and interview confidence scripts, and campus resource directories.\n\nStudents can use Sukoon as an ongoing study companion: check-ins before exams, targeted concentration exercises, and recovery plans after burnout. Sukoon also supports peer communities and campus-specific resources where available.\n\nIf you are part of an institution, Sukoon can be integrated as a campus wellbeing offering with privacy controls and administrative analytics.' 
    },
    
    // Other
    '/about': { title: 'Our Story', content: 'Sukoon was born from a desire to make emotional support accessible, private, and stigma-free. Built by a team of passionate developers and mental health advocates.' },
    '/careers': { title: 'Careers', content: 'Join us in our mission to democratize mental wellness. We are always looking for talented engineers and psychologists.' },
    '/contact': { title: 'Contact Us', content: 'Reach out to support@sukoon.ai for inquiries.' }
};

export const WelcomePage: React.FC<WelcomePageProps> = ({ onComplete }) => {
  const [view, setView] = useState<ViewState>('landing');
  const [contentPath, setContentPath] = useState(''); // For simulated router
  const [isLoading, setIsLoading] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  
  // Login State
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  
  // Registration State
  const [regData, setRegData] = useState({
      name: '', email: '', password: '', confirmPassword: '',
      age: '', region: '', gender: '', profession: '',
      language: 'English' as Language, tone: 'Soft' as TonePreference
  });

  // CAPTCHA State (Simulated for Demo)
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Therapist Registration State
  const [therapistRegData, setTherapistRegData] = useState({
      fullName: '', email: '', phone: '', password: '', yearsExperience: '', specialization: '', licenseNumber: '',
      cvFile: null as File | null, degreeFile: null as File | null
  });

  const [error, setError] = useState('');

  // Check-In State
  const [checkInStep, setCheckInStep] = useState(0);
  const [currentQuestions, setCurrentQuestions] = useState({ q1: '', q2: '', q3: '' });
  const [checkInAnswers, setCheckInAnswers] = useState({ emotion: '', connection: '', factor: '' });

  // Init randomized questions on mount
  useEffect(() => {
      setCurrentQuestions({
          q1: getRandomQuestion(CHECKIN_POOLS.q1),
          q2: getRandomQuestion(CHECKIN_POOLS.q2),
          q3: getRandomQuestion(CHECKIN_POOLS.q3),
      });
  }, []);

  const navigateTo = (path: string) => {
      if (path === '/signup') setView('signup');
      else if (path === '/login') setView('login');
      else if (path === '/chat') setView('checkIn'); // Chat flow starts with checkin
      else if (path === '/terms' || path === '/privacy') setView('terms');
      else if (path === '/therapist') setView('therapist-landing');
      else if (path === '/therapist') setView('therapist-landing');
      else if (CONTENT_PAGES[path]) {
          setContentPath(path);
          setView('content');
      } else {
          // Internal scroll handling for Landing page
          if ((view === 'landing' || view === 'therapist-landing') && path.startsWith('#')) {
             const id = path.substring(1);
             document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
             return;
          }

          console.warn("Route not found:", path);
          // Fallback
          setContentPath('/therapy/types');
          setView('content');
      }
      window.scrollTo(0,0);
  };

  const handleMockFill = (role: 'student' | 'therapist' | 'admin') => {
      if (role === 'student') {
          setLoginData({ email: 'student@sukoon.com', password: 'password123' });
      } else if (role === 'therapist') {
          setLoginData({ email: 'test@sukoon.com', password: '@dmin1218' });
      } else if (role === 'admin') {
          setLoginData({ email: 'admin@sukoon.com', password: '@dmin1218' });
      }
      setError('');
  };

  const handleLogin = async () => {
      setError('');
      setIsLoading(true);
      const email = loginData.email.trim().toLowerCase(); // Normalize email
      const password = loginData.password.trim();

      // 1. Mock Student Bypass
      if (email === 'student@sukoon.com' && password === 'password123') {
          onComplete({
              id: 'student-test',
              email: 'student@sukoon.com',
              name: 'Student User',
              is_anonymous: false,
              age: 21, region: 'University', gender: 'Female', profession: 'Student',
              preferredLanguage: 'English', tonePreference: 'Friendly',
              voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
              therapistStyle: 'cbt', personalityMode: 'introvert',
              darkMode: false, isAdmin: false, role: 'patient', accountStatus: 'active',
              stats: { totalActiveDays: 5, lastActiveDate: new Date().toLocaleDateString('en-CA'), badges: [] }
          });
          setIsLoading(false);
          return;
      }

      // 2. Mock Admin Bypass
      if (email === 'admin@sukoon.com' && password === '@dmin1218') {
          onComplete({
              id: 'admin', email: 'admin@sukoon.com', name: 'Administrator',
              age: 0, region: 'Global', gender: 'Other', profession: 'Other',
              is_anonymous: false,
              preferredLanguage: 'English', tonePreference: 'Direct',
              voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
              therapistStyle: 'gentle', personalityMode: 'introvert',
              darkMode: false, isAdmin: true, stats: { totalActiveDays: 0, lastActiveDate: '', badges: [] }
          });
          setIsLoading(false);
          return;
      }

      // 3. Mock Therapist Bypass (TEST ACCOUNT)
      if (email === 'test@sukoon.com' && password === '@dmin1218') {
          onComplete({
              id: 'th-test-01',
              email: 'test@sukoon.com',
              name: 'Dr. Test Therapist',
              is_anonymous: false,
              age: 35, region: 'Global', gender: 'Other', profession: 'Working Professional',
              preferredLanguage: 'English', tonePreference: 'Calm',
              voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
              therapistStyle: 'gentle', personalityMode: 'introvert',
              darkMode: false, 
              isAdmin: false,
              role: 'therapist', // IMPORTANT: Triggers Therapist Dashboard
              accountStatus: 'active',
              stats: { totalActiveDays: 0, lastActiveDate: '', badges: [] }
          });
          setIsLoading(false);
          return;
      }

      // 4. Check Mock Team Members
      const teamMembers = await getTeamMembers();
      const staffMember = teamMembers.find(m => m.email.toLowerCase() === email);
      
      if (staffMember) {
          if (staffMember.status === 'Suspended') {
              setError("This account has been suspended.");
              setIsLoading(false);
              return;
          }
          
          onComplete({
              id: staffMember.id,
              email: staffMember.email,
              name: staffMember.name,
              is_anonymous: false,
              age: 25, region: 'Staff', gender: 'Other', profession: 'Team Member',
              preferredLanguage: 'English', tonePreference: 'Direct',
              voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
              therapistStyle: 'gentle', personalityMode: 'introvert',
              darkMode: false, 
              isAdmin: true, // Grants access to Admin Dashboard
              role: 'staff', 
              accountStatus: 'active',
              stats: { totalActiveDays: 0, lastActiveDate: '', badges: [] }
          });
          setIsLoading(false);
          return;
      }

      // 5. Supabase Login
      try {
          const result = await loginUser(email, password);
          setIsLoading(false);
          
          if (result.user) {
              if (result.user.accountStatus === 'pending' || (result.user.role === 'therapist' && result.user.accountStatus !== 'active')) {
                 // Redirect pending therapists to pending view
                 setApplicationId('RETURNING-USER');
                 setView('therapist-pending');
              } else {
                 onComplete(result.user);
              }
          } else {
              setError(result.error || "Incorrect email or password. Try the Demo accounts below.");
          }
      } catch (e) {
          setIsLoading(false);
          setError("Connection error. Please use Demo Accounts.");
      }
  };

  const handleSignup = async () => {
      setError('');
      if (!regData.name || !regData.email || !regData.password || !regData.age || !regData.region) { setError("Please fill in all fields."); return; }
      if (!regData.gender) { setError("Please select a gender."); return; }
      if (!regData.profession) { setError("Please select a profession."); return; }
      if (regData.password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (regData.password !== regData.confirmPassword) { setError("Passwords do not match."); return; }
      
      if (!captchaVerified) {
          setError("Please verify you are human.");
          return;
      }

      const ageNum = parseInt(regData.age);
      if (isNaN(ageNum) || ageNum < 13) {
          setError("You must be at least 13 years old to sign up.");
          return;
      }
      
      setIsLoading(true);
      // In a real app, this token comes from the hCaptcha/reCAPTCHA callback
      const dummyToken = "mock_captcha_token_123"; 
      
      const result = await registerUser({ 
          ...regData, 
          age: ageNum, 
          gender: regData.gender as any, 
          profession: regData.profession as any,
          captchaToken: dummyToken
      });
      setIsLoading(false);
      
      if (result.error) {
          setError(result.error);
      } else if (result.user) {
          onComplete(result.user);
      }
  };

  const handleTherapistSignup = async () => {
      setError('');
      if (!therapistRegData.fullName || !therapistRegData.email || !therapistRegData.phone || !therapistRegData.password || !therapistRegData.yearsExperience) {
          setError("Please fill in all required fields."); return;
      }
      if (!therapistRegData.specialization) { setError("Please select a specialization."); return; }
      if (!therapistRegData.cvFile) { setError("Please upload your CV."); return; }
      if (!therapistRegData.degreeFile) { setError("Please upload your Degree/Transcript."); return; }
      if (therapistRegData.password.length < 6) { setError("Password must be at least 6 characters."); return; }

      setIsLoading(true);
      // Pass the new fields to the registration service (Mocked for now in UI)
      const result = await registerTherapist({
          fullName: therapistRegData.fullName,
          email: therapistRegData.email,
          phone: therapistRegData.phone,
          password: therapistRegData.password,
          yearsExperience: parseInt(therapistRegData.yearsExperience),
          specialization: therapistRegData.specialization,
          licenseNumber: therapistRegData.licenseNumber,
          cvFile: therapistRegData.cvFile,
          degreeFile: therapistRegData.degreeFile
      });
      setIsLoading(false);

      if (result.error) {
          setError(result.error);
      } else if (result.user && result.applicationId) {
          setApplicationId(result.applicationId);
          setView('therapist-pending');
      }
  };

  // 0. TERMS VIEW
  if (view === 'terms') {
      return (
          <div className="h-screen flex flex-col">
              <div className="p-4 bg-white dark:bg-navy-900 shadow-sm flex justify-between items-center sticky top-0 z-10">
                  <h2 className="font-bold text-lg">Terms & Conditions</h2>
                  <button onClick={() => setView('landing')} className="text-teal-600 font-bold hover:underline">Back to Home</button>
              </div>
              <div className="flex-1 overflow-y-auto bg-beige-50 dark:bg-navy-900"><TermsPage /></div>
          </div>
      );
  }

  // 0.1 CONTENT VIEW (Simulated Pages)
  if (view === 'content') {
      const page = CONTENT_PAGES[contentPath] || { title: 'Page', content: 'Content not found.' };
      return (
          <div className="min-h-screen bg-beige-50 p-6 md:p-12">
               <div className="max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-lg animate-fade-in">
                   <button onClick={() => setView('landing')} className="text-teal-600 font-bold hover:underline mb-8">← Back to Home</button>
                   <h1 className="text-4xl font-bold text-slate-800 mb-6">{page.title}</h1>
                   <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">{page.content}</p>
                   {contentPath.startsWith('/therapy/') && (
                       <button onClick={() => setView('checkIn')} className="mt-10 px-8 py-3 bg-teal-500 text-white rounded-full font-bold shadow-lg hover:bg-teal-600">Try This Approach</button>
                   )}
               </div>
          </div>
      );
  }

  // 0.5 CHECK-IN FLOW
  if (view === 'checkIn') {
      const handleAnswer = (key: keyof typeof checkInAnswers, value: string) => {
          setCheckInAnswers(prev => ({ ...prev, [key]: value }));
          // Save analytics
          saveCheckInEvent({
              event: 'checkin_answer',
              questionId: key === 'emotion' ? 'q1' : key === 'connection' ? 'q2' : 'q3',
              response: value,
              timestamp: Date.now()
          });
          setTimeout(() => setCheckInStep(prev => prev + 1), 400); 
      };

      const handleGuestLogin = async () => {
          setIsLoading(true);
          const guestUser = await signInAnonymously();
          setIsLoading(false);
          if (guestUser) {
              onComplete(guestUser);
          } else {
              alert("Could not start a guest session. Please try again later.");
          }
      };

      return (
          <div className="min-h-screen bg-beige-50 flex items-center justify-center p-6">
              <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-xl transition-all duration-500">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mb-8 overflow-hidden">
                      <div className="h-full bg-teal-400 transition-all duration-500" style={{ width: `${((checkInStep + 1) / 4) * 100}%` }} />
                  </div>

                  {checkInStep === 0 && (
                      <div className="animate-fade-in">
                          <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentQuestions.q1}</h2>
                          <div className="space-y-3 mt-6">
                              {['Happy', 'Calm', 'Excited', 'Sad', 'Stressed', 'Dull', 'Foggy'].sort(() => Math.random() - 0.5).map(opt => (
                                  <button key={opt} onClick={() => handleAnswer('emotion', opt)} className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-lavender-50 hover:border-lavender-200 hover:text-lavender-700 text-left font-medium transition-all">{opt}</button>
                              ))}
                          </div>
                      </div>
                  )}

                  {checkInStep === 1 && (
                      <div className="animate-fade-in">
                          <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentQuestions.q2}</h2>
                          <div className="space-y-3 mt-6">
                              {['Connected', 'Engaged', 'Neutral', 'Disconnected', 'Low Energy'].sort(() => Math.random() - 0.5).map(opt => (
                                  <button key={opt} onClick={() => handleAnswer('connection', opt)} className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 text-left font-medium transition-all">{opt}</button>
                              ))}
                          </div>
                      </div>
                  )}

                  {checkInStep === 2 && (
                      <div className="animate-fade-in">
                          <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentQuestions.q3}</h2>
                          <div className="space-y-3 mt-6">
                              {['Academics', 'Work', 'Family', 'Friends', 'Thoughts', 'Health', 'Something else'].sort(() => Math.random() - 0.5).map(opt => (
                                  <button key={opt} onClick={() => handleAnswer('factor', opt)} className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-left font-medium transition-all">{opt}</button>
                              ))}
                          </div>
                      </div>
                  )}

                  {checkInStep === 3 && (
                      <div className="animate-fade-in text-center">
                          <div className="w-16 h-16 bg-lavender-100 text-lavender-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🌿</div>
                          <h2 className="text-2xl font-bold text-slate-800 mb-4">Thank you for sharing.</h2>
                          <p className="text-slate-600 mb-8 leading-relaxed max-w-md mx-auto">
                              From what you shared, your day leaned toward <span className="font-bold text-teal-600">{checkInAnswers.emotion}</span> with hints of <span className="font-bold text-teal-600">{checkInAnswers.connection}</span>, mostly influenced by <span className="font-bold text-teal-600">{checkInAnswers.factor}</span>. It’s completely okay — days like this happen.
                          </p>
                          <div className="space-y-4">
                              <button onClick={() => setView('signup')} className="w-full py-4 bg-lavender-500 text-white rounded-xl font-bold hover:bg-lavender-600 transition-colors shadow-lg shadow-lavender-200">Sign Up & Continue With Me</button>
                              <button onClick={handleGuestLogin} disabled={isLoading} className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-70">{isLoading ? 'Starting...' : 'Continue as Guest'}</button>
                          </div>
                      </div>
                  )}
                  {checkInStep < 3 && <button onClick={() => setView('landing')} className="mt-8 text-sm text-slate-400 hover:text-slate-600">Skip Check-in</button>}
              </div>
          </div>
      );
  }

  // THERAPIST LANDING PAGE
  if (view === 'therapist-landing') {
      return (
        <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden text-slate-900">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">S</div>
                        <span className="font-bold text-xl text-slate-900">Sukoon <span className="text-teal-600 text-sm font-medium uppercase tracking-wider ml-1">For Therapists</span></span>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setView('login')} className="px-5 py-2 font-bold text-slate-600 hover:text-slate-900">Log In</button>
                        <button onClick={() => setView('therapist-signup')} className="px-6 py-2 bg-teal-600 text-white rounded-full font-bold hover:bg-teal-700 transition-colors shadow-lg">Join as Therapist</button>
                    </div>
                </div>
            </nav>

            <header className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
                <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 tracking-tight">
                    Grow your practice <br/> with <span className="text-teal-600">digital care.</span>
                </h1>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
                    Join the future of mental health. Sukoon connects you with students and young adults seeking professional guidance, allowing you to manage appointments and reach more people effortlessly.
                </p>
            </header>

            <section className="py-20 px-6 bg-white">
                <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
                    <div className="p-8 bg-slate-50 rounded-3xl">
                        <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center text-2xl mb-6">📅</div>
                        <h3 className="text-xl font-bold mb-3">Flexible Scheduling</h3>
                        <p className="text-slate-600">Set your own hours. Manage your availability and sync your calendar directly within the platform.</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-3xl">
                        <div className="w-12 h-12 bg-lavender-100 text-lavender-600 rounded-xl flex items-center justify-center text-2xl mb-6">📈</div>
                        <h3 className="text-xl font-bold mb-3">Consistent Earnings</h3>
                        <p className="text-slate-600">Expand your client base with steady referrals. Transparent payment structures with no hidden fees.</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-3xl">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-2xl mb-6">🔒</div>
                        <h3 className="text-xl font-bold mb-3">Secure & Private</h3>
                        <p className="text-slate-600">We prioritize data privacy and security for both you and your patients, compliant with health standards.</p>
                    </div>
                </div>
            </section>
            
            <section className="py-20 px-6 text-center">
                <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
                     <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to make an impact?</h2>
                     <p className="text-slate-300 text-lg mb-10 max-w-xl mx-auto">Start your application today. Our team reviews all applications within 48 hours.</p>
                     <button onClick={() => setView('therapist-signup')} className="px-10 py-4 bg-teal-500 text-white text-lg font-bold rounded-full hover:bg-teal-400 transition-colors shadow-xl hover:scale-105 transform duration-200">Start Application</button>
                </div>
            </section>

             <footer className="bg-white py-10 border-t border-slate-200 text-center text-slate-500 text-sm">
                <p>© {new Date().getFullYear()} Sukoon AI. Therapist Partner Program.</p>
            </footer>
        </div>
      );
  }

  // THERAPIST SIGNUP FORM
  if (view === 'therapist-signup') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 py-20" id="join-form">
            <div className="w-full max-w-2xl bg-white p-10 rounded-[2rem] shadow-xl border border-slate-200">
                <button onClick={() => setView('therapist-landing')} className="text-sm font-bold text-slate-400 hover:text-slate-600 mb-6">← Back</button>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Therapist Application</h2>
                <p className="text-slate-500 mb-8">Please provide your professional details for verification.</p>
                
                {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-medium">{error}</div>}

                <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" value={therapistRegData.fullName} onChange={e => setTherapistRegData({...therapistRegData, fullName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Years of Experience</label>
                            <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" value={therapistRegData.yearsExperience} onChange={e => setTherapistRegData({...therapistRegData, yearsExperience: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                            <input type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" value={therapistRegData.email} onChange={e => setTherapistRegData({...therapistRegData, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone Number</label>
                            <input type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" value={therapistRegData.phone} onChange={e => setTherapistRegData({...therapistRegData, phone: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Specialization</label>
                            <select 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                                value={therapistRegData.specialization}
                                onChange={e => setTherapistRegData({...therapistRegData, specialization: e.target.value})}
                            >
                                <option value="" disabled>Select...</option>
                                <option>Anxiety & Stress</option>
                                <option>Career Counseling</option>
                                <option>Depression</option>
                                <option>Family Therapy</option>
                                <option>Trauma</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">License / Reg Number</label>
                            <input type="text" placeholder="Optional" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500" value={therapistRegData.licenseNumber} onChange={e => setTherapistRegData({...therapistRegData, licenseNumber: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
                        <input type="password" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" value={therapistRegData.password} onChange={e => setTherapistRegData({...therapistRegData, password: e.target.value})} />
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Upload CV / Resume (PDF)</label>
                        <input type="file" accept=".pdf,.doc,.docx" onChange={e => setTherapistRegData({...therapistRegData, cvFile: e.target.files?.[0] || null})} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Upload Degree / Transcript</label>
                        <input type="file" accept=".pdf,.jpg,.png" onChange={e => setTherapistRegData({...therapistRegData, degreeFile: e.target.files?.[0] || null})} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                    </div>

                    <button onClick={handleTherapistSignup} disabled={isLoading} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-70">
                        {isLoading ? 'Submitting Application...' : 'Submit Application'}
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // 1. LANDING VIEW - CLONED AESTHETIC (Abby.gg Style)
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#FDFCF8] font-sans overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>
        {/* Navbar */}
        <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('landing')}>
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">S</div>
                    <span className="font-bold text-2xl text-slate-900 tracking-tight">Sukoon</span>
                </div>
                <div className="hidden lg:flex gap-8 text-sm font-medium text-slate-600">
                    <button onClick={() => navigateTo('#features')} className="hover:text-slate-900 transition-colors">Features</button>
                    <button onClick={() => navigateTo('/therapy/types')} className="hover:text-slate-900 transition-colors">Approaches</button>
                    <button onClick={() => navigateTo('/university-support')} className="hover:text-slate-900 transition-colors">Students</button>
                    <button onClick={() => setView('therapist-landing')} className="text-teal-600 font-bold hover:underline">For Therapists</button>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setView('login')} className="px-5 py-2.5 text-slate-900 font-bold hover:bg-slate-50 rounded-full transition-colors">Log In</button>
                    <button onClick={() => setView('checkIn')} className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 shadow-lg hover:-translate-y-0.5 transition-all">Get Started</button>
                </div>
            </div>
        </nav>

        {/* Hero Section */}
        <header className="pt-32 pb-20 px-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-lavender-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 -z-10"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-50/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 -z-10"></div>
            
            <div className="max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm mb-8 animate-fade-in">
                    <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">24/7 AI Therapist Companion</span>
                </div>
                <h1 className="text-6xl lg:text-8xl font-bold text-slate-900 mb-8 tracking-tight leading-[1.1] max-w-5xl mx-auto">
                    Therapy that fits <br className="hidden md:block"/> in your <span className="text-transparent bg-clip-text bg-gradient-to-r from-lavender-500 to-teal-500">pocket.</span>
                </h1>
                <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                    Sukoon is your private, intelligent, and empathetic companion. 
                    Navigate stress, anxiety, and university life with a friend who never judges and never sleeps.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button onClick={() => setView('checkIn')} className="h-14 px-8 bg-slate-900 text-white text-lg font-bold rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-2">
                        Start Chatting Free
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </button>
                    <button onClick={() => navigateTo('#features')} className="h-14 px-8 bg-white text-slate-900 text-lg font-bold rounded-full shadow-md hover:shadow-lg border border-slate-100 hover:bg-slate-50 transition-all">
                        Learn More
                    </button>
                </div>
            </div>
        </header>

        {/* Bento Grid Features */}
        <section id="features" className="py-20 px-6 max-w-7xl mx-auto scroll-mt-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Everything you need to find calm</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                {/* Large Card */}
                <div className="md:col-span-2 bg-[#F5F4FF] rounded-[2rem] p-10 relative overflow-hidden group border border-slate-100/50 hover:shadow-lg transition-all">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Cognitive Behavioral Therapy (CBT)</h3>
                        <p className="text-slate-600 max-w-md">Structured exercises to help you identify and reframe negative thought patterns in minutes.</p>
                        <button onClick={() => navigateTo('/therapy/cbt')} className="mt-6 px-6 py-2 bg-white text-slate-900 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all">Try CBT Mode</button>
                    </div>
                    <div className="absolute right-0 bottom-0 w-64 h-64 bg-lavender-300/30 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                </div>

                {/* Tall Card */}
                <div className="row-span-2 bg-[#F0FDFA] rounded-[2rem] p-10 relative overflow-hidden group border border-slate-100/50 hover:shadow-lg transition-all">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">24/7 Availability</h3>
                        <p className="text-slate-600 mb-8">Panic attack at 3 AM? Stress before an 8 AM exam? Sukoon is always awake.</p>
                        <div className="space-y-3">
                            {['Always Private', 'Encrypted', 'Anonymous', 'No Judgment'].map(item => (
                                <div key={item} className="flex items-center gap-3 text-teal-800 font-medium">
                                    <div className="w-6 h-6 rounded-full bg-teal-200 flex items-center justify-center text-teal-700">✓</div>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Medium Card */}
                <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm hover:shadow-lg transition-all relative overflow-hidden">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Check-in Daily</h3>
                    <p className="text-slate-600">Track your mood trends over time and build emotional resilience.</p>
                    <div className="mt-6 flex gap-2">
                        {['😊','😔','😰','😐'].map(emoji => (
                            <div key={emoji} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-xl shadow-sm">{emoji}</div>
                        ))}
                    </div>
                </div>

                {/* Medium Card */}
                <div className="bg-[#FFFBEB] rounded-[2rem] p-10 border border-slate-100/50 hover:shadow-lg transition-all relative overflow-hidden">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">For Students</h3>
                    <p className="text-slate-600">Tailored for academic pressure, identity, and social anxiety.</p>
                    <button onClick={() => navigateTo('/university-support')} className="mt-6 text-amber-700 font-bold hover:underline">Learn more →</button>
                </div>
            </div>
        </section>

        {/* Topics Marquee / List */}
        <section className="py-20 bg-slate-900 text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Support for every feeling</h2>
                <p className="text-slate-400">Whatever you're going through, we've got a module for it.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
                {['Anxiety', 'Depression', 'Loneliness', 'Breakups', 'Academic Stress', 'Burnout', 'Procrastination', 'Identity', 'Family Conflict', 'Sleep', 'Self-Esteem', 'Motivation'].map(topic => (
                    <span key={topic} onClick={() => navigateTo(`/topics/${topic.toLowerCase().replace(' ', '-')}`)} className="px-6 py-3 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all cursor-pointer text-sm font-bold">
                        {topic}
                    </span>
                ))}
            </div>
        </section>

        {/* Footer */}
        <footer className="bg-white pt-20 pb-10 border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
                <div className="col-span-2 lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">S</div>
                        <span className="font-bold text-xl text-slate-900">Sukoon</span>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mb-6">
                        Your safe space for emotional support and mindful healing. Created by students, for students.
                    </p>
                </div>
                
                <div>
                    <h4 className="font-bold text-slate-900 mb-4">Therapy</h4>
                    <ul className="space-y-3 text-sm text-slate-500">
                        <li><button onClick={() => navigateTo('/therapy/cbt')} className="hover:text-teal-600">CBT</button></li>
                        <li><button onClick={() => navigateTo('/therapy/dbt')} className="hover:text-teal-600">DBT</button></li>
                        <li><button onClick={() => navigateTo('/therapy/mindfulness')} className="hover:text-teal-600">Mindfulness</button></li>
                        <li><button onClick={() => navigateTo('/therapy/types')} className="hover:text-teal-600">All Approaches</button></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-slate-900 mb-4">Account</h4>
                    <ul className="space-y-3 text-sm text-slate-500">
                        <li><button onClick={() => setView('login')} className="hover:text-teal-600">Log In</button></li>
                        <li><button onClick={() => setView('signup')} className="hover:text-teal-600">Sign Up</button></li>
                        <li><button onClick={() => setView('therapist-landing')} className="hover:text-teal-600">For Therapists</button></li>
                        <li><button onClick={() => setView('login')} className="hover:text-teal-600">Admin Login</button></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
                    <ul className="space-y-3 text-sm text-slate-500">
                        <li><button onClick={() => navigateTo('/terms')} className="hover:text-teal-600">Terms of Service</button></li>
                        <li><button onClick={() => navigateTo('/privacy')} className="hover:text-teal-600">Privacy Policy</button></li>
                        <li><button onClick={() => window.open('/credits', '_blank')} className="hover:text-teal-600">Credits</button></li>
                    </ul>
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-6 border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
                <p>© {new Date().getFullYear()} Sukoon AI. Not a medical service.</p>
                <p>© {new Date().getFullYear()} Sukoon — Built by students.</p>
            </div>
        </footer>
      </div>
    );
  }

  // 2. LOGIN & 3. SIGNUP Views
  if (view === 'login') {
      return (
        <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white p-10 rounded-[2rem] shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">S</div>
                    <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
                    <p className="text-slate-500">Login to your safe space.</p>
                </div>
                {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-xl text-center border border-rose-100">{error}</div>}
                
                {/* --- QUICK LOGIN BUTTONS --- */}
                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="font-bold text-xs uppercase text-slate-400 mb-3 text-center">Tap to Quick Login (Demo)</p>
                    <div className="space-y-2">
                        <button onClick={() => { handleMockFill('student'); }} className="w-full py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 hover:border-slate-300 transition-all flex justify-between px-4">
                            <span>Student Account</span>
                            <span className="text-teal-600">student@sukoon.com</span>
                        </button>
                        <button onClick={() => { handleMockFill('therapist'); }} className="w-full py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 hover:border-slate-300 transition-all flex justify-between px-4">
                            <span>Therapist Account</span>
                            <span className="text-indigo-600">test@sukoon.com</span>
                        </button>
                        <button onClick={() => { handleMockFill('admin'); }} className="w-full py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 hover:border-slate-300 transition-all flex justify-between px-4">
                            <span>Admin Panel</span>
                            <span className="text-rose-600">admin@sukoon.com</span>
                        </button>
                    </div>
                </div>
                {/* --------------------------- */}

                <div className="space-y-4">
                    <input type="email" placeholder="Email" className="w-full p-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
                    <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
                </div>
                <button onClick={handleLogin} disabled={isLoading} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-70">{isLoading ? 'Logging in...' : 'Log In'}</button>
                <div className="mt-6 text-center text-sm">
                    <p className="text-slate-500">No account? <button onClick={() => setView('signup')} className="text-teal-600 font-bold hover:underline">Create One</button></p>
                    <button onClick={() => setView('landing')} className="mt-4 text-slate-400 hover:text-slate-600">Back to Home</button>
                </div>
            </div>
        </div>
      );
  }

  if (view === 'signup') {
      return (
        <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6 py-12">
            <div className="w-full max-w-2xl bg-white p-10 rounded-[2rem] shadow-xl border border-slate-100">
                <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Create your account</h2>
                <p className="text-slate-500 mb-8 text-center">Begin your healing journey. Your space is always private.</p>
                {error && <div className="mb-6 p-3 bg-rose-50 text-rose-600 text-sm rounded-xl text-center">{error}</div>}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1 space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Personal Details</label>
                        <input type="text" placeholder="Full Name" className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                         <input type="email" placeholder="Email" className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} />
                         <input type="password" placeholder="Password" className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} />
                        <input type="password" placeholder="Confirm Password" className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900" value={regData.confirmPassword} onChange={e => setRegData({...regData, confirmPassword: e.target.value})} />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Personalization</label>
                        <div className="flex gap-2">
                            <input type="number" placeholder="Age" className="w-1/3 p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900" value={regData.age} onChange={e => setRegData({...regData, age: e.target.value})} />
                            <input type="text" placeholder="Region" className="w-2/3 p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900" value={regData.region} onChange={e => setRegData({...regData, region: e.target.value})} />
                        </div>
                        <select className="w-full p-3 bg-slate-50 rounded-xl outline-none text-slate-700" value={regData.gender} onChange={e => setRegData({...regData, gender: e.target.value})}>
                            <option value="" disabled>Please select Gender</option>
                            <option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option><option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        <select className="w-full p-3 bg-slate-50 rounded-xl outline-none text-slate-700" value={regData.profession} onChange={e => setRegData({...regData, profession: e.target.value})}>
                            <option value="" disabled>Please select Profession</option>
                            <option value="Student">Student</option><option value="Working Professional">Working Professional</option><option value="Both">Both</option><option value="Other">Other</option>
                        </select>
                         <select className="w-full p-3 bg-slate-50 rounded-xl outline-none text-slate-700" value={regData.language} onChange={e => setRegData({...regData, language: e.target.value as Language})}>
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <select className="w-full p-3 bg-slate-50 rounded-xl outline-none text-slate-700" value={regData.tone} onChange={e => setRegData({...regData, tone: e.target.value as TonePreference})}>
                            {TONES.map(t => <option key={t} value={t}>{t} Tone</option>)}
                        </select>
                    </div>
                </div>

                {/* CAPTCHA Widget (Simulation) */}
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="captcha" 
                            className="w-6 h-6 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            checked={captchaVerified}
                            onChange={(e) => setCaptchaVerified(e.target.checked)}
                        />
                        <label htmlFor="captcha" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                            I am human (Security Check)
                        </label>
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                        <div>Protected by Supabase</div>
                        <div className="font-bold">Turnstile / hCaptcha</div>
                    </div>
                </div>

                <button onClick={handleSignup} disabled={isLoading} className="w-full mt-6 py-4 bg-teal-400 text-white rounded-xl font-bold hover:bg-teal-500 transition-all shadow-lg hover:shadow-xl disabled:opacity-70">{isLoading ? 'Creating Account...' : 'Create Account'}</button>
                <div className="mt-6 text-center text-sm">
                    <p className="text-slate-500">Already have an account? <button onClick={() => setView('login')} className="text-teal-600 font-bold hover:underline">Log In</button></p>
                    <button onClick={() => setView('landing')} className="mt-4 text-slate-400 hover:text-slate-600">Back to Home</button>
                </div>
            </div>
        </div>
      );
  }
  return null;
};
