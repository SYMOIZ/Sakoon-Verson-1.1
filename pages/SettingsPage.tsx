
import React, { useState, useEffect } from 'react';
import { UserSettings, TherapistStyle, PersonalityMode, Gender, Profession, TonePreference, Language } from '../types';
import { deleteTodayData, deleteAllData, deleteDateData } from '../services/ragService';
import { checkConnection } from '../services/dataService';

interface SettingsPageProps {
  settings: UserSettings;
  onUpdateSettings: (s: UserSettings) => void;
}

const LANGUAGES: Language[] = ['English', 'Urdu', 'Roman Urdu', 'Sindhi', 'Pashto', 'Siraiki', 'Arabic', 'Spanish'];
const TONES: TonePreference[] = ['Cute', 'Mature', 'Friendly', 'Soft', 'Calm', 'Direct'];

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onUpdateSettings }) => {
  const [deleteDate, setDeleteDate] = useState('');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    checkConnection().then(res => setDbStatus(res.status));
  }, []);

  const handleDeleteDate = () => {
    if(deleteDate) {
        deleteDateData(settings.id, deleteDate);
        alert(`Data from ${deleteDate} cleared.`);
        setDeleteDate('');
    }
  }

  return (
    <div className="p-6 md:p-12 overflow-y-auto h-full max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-sans font-bold text-slate-800 dark:text-white">Settings</h1>
        <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-navy-800 rounded-full border border-slate-200 dark:border-navy-700 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-teal-500 animate-pulse' : dbStatus === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {dbStatus === 'connected' ? 'System Online' : dbStatus === 'error' ? 'DB Error' : 'Checking...'}
            </span>
        </div>
      </div>
      
      <div className="space-y-6">
        
        {/* User Profile */}
        <section className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-100 dark:border-navy-700 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">My Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-slate-500 font-bold uppercase">Language</label>
                    <select 
                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-navy-900 rounded-lg text-slate-800 dark:text-white outline-none"
                        value={settings.preferredLanguage}
                        onChange={e => onUpdateSettings({...settings, preferredLanguage: e.target.value as Language})}
                    >
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-500 font-bold uppercase">Tone Preference</label>
                     <select 
                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-navy-900 rounded-lg text-slate-800 dark:text-white outline-none"
                        value={settings.tonePreference}
                        onChange={e => onUpdateSettings({...settings, tonePreference: e.target.value as TonePreference})}
                    >
                        {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="text-xs text-slate-500 font-bold uppercase">Gender</label>
                    <select 
                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-navy-900 rounded-lg text-slate-800 dark:text-white outline-none"
                        value={settings.gender}
                        onChange={e => onUpdateSettings({...settings, gender: e.target.value as Gender})}
                    >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                </div>
                 <div>
                    <label className="text-xs text-slate-500 font-bold uppercase">Profession</label>
                    <select 
                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-navy-900 rounded-lg text-slate-800 dark:text-white outline-none"
                        value={settings.profession}
                        onChange={e => onUpdateSettings({...settings, profession: e.target.value as Profession})}
                    >
                        <option value="Student">Student</option>
                        <option value="Working Professional">Working Professional</option>
                        <option value="Both">Both</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>
        </section>

        {/* Style & Persona */}
        <section className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-100 dark:border-navy-700 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Therapy Mode</h2>
            
            <div className="mb-6">
                <div className="text-sm font-semibold text-slate-500 mb-2">Approach Style</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['gentle', 'cbt', 'mindfulness'].map((style) => (
                        <button
                            key={style}
                            onClick={() => onUpdateSettings({...settings, therapistStyle: style as TherapistStyle})}
                            className={`p-3 rounded-xl border text-center transition-all capitalize font-medium ${
                                settings.therapistStyle === style 
                                ? 'border-lavender-400 bg-lavender-50 dark:bg-navy-700 text-lavender-600 dark:text-lavender-300' 
                                : 'border-slate-200 dark:border-navy-600 text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {style}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className="text-sm font-semibold text-slate-500 mb-2">Internal Personality (Base)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['introvert', 'extrovert'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => onUpdateSettings({...settings, personalityMode: mode as PersonalityMode})}
                            className={`p-3 rounded-xl border text-center transition-all capitalize font-medium ${
                                settings.personalityMode === mode 
                                ? 'border-teal-400 bg-teal-50 dark:bg-navy-700 text-teal-600 dark:text-teal-300' 
                                : 'border-slate-200 dark:border-navy-600 text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {mode}
                            <div className="text-[10px] opacity-70 font-normal">
                                {mode === 'introvert' ? 'Reflective, Calmer' : 'Expressive, Active'}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>

        {/* Memory & Privacy */}
        <section className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-100 dark:border-navy-700 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Memory & Privacy</h2>
            
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">Memory System</div>
                    <div className="text-sm text-slate-500">Allow Sukoon to remember context.</div>
                </div>
                <div 
                    onClick={() => onUpdateSettings({...settings, memoryEnabled: !settings.memoryEnabled})}
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.memoryEnabled ? 'bg-teal-500' : 'bg-slate-300'}`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${settings.memoryEnabled ? 'translate-x-6' : ''}`} />
                </div>
            </div>
            
            <hr className="border-slate-100 dark:border-navy-700 my-4"/>
            
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">Data Control</h3>
            
            <div className="space-y-3">
                <button 
                    onClick={() => { deleteTodayData(settings.id); alert("Today's data deleted."); }}
                    className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 dark:bg-navy-900 hover:bg-slate-100 dark:hover:bg-navy-950 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
                >
                    Clear Today's Conversation
                </button>
                
                <div className="flex gap-2">
                    <input 
                        type="date" 
                        value={deleteDate}
                        onChange={e => setDeleteDate(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-navy-900 border-none outline-none text-sm text-slate-700 dark:text-white"
                    />
                    <button 
                        onClick={handleDeleteDate}
                        disabled={!deleteDate}
                        className="px-6 py-3 bg-slate-200 dark:bg-navy-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-navy-600 disabled:opacity-50"
                    >
                        Delete Date
                    </button>
                </div>

                <button 
                    onClick={() => {
                        if(confirm("Are you sure? This will delete ALL journals, memories, and sessions for your account.")) {
                            deleteAllData(settings.id);
                            window.location.reload();
                        }
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-rose-200 dark:border-rose-900/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 text-sm font-medium transition-colors mt-4"
                >
                    Delete All My Data
                </button>
            </div>
        </section>
        
        <div className="text-center text-xs text-slate-400 pb-8">
            <p>Account ID: {settings.id}</p>
            <p>Supabase Connection: {dbStatus.toUpperCase()}</p>
        </div>

      </div>
    </div>
  );
};
