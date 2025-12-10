
import React, { useState, useEffect } from 'react';
import { getAdminStats, getTherapists, saveTherapist, deleteTherapist, getAdminUsers, getAdminReports, getAdminAlerts, getBugReports, resolveBugReport, deleteBugReport, getUserFeedback, deleteUserFeedback, getTherapyNotes, saveTherapyNote } from '../services/dataService';
import { AdminStats, Therapist, AdminUserView, AdminReport, AdminAlert, BugReport, UserFeedback, TherapyNote } from '../types';

// --- UTILS ---
interface ReportCardProps { title: string; type: string; date: string; }
const ReportCard: React.FC<ReportCardProps> = ({ title, type, date }) => (
    <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-navy-700 flex justify-between items-center">
        <div>
            <div className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-1">{type}</div>
            <div className="font-bold text-slate-800 dark:text-white text-lg">{title}</div>
            <div className="text-sm text-slate-500">{date}</div>
        </div>
        <button className="px-4 py-2 bg-slate-100 dark:bg-navy-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm">Download</button>
    </div>
);

interface StatCardProps { label: string; value: string | number; sub: string; }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub }) => (
    <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-navy-700">
        <div className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">{label}</div>
        <div className="text-3xl font-sans font-bold text-slate-800 dark:text-white mb-1">{value}</div>
        <div className="text-xs text-teal-500 font-medium">{sub}</div>
    </div>
);

interface ChartCardProps { title: string; children: React.ReactNode; }
const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => (
    <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-navy-700">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{title}</h3>
        {children}
    </div>
);

interface ProgressBarProps { label: string; value: number; total: number; color: string; }
const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, total, color }) => (
    <div className="flex items-center gap-4">
        <div className="w-32 text-sm font-medium text-slate-600 dark:text-slate-300 truncate">{label}</div>
        <div className="flex-1 bg-slate-100 dark:bg-navy-900 rounded-full h-2 overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
        </div>
        <div className="w-12 text-xs text-slate-400 text-right">{value}</div>
    </div>
);

interface EmptyStateProps { message: string; }
const EmptyState: React.FC<EmptyStateProps> = ({ message }) => (
    <div className="p-8 text-center text-slate-400 italic bg-slate-50 dark:bg-navy-950 rounded-xl">
        {message}
    </div>
);

