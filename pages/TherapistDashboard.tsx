

import React, { useState, useEffect } from 'react';
import { getTherapyNotes, saveTherapyNote, getAdminUsers, createSafetyCase } from '../services/dataService';
import { TherapyNote, AdminUserView } from '../types';

export const TherapistDashboard: React.FC = () => {
    const [patients, setPatients] = useState<AdminUserView[]>([]);
    const [notes, setNotes] = useState<TherapyNote[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState({ title: '', details: '', mark: 'Progress' });
    
    // Therapist Room State
    const [isLive, setIsLive] = useState(false);
    
    useEffect(() => {
        getAdminUsers().then(setPatients);
        getTherapyNotes().then(setNotes);
    }, []);

    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    const filteredNotes = selectedPatientId ? notes.filter(n => n.userId === selectedPatientId) : [];

    const handleSaveNote = async () => {
        if (!selectedPatientId || !noteDraft.title) return;
        const newNote: TherapyNote = {
            id: crypto.randomUUID(),
            userId: selectedPatientId,
            therapistId: 'me',
            title: noteDraft.title,
            details: noteDraft.details,
            markType: noteDraft.mark as any,
            dateOfNote: new Date().toISOString().split('T')[0],
            createdAt: Date.now(),
            nextReminder: 'No Reminder'
        };
        await saveTherapyNote(newNote);
        setNotes([...notes, newNote]);
        setNoteDraft({ title: '', details: '', mark: 'Progress' });
    };

    const handleRequestSupport = () => {
        if(selectedPatientId) {
             createSafetyCase(selectedPatientId, 'EMOTIONAL_DISTRESS', "Therapist requested admin support during live session.");
             alert("Admin support has been notified.");
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-20">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-bold text-slate-800">Therapist Room</h2>
                    <div className="flex items-center gap-2 mt-2">
                         <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`}></div>
                         <span className="text-xs font-bold text-slate-500 uppercase">{isLive ? 'Live Session' : 'Offline'}</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {patients.map(p => (
                        <button 
                            key={p.id} 
                            onClick={() => setSelectedPatientId(p.id)}
                            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedPatientId === p.id ? 'bg-teal-50 border border-teal-100 shadow-sm' : 'hover:bg-slate-50'}`}
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lavender-200 to-teal-200 flex items-center justify-center font-bold text-slate-600">
                                {p.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-700 text-sm truncate">{p.name}</div>
                                <div className="text-[10px] text-slate-400 uppercase">{p.id.slice(0,8)}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {!selectedPatient ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-full mb-4 flex items-center justify-center text-2xl">👋</div>
                        <p>Select a patient to enter the room.</p>
                    </div>
                ) : (
                    <>
                        {/* Top Bar: Patient Context */}
                        <header className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-6">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-800">{selectedPatient.name}</h1>
                                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded">Pronouns: {selectedPatient.pronouns || 'N/A'}</span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded">Gender: {selectedPatient.gender}</span>
                                        {selectedPatient.flags?.map(f => <span key={f} className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-bold">{f}</span>)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleRequestSupport} className="px-4 py-2 border border-rose-200 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-50 transition-colors">Request Admin Support</button>
                                <button onClick={() => setIsLive(!isLive)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isLive ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-teal-500 text-white hover:bg-teal-600'}`}>
                                    {isLive ? 'End Session' : 'Start Live Session'}
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 flex overflow-hidden">
                             {/* Middle: Chat / Session Area */}
                             <div className="flex-1 bg-slate-50 p-6 flex flex-col">
                                 {isLive ? (
                                     <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                                         <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-4xl mb-4 animate-pulse">🎤</div>
                                         <h2 className="text-xl font-bold text-slate-800 mb-2">Session in Progress</h2>
                                         <p className="text-slate-500 max-w-md mb-6">You are connected. Audio/Video stream would appear here in a production environment.</p>
                                         <div className="text-xs text-slate-400 font-mono">Session ID: {crypto.randomUUID().slice(0,8)}</div>
                                     </div>
                                 ) : (
                                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                         <p>Session is offline.</p>
                                         <p className="text-sm mt-2">Review notes or start a session to connect.</p>
                                     </div>
                                 )}
                             </div>

                             {/* Right: Clinical Notes */}
                             <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
                                 <div className="p-4 border-b border-slate-100 bg-slate-50">
                                     <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Session Notes</h3>
                                 </div>
                                 
                                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                     <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                         <div className="text-xs font-bold text-amber-700 uppercase mb-2">AI Behavior Summary</div>
                                         <p className="text-xs text-slate-700 leading-relaxed">
                                             Patient shows consistent engagement. Flagged keywords related to academic stress detected in previous 3 sessions.
                                         </p>
                                     </div>

                                     {filteredNotes.map(n => (
                                         <div key={n.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                             <div className="flex justify-between mb-1">
                                                 <span className="text-[10px] font-bold text-slate-400 uppercase">{n.dateOfNote}</span>
                                                 <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-600">{n.markType}</span>
                                             </div>
                                             <div className="font-bold text-sm text-slate-800 mb-1">{n.title}</div>
                                             <div className="text-xs text-slate-600">{n.details}</div>
                                         </div>
                                     ))}
                                 </div>

                                 <div className="p-4 border-t border-slate-100 bg-slate-50">
                                     <input 
                                         className="w-full mb-2 p-2 bg-white rounded-lg border border-slate-200 text-sm outline-none"
                                         placeholder="Note Title"
                                         value={noteDraft.title}
                                         onChange={e => setNoteDraft({...noteDraft, title: e.target.value})}
                                     />
                                     <textarea 
                                         className="w-full mb-2 p-2 bg-white rounded-lg border border-slate-200 text-sm outline-none resize-none h-20"
                                         placeholder="Clinical observations..."
                                         value={noteDraft.details}
                                         onChange={e => setNoteDraft({...noteDraft, details: e.target.value})}
                                     />
                                     <div className="flex justify-between items-center">
                                         <select 
                                             className="bg-white border border-slate-200 text-xs p-1.5 rounded-lg outline-none"
                                             value={noteDraft.mark}
                                             onChange={e => setNoteDraft({...noteDraft, mark: e.target.value})}
                                         >
                                             <option>Progress</option><option>Warning</option><option>Follow-up</option>
                                         </select>
                                         <button onClick={handleSaveNote} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700">Save</button>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};