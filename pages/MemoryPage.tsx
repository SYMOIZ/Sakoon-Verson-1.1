import React, { useState, useEffect } from 'react';
import { getMemories, deleteMemory } from '../services/ragService';
import { Memory } from '../types';

interface MemoryPageProps {
    userId: string;
}

export const MemoryPage: React.FC<MemoryPageProps> = ({ userId }) => {
  const [memories, setMemories] = useState<Memory[]>([]);

  const load = async () => {
    const data = await getMemories(userId);
    setMemories(data);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const handleDelete = (id: string) => {
    deleteMemory(userId, id);
    load();
  };

  return (
    <div className="p-6 md:p-12 overflow-y-auto h-full">
      <h1 className="text-3xl font-serif text-slate-800 dark:text-white mb-2">Long-Term Memory</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Things Sukoon remembers about you to provide better support. You are in control.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {memories.map(mem => (
          <div key={mem.id} className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 flex justify-between items-start group">
            <div>
              <p className="text-slate-800 dark:text-slate-200 font-medium mb-1">{mem.content}</p>
              <div className="text-xs text-slate-400">
                {new Date(mem.createdAt).toLocaleDateString()} • {mem.isCore ? 'Core Memory' : 'Session Note'}
              </div>
            </div>
            <button 
              onClick={() => handleDelete(mem.id)}
              className="text-slate-300 hover:text-rose-500 transition-colors"
              title="Forget this memory"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        ))}
      </div>

      {memories.length === 0 && (
         <div className="bg-slate-100 dark:bg-navy-800 rounded-xl p-8 text-center text-slate-500">
           Sukoon hasn't stored any long-term memories yet. As you chat, key details will appear here.
         </div>
      )}
    </div>
  );
};