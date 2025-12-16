
import React, { useState, useEffect } from 'react';
import { getSupportTickets, resolveSupportTicket, getStudentFeedback, updateFeedbackStatus } from '../../services/dataService';

export const AdminSupport: React.FC = () => {
    const [viewMode, setViewMode] = useState<'tickets' | 'student-feedback'>('tickets');
    
    // Therapist Tickets
    const [tickets, setTickets] = useState<any[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [replyText, setReplyText] = useState('');

    // Student Feedback
    const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
    const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
    const [feedbackNote, setFeedbackNote] = useState('');

    useEffect(() => {
        refreshData();
    }, [viewMode]);

    const refreshData = () => {
        if (viewMode === 'tickets') {
            getSupportTickets().then(setTickets);
        } else {
            getStudentFeedback().then(setFeedbackItems);
        }
    };

    const handleReply = async () => {
        if (!selectedTicket || !replyText) return;
        await resolveSupportTicket(selectedTicket.id, replyText);
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'Resolved', admin_response: replyText } : t));
        setSelectedTicket(null);
        setReplyText('');
    };

    const handleFeedbackAction = async (status: string) => {
        if (!selectedFeedback) return;
        await updateFeedbackStatus(selectedFeedback.id, status, feedbackNote);
        setFeedbackItems(prev => prev.map(f => f.id === selectedFeedback.id ? { ...f, status: status, metadata: {...f.metadata, admin_note: feedbackNote} } : f));
        setSelectedFeedback(null);
        setFeedbackNote('');
    };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Help & Support Center</h1>
                <div className="flex bg-white dark:bg-navy-800 p-1 rounded-xl border border-slate-200 dark:border-navy-700">
                    <button 
                        onClick={() => setViewMode('tickets')} 
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'tickets' ? 'bg-slate-100 dark:bg-navy-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Therapist Tickets
                    </button>
                    <button 
                        onClick={() => setViewMode('student-feedback')} 
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'student-feedback' ? 'bg-slate-100 dark:bg-navy-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Student Reports
                    </button>
                </div>
            </div>
            
            <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-700 overflow-hidden flex-1 relative">
                {viewMode === 'tickets' ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Subject</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                            {tickets.map(ticket => (
                                <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="hover:bg-slate-50 dark:hover:bg-navy-700 cursor-pointer transition-colors">
                                    <td className="p-4 font-bold text-slate-800 dark:text-white">{ticket.subject}</td>
                                    <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs uppercase">{ticket.type}</span></td>
                                    <td className="p-4">
                                        <div className="text-slate-800 dark:text-white">{ticket.userName}</div>
                                        <div className="text-xs text-slate-400">{ticket.userEmail}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ticket.status === 'Resolved' ? 'bg-slate-200 text-slate-600' : 'bg-teal-100 text-teal-700'}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs">{new Date(ticket.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {tickets.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No therapist tickets found.</td></tr>}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Category</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Student</th>
                                <th className="p-4">Message Preview</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                            {feedbackItems.map(item => (
                                <tr key={item.id} onClick={() => setSelectedFeedback(item)} className="hover:bg-slate-50 dark:hover:bg-navy-700 cursor-pointer transition-colors">
                                    <td className="p-4 font-bold text-slate-800 dark:text-white">{item.category}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${item.type === 'Bug Report' ? 'bg-rose-100 text-rose-700' : item.type === 'Safety Alert' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'}`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-slate-800 dark:text-white">{item.userName}</div>
                                        <div className="text-xs text-slate-400">{item.userEmail}</div>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">{item.description}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.status === 'Resolved' || item.status === 'Fixed' ? 'bg-slate-200 text-slate-600' : 'bg-teal-100 text-teal-700'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {feedbackItems.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No student reports found.</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Ticket Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-navy-900 w-full max-w-2xl p-8 rounded-3xl shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-navy-800 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selectedTicket.subject}</h2>
                                <div className="text-sm text-slate-500 mt-1">From: {selectedTicket.userName} ({selectedTicket.userEmail})</div>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-6">
                            <div className="bg-slate-50 dark:bg-navy-950 p-4 rounded-xl text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">
                                {selectedTicket.description}
                            </div>
                            
                            {selectedTicket.admin_response && (
                                <div className="mt-4 bg-teal-50 dark:bg-navy-800 p-4 rounded-xl border border-teal-100 dark:border-navy-700">
                                    <div className="text-xs font-bold text-teal-600 uppercase mb-1">Admin Response</div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedTicket.admin_response}</p>
                                </div>
                            )}
                        </div>

                        {selectedTicket.status !== 'Resolved' ? (
                            <div className="space-y-3">
                                <textarea 
                                    className="w-full p-4 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl outline-none text-sm resize-none h-32 focus:ring-2 focus:ring-teal-500"
                                    placeholder="Type your reply here..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                />
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setSelectedTicket(null)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancel</button>
                                    <button onClick={handleReply} className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md">Send Reply & Resolve</button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 italic">This ticket is closed.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Student Feedback Modal */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-navy-900 w-full max-w-2xl p-8 rounded-3xl shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-navy-800 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    {selectedFeedback.category}
                                    <span className={`text-[10px] px-2 py-1 rounded-full uppercase ${selectedFeedback.type === 'Bug Report' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>{selectedFeedback.type}</span>
                                </h2>
                                <div className="text-sm text-slate-500 mt-1">From: {selectedFeedback.userName} ({selectedFeedback.userEmail})</div>
                            </div>
                            <button onClick={() => setSelectedFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-6 space-y-4">
                            <div className="bg-slate-50 dark:bg-navy-950 p-4 rounded-xl text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">
                                {selectedFeedback.description}
                            </div>
                            
                            {selectedFeedback.metadata && (
                                <div className="p-4 border border-slate-100 dark:border-navy-700 rounded-xl text-xs text-slate-500 font-mono">
                                    <h4 className="font-bold mb-2 uppercase text-slate-400">System Metadata</h4>
                                    {Object.entries(selectedFeedback.metadata).map(([k, v]) => (
                                        <div key={k} className="flex justify-between border-b border-slate-50 dark:border-navy-800 py-1 last:border-0">
                                            <span>{k}:</span> <span className="text-slate-700 dark:text-slate-300">{String(v)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <textarea 
                                className="w-full p-4 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl outline-none text-sm resize-none h-24 focus:ring-2 focus:ring-indigo-500"
                                placeholder="Internal admin notes (optional)..."
                                value={feedbackNote}
                                onChange={e => setFeedbackNote(e.target.value)}
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setSelectedFeedback(null)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancel</button>
                                <button onClick={() => handleFeedbackAction('Reviewed')} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Mark Reviewed</button>
                                <button onClick={() => handleFeedbackAction('Resolved')} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md">Mark Resolved</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
