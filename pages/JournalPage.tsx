import React, { useState, useEffect } from 'react';
import { JournalEntry, Session } from '../types';
import { getSessions, getJournals, saveJournals } from '../services/ragService';

interface JournalPageProps {
    userId: string;
}

export const JournalPage: React.FC<JournalPageProps> = ({ userId }) => {
  const [view, setView] = useState<'journal' | 'history'>('journal');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [newEntry, setNewEntry] = useState('');

  useEffect(() => {
    setEntries(getJournals(userId));
    setSessions(getSessions(userId).sort((a,b) => b.startTime - a.startTime));
  }, [userId]);

  const saveEntry = () => {
    if (!newEntry.trim()) return;
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      title: new Date().toLocaleDateString(),
      content: newEntry,
      mood: 'neutral', // simplified
      timestamp: Date.now()
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveJournals(userId, updated);
    setNewEntry('');
  };

  return (
    <div className="p-6 md:p-12 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-sans font-bold text-slate-800 dark:text-white mb-2">My Journey</h1>
            <p className="text-slate-500 dark:text-slate-400">Track your thoughts and sessions.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-navy-800 p-1 rounded-xl">
            <button 
                onClick={() => setView('journal')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === 'journal' ? 'bg-white dark:bg-navy-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500'}`}
            >
                Journal
            </button>
            <button 
                onClick={() => setView('history')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === 'history' ? 'bg-white dark:bg-navy-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500'}`}
            >
                History
            </button>
        </div>
      </div>

      {view === 'journal' ? (
          <>
            <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-sm border border-slate-100 dark:border-navy-700 p-6 mb-8">
                <textarea
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full h-32 bg-transparent resize-none outline-none text-slate-700 dark:text-slate-200 placeholder-slate-300 font-sans"
                />
                <div className="flex justify-end mt-4">
                <button 
                    onClick={saveEntry}
                    className="px-6 py-2 bg-teal-500 text-white rounded-full text-sm font-bold hover:bg-teal-600 transition-colors"
                >
                    Save Note
                </button>
                </div>
            </div>

            <div className="space-y-4">
                {entries.map(entry => (
                <div key={entry.id} className="bg-white dark:bg-navy-800 p-6 rounded-2xl border border-slate-100 dark:border-navy-700">
                    <div className="text-xs font-bold text-lavender-500 uppercase tracking-wide mb-2">
                    {new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                </div>
                ))}
            </div>
          </>
      ) : (
          <div className="space-y-4">
             {sessions.length === 0 && <div className="text-center text-slate-400 py-10">No past sessions yet.</div>}
             {sessions.map(session => (
                 <div key={session.id} className="bg-white dark:bg-navy-800 p-5 rounded-2xl border border-slate-100 dark:border-navy-700 hover:shadow-md transition-shadow cursor-default">
                     <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-slate-800 dark:text-white">
                            {new Date(session.startTime).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-400">
                            {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                     </div>
                     <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                         {session.messages.length} messages • Mood: {session.moodStart || 'Not tracked'}
                     </div>
                     <div className="bg-slate-50 dark:bg-navy-900 p-3 rounded-lg text-xs text-slate-600 dark:text-slate-300 italic">
                         Last message: "{session.messages[session.messages.length-1]?.text.substring(0, 100)}..."
                     </div>
                 </div>
             ))}
          </div>
      )}
    </div>
  );
};
