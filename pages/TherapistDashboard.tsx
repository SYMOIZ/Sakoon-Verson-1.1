
import React, { useState, useEffect } from 'react';
import { getTherapyNotes, saveTherapyNote, getAdminUsers } from '../services/dataService';
import { TherapyNote, AdminUserView } from '../types';

export const TherapistDashboard: React.FC = () => {
    const [patients, setPatients] = useState<AdminUserView[]>([]);
    const [notes, setNotes] = useState<TherapyNote[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState({ title: '', details: '', mark: 'Progress' });

    useEffect(() => {
        getAdminUsers().then(setPatients);
        getTherapyNotes().then(setNotes);
    }, []);

    const filteredNotes = selectedPatientId ? notes.filter(n => n.userId === selectedPatientId) : notes;

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

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">My Patients</h2>
                    <p className="text-xs text-slate-400">Select a patient to view notes</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {patients.map(p => (
                        <button 
                            key={p.id} 
                            onClick={() => setSelectedPatientId(p.id)}
                            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${selectedPatientId === p.id ? 'bg-teal-50 border border-teal-100' : 'hover:bg-slate-50'}`}
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{p.name.charAt(0)}</div>
                            <div>
                                <div className="font-bold text-slate-700 text-sm">{p.name}</div>
                                <div className="text-[10px] text-slate-400 uppercase">{p.id.slice(0,8)}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            <main className="flex-1 flex flex-col p-8 overflow-hidden">
                {!selectedPatientId ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400">Select a patient to verify notes.</div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-slate-800">Clinical Notes</h1>
                            <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Active Session</span>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2">
                            {filteredNotes.length === 0 && <div className="text-center text-slate-400 py-10">No notes recorded for this patient.</div>}
                            {filteredNotes.map(n => (
                                <div key={n.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs font-bold text-slate-400 uppercase">{n.dateOfNote}</div>
                                        <div className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{n.markType}</div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-2">{n.title}</h3>
                                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{n.details}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                            <h4 className="font-bold text-slate-800 mb-4">Add Observation</h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <input 
                                    className="p-3 bg-slate-50 rounded-xl outline-none text-sm border border-slate-100 focus:border-teal-300 transition-colors" 
                                    placeholder="Title"
                                    value={noteDraft.title}
                                    onChange={e => setNoteDraft({...noteDraft, title: e.target.value})}
                                />
                                <select 
                                    className="p-3 bg-slate-50 rounded-xl outline-none text-sm border border-slate-100"
                                    value={noteDraft.mark}
                                    onChange={e => setNoteDraft({...noteDraft, mark: e.target.value})}
                                >
                                    <option>Progress</option><option>Warning</option><option>Needs Follow-up</option>
                                </select>
                            </div>
                            <textarea 
                                className="w-full p-3 bg-slate-50 rounded-xl outline-none text-sm h-24 resize-none border border-slate-100 focus:border-teal-300 transition-colors mb-4" 
                                placeholder="Details..."
                                value={noteDraft.details}
                                onChange={e => setNoteDraft({...noteDraft, details: e.target.value})}
                            />
                            <div className="flex justify-end">
                                <button onClick={handleSaveNote} className="px-6 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors">Save Note</button>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};