interface AdminDashboardProps {
  currentView: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentView }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [notes, setNotes] = useState<TherapyNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            // Use Promise.allSettled to ensure a failure in one call doesn't break the entire dashboard
            const results = await Promise.allSettled([
                getAdminStats(),
                getTherapists(),
                getAdminUsers(),
                getAdminReports(),
                getAdminAlerts(),
                getBugReports(),
                getUserFeedback(),
                getTherapyNotes()
            ]);

            setStats(results[0].status === 'fulfilled' ? results[0].value : null);
            setTherapists(results[1].status === 'fulfilled' ? results[1].value : []);
            setUsers(results[2].status === 'fulfilled' ? results[2].value : []);
            setReports(results[3].status === 'fulfilled' ? results[3].value : []);
            setAlerts(results[4].status === 'fulfilled' ? results[4].value : []);
            setBugs(results[5].status === 'fulfilled' ? results[5].value : []);
            setFeedback(results[6].status === 'fulfilled' ? results[6].value : []);
            setNotes(results[7].status === 'fulfilled' ? results[7].value : []);

        } catch (e) {
            console.error("Dashboard Load Error", e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [currentView]);

  const renderContent = () => {
      if (loading) return <div className="p-12 text-center text-slate-400">Loading Dashboard Data...</div>;

      switch(currentView) {
          case 'admin-users': return <UsersView users={users} />;
          case 'admin-therapists': return <TherapistsView therapists={therapists} setTherapists={setTherapists} />;
          case 'admin-analytics': return <AnalyticsView stats={stats} />;
          case 'admin-reports': return <ReportsView reports={reports} />;
          case 'admin-emergency': return <EmergencyView alerts={alerts} />;
          case 'admin-feedback': return <FeedbackView bugs={bugs} feedback={feedback} setBugs={setBugs} setFeedback={setFeedback} />;
          case 'admin-notes': return <TherapyNotesView notes={notes} users={users} setNotes={setNotes} />;
          default: return <DashboardHome stats={stats} alerts={alerts} notes={notes} users={users} />;
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-navy-900">
        <div className="bg-rose-600 text-white px-6 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center shadow-md z-10">
            <span>Admin Mode — Business Analytics Only</span>
            <div className="flex gap-4">
                 <span>System Online</span>
                 <span>Analytics Mode Active</span>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-12">
            {renderContent()}
        </div>
    </div>
  );
};

// --- MODALS ---

const UserProfileModal = ({ user, onClose }: { user: AdminUserView, onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'notes'>('overview');
    const [notes, setNotes] = useState<TherapyNote[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(true);
    
    // Add Note State
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNote, setNewNote] = useState<Partial<TherapyNote>>({ markType: 'Progress', nextReminder: 'No Reminder', dateOfNote: new Date().toISOString().split('T')[0] });

    useEffect(() => {
        if (activeTab === 'notes') {
            loadNotes();
        }
    }, [activeTab, user.id]);

    const loadNotes = async () => {
        setLoadingNotes(true);
        const data = await getTherapyNotes(user.id);
        setNotes(data.sort((a,b) => b.createdAt - a.createdAt));
        setLoadingNotes(false);
    }

    const handleSaveNote = async () => {
        if (!newNote.title) return;
        await saveTherapyNote({
            id: crypto.randomUUID(),
            userId: user.id,
            therapistId: 'admin',
            dateOfNote: newNote.dateOfNote || new Date().toISOString().split('T')[0],
            title: newNote.title,
            details: newNote.details || '',
            markType: newNote.markType as any,
            nextReminder: newNote.nextReminder,
            createdAt: Date.now()
        });
        setIsAddingNote(false);
        setNewNote({ markType: 'Progress', nextReminder: 'No Reminder', dateOfNote: new Date().toISOString().split('T')[0] });
        loadNotes();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-navy-900 w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 dark:border-navy-700 flex justify-between items-center bg-slate-50 dark:bg-navy-950">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-xl">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{user.name}</h2>
                            <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex border-b border-slate-100 dark:border-navy-700">
                    <button onClick={() => setActiveTab('overview')} className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'overview' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>Overview</button>
                    <button onClick={() => setActiveTab('notes')} className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'notes' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>Therapy Notes</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-navy-900">
                    {activeTab === 'overview' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-navy-950 rounded-xl">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Region</div>
                                    <div className="text-lg font-medium text-slate-800 dark:text-white">{user.region}</div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-navy-950 rounded-xl">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Status</div>
                                    <div className="text-lg font-medium text-slate-800 dark:text-white capitalize">{user.status}</div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-navy-950 rounded-xl">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Sessions</div>
                                    <div className="text-lg font-medium text-slate-800 dark:text-white">{user.sessionCount}</div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-navy-950 rounded-xl">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Last Active</div>
                                    <div className="text-lg font-medium text-slate-800 dark:text-white">{user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}</div>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-slate-50 dark:bg-navy-950 rounded-2xl border border-slate-100 dark:border-navy-800">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Demographics</h3>
                                <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-300">
                                    <span className="px-3 py-1 bg-white dark:bg-navy-800 rounded-lg border border-slate-200 dark:border-navy-700">{user.age} Years Old</span>
                                    <span className="px-3 py-1 bg-white dark:bg-navy-800 rounded-lg border border-slate-200 dark:border-navy-700">{user.gender}</span>
                                    <span className="px-3 py-1 bg-white dark:bg-navy-800 rounded-lg border border-slate-200 dark:border-navy-700">{user.profession}</span>
                                    <span className="px-3 py-1 bg-white dark:bg-navy-800 rounded-lg border border-slate-200 dark:border-navy-700">{user.language}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 dark:text-white">Patient History</h3>
                                {!isAddingNote && <button onClick={() => setIsAddingNote(true)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700">+ Add Note</button>}
                            </div>

                            {isAddingNote && (
                                <div className="bg-slate-50 dark:bg-navy-950 p-6 rounded-2xl border border-slate-200 dark:border-navy-800 animate-fade-in">
                                    <h4 className="font-bold text-slate-700 dark:text-white mb-4">New Clinical Entry</h4>
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-slate-400">Date</label>
                                                <input type="date" className="w-full mt-1 p-3 bg-white dark:bg-navy-900 rounded-lg outline-none border border-slate-200 dark:border-navy-700" value={newNote.dateOfNote} onChange={e => setNewNote({...newNote, dateOfNote: e.target.value})} />
                                            </div>
                                            <div className="flex-[2]">
                                                <label className="text-xs font-bold text-slate-400">Title</label>
                                                <input type="text" placeholder="Session Summary" className="w-full mt-1 p-3 bg-white dark:bg-navy-900 rounded-lg outline-none border border-slate-200 dark:border-navy-700" value={newNote.title} onChange={e => setNewNote({...newNote, title: e.target.value})} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400">Observations</label>
                                            <textarea placeholder="Detailed notes..." className="w-full mt-1 p-3 bg-white dark:bg-navy-900 rounded-lg outline-none border border-slate-200 dark:border-navy-700 h-24 resize-none" value={newNote.details} onChange={e => setNewNote({...newNote, details: e.target.value})} />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-slate-400">Mark / Flag</label>
                                                <select className="w-full mt-1 p-3 bg-white dark:bg-navy-900 rounded-lg outline-none border border-slate-200 dark:border-navy-700" value={newNote.markType} onChange={e => setNewNote({...newNote, markType: e.target.value as any})}>
                                                    <option>Progress</option><option>Warning</option><option>Emotional Drop</option><option>Improvement</option><option>Needs Follow-up</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-slate-400">Reminder</label>
                                                <select className="w-full mt-1 p-3 bg-white dark:bg-navy-900 rounded-lg outline-none border border-slate-200 dark:border-navy-700" value={newNote.nextReminder} onChange={e => setNewNote({...newNote, nextReminder: e.target.value})}>
                                                    <option>No Reminder</option><option>3 Days</option><option>7 Days</option><option>30 Days</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button onClick={() => setIsAddingNote(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold">Cancel</button>
                                            <button onClick={handleSaveNote} className="flex-1 py-3 bg-teal-500 text-white rounded-lg font-bold shadow-lg">Save Note</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {loadingNotes ? <div className="text-center py-8 text-slate-400">Loading notes...</div> : (
                                <div className="relative border-l-2 border-slate-200 dark:border-navy-800 ml-3 pl-8 space-y-8">
                                    {notes.length === 0 && <div className="text-slate-400 italic">No notes recorded yet.</div>}
                                    {notes.map(note => (
                                        <div key={note.id} className="relative">
                                            <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white dark:border-navy-900 ${note.markType === 'Warning' || note.markType === 'Emotional Drop' ? 'bg-rose-500' : 'bg-teal-500'}`}></div>
                                            <div className="bg-slate-50 dark:bg-navy-950 p-5 rounded-2xl border border-slate-100 dark:border-navy-800">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-400 uppercase">{note.dateOfNote}</div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">{note.title}</h4>
                                                    </div>
                                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${note.markType === 'Warning' ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'}`}>{note.markType}</span>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap">{note.details}</p>
                                                {note.nextReminder !== 'No Reminder' && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-navy-800 text-xs text-amber-600 font-bold flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Reminder set: {note.nextReminder}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- SUB-VIEWS ---

const FeedbackView = ({ bugs, feedback, setBugs, setFeedback }: { bugs: BugReport[], feedback: UserFeedback[], setBugs: any, setFeedback: any }) => {
    const [tab, setTab] = useState<'bugs' | 'feedback'>('feedback');

    const handleResolveBug = async (id: string) => {
        await resolveBugReport(id);
        setBugs(await getBugReports());
    }
    const handleDeleteBug = async (id: string) => {
        await deleteBugReport(id);
        setBugs(await getBugReports());
    }
    const handleDeleteFeedback = async (id: string) => {
        await deleteUserFeedback(id);
        setFeedback(await getUserFeedback());
    }

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center justify-between">
                 <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Feedback Center</h1>
                 <div className="flex bg-slate-200 dark:bg-navy-800 p-1 rounded-lg">
                     <button onClick={() => setTab('feedback')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${tab === 'feedback' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>User Feedback</button>
                     <button onClick={() => setTab('bugs')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${tab === 'bugs' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Bug Reports</button>
                 </div>
             </div>

             {tab === 'feedback' ? (
                 <div className="space-y-4">
                     {feedback.length === 0 && <EmptyState message="No user feedback received." />}
                     {feedback.map(f => (
                         <div key={f.id} className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-navy-700">
                             <div className="flex justify-between mb-2">
                                 <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${f.feedbackType === 'Positive' ? 'bg-teal-100 text-teal-600' : f.feedbackType === 'Negative' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {f.feedbackType}
                                    </span>
                                    <span className="text-xs text-slate-400">{new Date(f.timestamp).toLocaleString()}</span>
                                 </div>
                                 <button onClick={() => handleDeleteFeedback(f.id)} className="text-rose-600 hover:underline text-xs font-bold">Delete</button>
                             </div>
                             <h3 className="font-bold text-slate-800 dark:text-white">{f.category}</h3>
                             <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">{f.note}</p>
                         </div>
                     ))}
                 </div>
             ) : (
                 <div className="space-y-4">
                     {bugs.length === 0 && <EmptyState message="No bug reports filed." />}
                     {bugs.map(b => (
                         <div key={b.id} className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-navy-700">
                             <div className="flex justify-between mb-2">
                                 <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${b.status === 'resolved' ? 'bg-teal-100 text-teal-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {b.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">{b.issueType}</span>
                                    <span className="text-xs text-slate-400">{new Date(b.timestamp).toLocaleString()}</span>
                                 </div>
                                 <div className="flex gap-2">
                                     {b.status !== 'resolved' && <button onClick={() => handleResolveBug(b.id)} className="text-teal-600 hover:underline text-xs font-bold">Mark Resolved</button>}
                                     <button onClick={() => handleDeleteBug(b.id)} className="text-rose-600 hover:underline text-xs font-bold">Delete</button>
                                 </div>
                             </div>
                             <p className="text-sm text-slate-800 dark:text-white font-medium mt-2">{b.description}</p>
                             
                             <div className="mt-4 bg-slate-50 dark:bg-navy-950 p-3 rounded-lg text-xs font-mono text-slate-500 dark:text-slate-400 space-y-1">
                                 <div><strong>Session ID:</strong> {b.sessionId}</div>
                                 <div><strong>Browser:</strong> {b.browser} ({b.deviceInfo})</div>
                                 <div><strong>Context:</strong> {b.capturedContext.length} messages captured</div>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
        </div>
    );
};

const TherapyNotesView = ({ notes, users, setNotes }: { notes: TherapyNote[], users: AdminUserView[], setNotes: any }) => {
    // This is the master list view, detailed per-user view is now in UserProfileModal
    const [isAdding, setIsAdding] = useState(false);
    const [newNote, setNewNote] = useState<Partial<TherapyNote>>({ markType: 'Progress', nextReminder: 'No Reminder', dateOfNote: new Date().toISOString().split('T')[0] });
    
    const handleSave = async () => {
        if (!newNote.userId || !newNote.title) return;
        await saveTherapyNote({
            id: crypto.randomUUID(),
            userId: newNote.userId,
            therapistId: 'admin',
            dateOfNote: newNote.dateOfNote || new Date().toISOString().split('T')[0],
            title: newNote.title,
            details: newNote.details || '',
            markType: newNote.markType as any,
            nextReminder: newNote.nextReminder,
            createdAt: Date.now()
        });
        setNotes(await getTherapyNotes());
        setIsAdding(false);
        setNewNote({ markType: 'Progress', nextReminder: 'No Reminder', dateOfNote: new Date().toISOString().split('T')[0] });
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Therapy Notes (Master List)</h1>
                 <button onClick={() => setIsAdding(true)} className="px-5 py-2 bg-slate-800 text-white rounded-lg font-bold">
                     + Add Note
                 </button>
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-navy-700 max-w-2xl">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">New Clinical Note</h3>
                    <div className="space-y-4">
                        <select className="w-full p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none" value={newNote.userId} onChange={e => setNewNote({...newNote, userId: e.target.value})}>
                            <option value="">Select User</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                        </select>
                        <div className="flex gap-2">
                             <div className="w-1/2">
                                <label className="text-xs text-slate-400 font-bold ml-1">Therapy Date</label>
                                <input type="date" className="w-full p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none" value={newNote.dateOfNote} onChange={e => setNewNote({...newNote, dateOfNote: e.target.value})} />
                             </div>
                             <div className="w-1/2">
                                <label className="text-xs text-slate-400 font-bold ml-1">Title</label>
                                <input placeholder="Note Title" className="w-full p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none" value={newNote.title} onChange={e => setNewNote({...newNote, title: e.target.value})} />
                             </div>
                        </div>
                        <textarea placeholder="Detailed observations..." className="w-full p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none h-32" value={newNote.details} onChange={e => setNewNote({...newNote, details: e.target.value})} />
                        <div className="flex gap-2">
                            <select className="w-1/2 p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none" value={newNote.markType} onChange={e => setNewNote({...newNote, markType: e.target.value as any})}>
                                <option>Progress</option><option>Warning</option><option>Emotional Drop</option><option>Improvement</option><option>Needs Follow-up</option>
                            </select>
                            <select className="w-1/2 p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none" value={newNote.nextReminder} onChange={e => setNewNote({...newNote, nextReminder: e.target.value})}>
                                <option>No Reminder</option><option>3 Days</option><option>7 Days</option><option>30 Days</option>
                            </select>
                        </div>
                        <div className="flex gap-4 pt-4">
                             <button onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold">Cancel</button>
                             <button onClick={handleSave} className="flex-1 py-3 bg-teal-500 text-white rounded-lg font-bold">Save Note</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {notes.length === 0 && <EmptyState message="No therapy notes recorded." />}
                {notes.map(note => (
                    <div key={note.id} className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-navy-700 relative">
                        <div className={`absolute top-6 right-6 px-2 py-1 text-xs font-bold rounded uppercase ${note.markType === 'Warning' || note.markType === 'Emotional Drop' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 dark:bg-navy-900 text-slate-500'}`}>{note.markType}</div>
                        <div className="text-xs text-slate-400 font-bold uppercase mb-1">{note.dateOfNote}</div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{note.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 whitespace-pre-wrap">{note.details}</p>
                        <div className="text-xs text-slate-400 pt-3 border-t border-slate-50 dark:border-navy-900 flex justify-between">
                             <span>User ID: {note.userId}</span>
                             <span>Next Reminder: {note.nextReminder}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DashboardHome = ({ stats, alerts, notes, users }: { stats: AdminStats | null, alerts: AdminAlert[], notes: TherapyNote[], users: AdminUserView[] }) => {
    // Calc Reminders
    const dueReminders = notes.filter(n => {
        if (!n.nextReminder || n.nextReminder === 'No Reminder') return false;
        // Simple logic: if mark is Needs Follow-up OR if reminder days are past
        // Ideally we store reminder DATE, but prototype stores '7 Days'. 
        // We will assume 'Needs Follow-up' or a calculated date match.
        // For simplicity in prototype: Show all 'Needs Follow-up' or 'Warning' as reminders.
        return n.markType === 'Needs Follow-up' || n.markType === 'Warning';
    });

    if (!stats) return <div>Loading...</div>;
    return (
        <div className="space-y-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Admin Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={stats.totalUsers} sub="Real System Count" />
                <StatCard label="Active Today" value={stats.activeUsersToday} sub="Last 24h" />
                <StatCard label="Total Sessions" value={stats.totalSessions} sub="All Time" />
                <StatCard label="Avg Duration" value={stats.avgSessionDuration > 0 ? `${stats.avgSessionDuration}m` : "N/A"} sub="Per Session" />
            </div>

            {/* REMINDERS SECTION */}
            {dueReminders.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900 p-6">
                    <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Clinical Reminders ({dueReminders.length})
                    </h3>
                    <div className="space-y-3">
                        {dueReminders.map(note => {
                            const user = users.find(u => u.id === note.userId);
                            return (
                                <div key={note.id} className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-amber-100 dark:border-navy-800 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white text-sm">{note.title}</div>
                                        <div className="text-xs text-slate-500">Patient: {user?.name || note.userId} • {note.dateOfNote}</div>
                                    </div>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{note.markType}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {alerts.length > 0 ? (
                <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border-l-4 border-rose-500 p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">High Priority Alerts</h3>
                    <div className="space-y-3">
                        {alerts.filter(a => a.priority === 'HIGH').map(alert => (
                             <div key={alert.id} className="flex justify-between items-center bg-rose-50 dark:bg-navy-900 p-3 rounded-lg border border-rose-100 dark:border-navy-700">
                                 <div>
                                     <div className="font-bold text-rose-700 text-sm">{alert.type}: {alert.message}</div>
                                     <div className="text-xs text-rose-500">User: {alert.userId} • {new Date(alert.timestamp).toLocaleTimeString()}</div>
                                 </div>
                                 <button className="px-3 py-1 bg-white border border-rose-200 text-rose-600 text-xs font-bold rounded shadow-sm">Review</button>
                             </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm p-6 border-l-4 border-teal-500">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">System Healthy</h3>
                    <p className="text-slate-500 text-sm">No high-priority alerts detected in the system.</p>
                </div>
            )}
            <div className="grid md:grid-cols-2 gap-6">
                 <ChartCard title="Mood Distribution (Real Data)">
                     {Object.keys(stats.moodDistribution).length > 0 ? (
                         <div className="space-y-3">
                             {Object.entries(stats.moodDistribution).map(([label, val]) => (
                                 <ProgressBar key={label} label={label} value={val} total={stats.totalSessions} color="bg-teal-500" />
                             ))}
                         </div>
                     ) : <EmptyState message="No mood data available yet." />}
                 </ChartCard>
                 <ChartCard title="Language Usage (Real Data)">
                     {Object.keys(stats.languageDistribution).length > 0 ? (
                        <div className="space-y-3">
                            {Object.entries(stats.languageDistribution).map(([label, val]) => (
                                <ProgressBar key={label} label={label} value={val} total={stats.totalUsers} color="bg-lavender-500" />
                            ))}
                        </div>
                     ) : <EmptyState message="No language data available yet." />}
                 </ChartCard>
            </div>
        </div>
    );
};

const UsersView = ({ users }: { users: AdminUserView[] }) => {
    const [selectedUser, setSelectedUser] = useState<AdminUserView | null>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            {selectedUser && <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
            
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">User Management</h1>
            <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-700 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 font-bold uppercase text-xs">
                        <tr><th className="p-4">Name / ID</th><th className="p-4">Region</th><th className="p-4">Demographics</th><th className="p-4">Sessions</th><th className="p-4">Last Active</th><th className="p-4">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                        {users.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No registered users found.</td></tr>}
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors">
                                <td className="p-4"><div className="font-bold text-slate-800 dark:text-white">{u.name}</div><div className="text-xs text-slate-400">{u.id}</div></td>
                                <td className="p-4">{u.region}</td>
                                <td className="p-4"><div>{u.age} • {u.gender}</div><div className="text-xs text-slate-400">{u.profession}</div></td>
                                <td className="p-4">{u.sessionCount}</td>
                                <td className="p-4">{u.lastActive ? new Date(u.lastActive).toLocaleDateString() : 'Never'}</td>
                                <td className="p-4 flex gap-2">
                                    <button onClick={() => setSelectedUser(u)} className="text-teal-600 hover:underline font-bold">View Profile</button>
                                    <button className="text-rose-600 hover:underline">Suspend</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AnalyticsView = ({ stats }: { stats: AdminStats | null }) => {
    if(!stats) return null;
    return (
        <div className="space-y-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Deep Analytics</h1>
            <div className="grid md:grid-cols-2 gap-6">
                 <ChartCard title="Gender Distribution">
                      {Object.keys(stats.genderDistribution).length > 0 ? Object.entries(stats.genderDistribution).map(([l, v]) => <ProgressBar key={l} label={l} value={v} total={stats.totalUsers} color="bg-indigo-500" />) : <EmptyState message="No gender data." />}
                 </ChartCard>
                 <ChartCard title="Profession Breakdown">
                      {Object.keys(stats.professionDistribution).length > 0 ? Object.entries(stats.professionDistribution).map(([l, v]) => <ProgressBar key={l} label={l} value={v} total={stats.totalUsers} color="bg-orange-500" />) : <EmptyState message="No profession data." />}
                 </ChartCard>
                 <ChartCard title="Tone Preference">
                      {Object.keys(stats.toneDistribution).length > 0 ? Object.entries(stats.toneDistribution).map(([l, v]) => <ProgressBar key={l} label={l} value={v} total={stats.totalUsers} color="bg-pink-500" />) : <EmptyState message="No tone data." />}
                 </ChartCard>
                 <ChartCard title="Region Breakdown">
                      {Object.keys(stats.regionDistribution).length > 0 ? Object.entries(stats.regionDistribution).map(([l, v]) => <ProgressBar key={l} label={l} value={v} total={stats.totalUsers} color="bg-green-500" />) : <EmptyState message="No region data." />}
                 </ChartCard>
            </div>
        </div>
    );
}

const TherapistsView = ({ therapists, setTherapists }: { therapists: Therapist[], setTherapists: any }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [current, setCurrent] = useState<Partial<Therapist>>({});
    const handleSave = async () => {
        if(current.name && current.specialty) {
            await saveTherapist({...current as Therapist, id: current.id || crypto.randomUUID(), languages: current.languages || ['English'], availableSlots: current.availableSlots || []});
            setTherapists(await getTherapists());
            setIsEditing(false);
            setCurrent({});
        }
    };
    const handleDelete = async (id: string) => { if(confirm("Delete therapist?")) { await deleteTherapist(id); setTherapists(await getTherapists()); } }

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center"><h1 className="text-3xl font-bold text-slate-800 dark:text-white">Therapist Directory</h1>{!isEditing && <button onClick={() => { setCurrent({}); setIsEditing(true); }} className="px-5 py-2 bg-slate-800 text-white rounded-lg font-bold">+ Add Therapist</button>}</div>
             {isEditing ? (
                 <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl max-w-2xl"><h3 className="font-bold text-lg mb-4 dark:text-white">Edit Listing</h3><div className="space-y-4"><input placeholder="Name" className="w-full p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none" value={current.name||''} onChange={e=>setCurrent({...current, name: e.target.value})} /><input placeholder="Specialty" className="w-full p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none" value={current.specialty||''} onChange={e=>setCurrent({...current, specialty: e.target.value})} /><input placeholder="Location" className="w-full p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none" value={current.location||''} onChange={e=>setCurrent({...current, location: e.target.value})} /><textarea placeholder="Bio" className="w-full p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none h-24" value={current.bio||''} onChange={e=>setCurrent({...current, bio: e.target.value})} /><input placeholder="Booking URL" className="w-full p-3 bg-slate-50 dark:bg-navy-900 rounded-lg outline-none" value={current.bookingUrl||''} onChange={e=>setCurrent({...current, bookingUrl: e.target.value})} /><div className="flex gap-4"><button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold">Cancel</button><button onClick={handleSave} className="flex-1 py-3 bg-teal-500 text-white rounded-lg font-bold">Save</button></div></div></div>
             ) : (
                 <div className="grid gap-4">{therapists.map(t => (<div key={t.id} className="bg-white dark:bg-navy-800 p-5 rounded-2xl shadow-sm flex justify-between items-center border border-slate-100 dark:border-navy-700"><div><div className="font-bold text-slate-800 dark:text-white text-lg">{t.name}</div><div className="text-sm text-slate-500">{t.specialty} • {t.location}</div></div><div className="flex gap-2"><button onClick={() => { setCurrent(t); setIsEditing(true); }} className="px-3 py-1 bg-teal-50 text-teal-600 rounded text-sm font-bold">Edit</button><button onClick={() => handleDelete(t.id)} className="px-3 py-1 bg-rose-50 text-rose-600 rounded text-sm font-bold">Delete</button></div></div>))}</div>
             )}
        </div>
    );
};

const ReportsView = ({ reports }: { reports: AdminReport[] }) => (
    <div className="space-y-6 animate-fade-in"><h1 className="text-3xl font-bold text-slate-800 dark:text-white">System Reports</h1><div className="grid md:grid-cols-2 gap-4">{reports.map(r => <ReportCard key={r.id} title={r.title} type={r.type} date={new Date(r.dateGenerated).toLocaleDateString()} />)}</div></div>
);

const EmergencyView = ({ alerts }: { alerts: AdminAlert[] }) => (
    <div className="space-y-6 animate-fade-in"><div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 p-6 rounded-2xl"><h2 className="text-xl font-bold text-rose-700 dark:text-rose-400 mb-2">Emergency Tools</h2><p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl">Use these tools only for platform safety incidents. For clinical crises, follow the legal playbook: provide resources and escalate to designated leads. Do not initiate counseling from here.</p><div className="flex flex-wrap gap-4"><button className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg hover:bg-rose-700">End Session Immediately</button><button className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50">Block IP / Suspend</button><button className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50">Contact Compliance</button></div></div><h3 className="text-xl font-bold text-slate-800 dark:text-white mt-8">Alert History</h3>{alerts.length > 0 ? <div className="space-y-4">{alerts.map(a => (<div key={a.id} className="bg-white dark:bg-navy-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 flex justify-between items-center"><div><span className={`inline-block px-2 py-1 text-[10px] font-bold rounded uppercase mb-1 ${a.priority === 'HIGH' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{a.priority} Priority</span><div className="font-bold text-slate-800 dark:text-white">{a.message}</div><div className="text-xs text-slate-400">{new Date(a.timestamp).toLocaleString()} • {a.status}</div></div></div>))}</div> : <EmptyState message="No alert history available." />}</div>
);
