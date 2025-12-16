
import React, { useState, useEffect } from 'react';
import { getTherapyNotes, saveTherapyNote, getTherapistPatients, updateTherapistProfile, saveSupportTicket, getTransactions, requestPayout, getReviews, getTherapistSchedule, addCalendarSlot, deleteCalendarSlot } from '../services/dataService';
import { TherapyNote, AdminUserView, Therapist, SupportTicket, Transaction, Review, CalendarSlot } from '../types';
import { CodeOfConductPage, ClinicalGuidelinesPage, CrisisProtocolPage, PayoutPolicyPage, NonCircumventionPage, ReportIncidentPage } from './TherapistResources';

interface TherapistDashboardProps {
    view: 'overview' | 'schedule' | 'calendar' | 'patients' | 'finance' | 'analytics' | 'profile' | 'support' | 'code-of-conduct' | 'guidelines' | 'crisis-protocol' | 'payout-policy' | 'non-circumvention' | 'report-incident';
    initialTab?: any; // Deprecated, kept for compat
}

export const TherapistDashboard: React.FC<TherapistDashboardProps> = ({ view = 'overview' }) => {
    // Current Therapist ID (In real app, get from auth context)
    const CURRENT_THERAPIST_ID = 'th-test-01'; 

    const [patients, setPatients] = useState<AdminUserView[]>([]);
    const [notes, setNotes] = useState<TherapyNote[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState({ title: '', details: '', mark: 'Progress' });
    
    // Profile State (Expanded)
    const [profile, setProfile] = useState<Partial<Therapist>>({ 
        bio: '', 
        bookingUrl: '', 
        specialty: '', 
        experience: 0,
        licenseNumber: '',
        bankDetails: { bankName: '', accountTitle: '', iban: '' },
        notificationPrefs: { email: true, sms: true },
        clinicalSpecializations: [],
        loyaltyPoints: 1250,
        badges: []
    });

    // Finance State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [availableBalance, setAvailableBalance] = useState(0);
    const [pendingBalance, setPendingBalance] = useState(0);
    const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');

    // Analytics State
    const [reviews, setReviews] = useState<Review[]>([]);

    const [profileTab, setProfileTab] = useState<'general' | 'practice' | 'banking'>('general');
    const [isProfileComplete, setIsProfileComplete] = useState(false);

    // Support State
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [ticketData, setTicketData] = useState({ type: 'Bug', subject: '', description: '' });

    // Calendar State
    const [schedule, setSchedule] = useState<CalendarSlot[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);
    const [showAddSlotModal, setShowAddSlotModal] = useState(false);
    const [newSlotDate, setNewSlotDate] = useState(''); // ISO Date string for the day being added to
    const [newSlotData, setNewSlotData] = useState({ time: '09:00 AM', duration: 45 });

    // AI Chat State
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState('');

    // Derived State
    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    const filteredNotes = notes.filter(n => n.userId === selectedPatientId).sort((a,b) => b.createdAt - a.createdAt);

    useEffect(() => {
        // TUNNEL VISION: Fetch ONLY assigned patients
        getTherapistPatients(CURRENT_THERAPIST_ID).then(setPatients);
        getTherapyNotes().then(setNotes); 
        getTransactions().then(txs => {
            setTransactions(txs);
            calculateBalances(txs);
        });
        getReviews(CURRENT_THERAPIST_ID).then(setReviews);
        refreshSchedule();
        
        // Mock loading profile data
        setProfile(prev => ({
            ...prev,
            badges: [
                { id: '1', label: '5-Star Healer', icon: '🌟', description: 'Maintain 5.0 Rating', isUnlocked: true },
                { id: '2', label: 'Century Club', icon: '💯', description: 'Complete 100 sessions', isUnlocked: false },
                { id: '3', label: 'Early Bird', icon: '🌅', description: '20 Morning Sessions', isUnlocked: true },
                { id: '4', label: 'Guardian', icon: '🛡️', description: 'Reported high-risk alert', isUnlocked: true },
                { id: '5', label: 'Super Streak', icon: '⚡', description: '30 Days Active', isUnlocked: false },
            ]
        }))
    }, []);

    const refreshSchedule = () => {
        getTherapistSchedule(CURRENT_THERAPIST_ID).then(setSchedule);
    };

    // Check Completion Logic
    useEffect(() => {
        const hasBio = !!profile.bio;
        const hasLink = !!profile.bookingUrl && profile.bookingUrl.startsWith('http');
        const hasBank = !!profile.bankDetails?.accountTitle && !!profile.bankDetails?.iban;
        const hasSpecs = (profile.clinicalSpecializations?.length || 0) > 0;
        
        const complete = hasBio && hasLink && hasBank && hasSpecs;
        setIsProfileComplete(complete);
    }, [profile]);

    const calculateBalances = (txs: Transaction[]) => {
        let available = 0;
        let pending = 0;
        let lifetime = 0;
        const now = Date.now();
        const TWENTY_NINE_DAYS_MS = 29 * 24 * 60 * 60 * 1000;

        txs.forEach(t => {
            // Credits (Sessions)
            if (!t.type || t.type === 'Credit') {
                const txDate = new Date(t.date).getTime();
                const isCleared = (now - txDate) > TWENTY_NINE_DAYS_MS;
                const netAmount = t.therapistPayout; // Net after 20%

                if (t.status === 'Verified') {
                    lifetime += netAmount;
                    if (isCleared) available += netAmount;
                    else pending += netAmount;
                }
            } 
            // Debits (Withdrawals)
            else if (t.type === 'Debit') {
                if (t.status !== 'Rejected') {
                    available -= t.amount;
                }
            }
        });

        setAvailableBalance(Math.max(0, available));
        setPendingBalance(pending);
        setLifetimeEarnings(lifetime);
    };

    const handleWithdraw = async () => {
        const amt = Number(withdrawAmount);
        if (amt <= 0) { alert("Invalid amount."); return; }
        if (amt > availableBalance) { alert("Insufficient available balance."); return; }
        if (!profile.bankDetails?.accountTitle) { alert("Please setup banking details first."); return; }

        await requestPayout(amt, profile.bankDetails);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        alert("Withdrawal Request Submitted. Processing takes 24-48 hours.");
        
        const updatedTxs = await getTransactions();
        setTransactions(updatedTxs);
        calculateBalances(updatedTxs);
    };

    const handleSaveNote = async () => {
        if (!selectedPatientId || !noteDraft.title) return;
        const newNote: TherapyNote = {
            id: crypto.randomUUID(),
            userId: selectedPatientId,
            therapistId: CURRENT_THERAPIST_ID,
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

    const handlePoliteDecline = () => {
        const reason = prompt("Private Reason for decline (Health, Emergency, Burnout):");
        if (reason) {
            alert("System Message Sent to Student:\n\n'Dr. [Name] sends their deepest apologies but must reschedule due to a personal emergency. They have prioritized your next slot.'");
        }
    };

    const handleSaveProfile = async () => {
        await updateTherapistProfile(CURRENT_THERAPIST_ID, profile);
        alert("Profile Updated Successfully.");
    }

    const handleSubmitTicket = async () => {
        if (!ticketData.subject || !ticketData.description) return;
        const ticket: SupportTicket = {
            id: crypto.randomUUID(),
            userId: CURRENT_THERAPIST_ID,
            type: ticketData.type as any,
            subject: ticketData.subject,
            description: ticketData.description,
            status: 'Open',
            timestamp: Date.now(),
            created_at: new Date().toISOString()
        };
        await saveSupportTicket(ticket);
        setShowSupportModal(false);
        setTicketData({ type: 'Bug', subject: '', description: '' });
        alert("Ticket Submitted. Reference: #" + ticket.id.substring(0,6));
    }

    const askClinicalAI = () => {
        if (!aiQuery) return;
        setTimeout(() => {
            setAiResponse("Based on the symptoms described (insomnia, racing thoughts before exams), this suggests Performance Anxiety. Consider recommending Progressive Muscle Relaxation (PMR) before bed and Cognitive Reframing for the 'catastrophic' exam thoughts.");
        }, 1000);
    };

    const getWeekDays = (offset: number) => {
        const today = new Date();
        today.setDate(today.getDate() + (offset * 7));
        const day = today.getDay(); 
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        
        const days = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const handleAddSlot = async () => {
        await addCalendarSlot({
            date: newSlotDate,
            time: newSlotData.time,
            duration: newSlotData.duration,
            status: 'available'
        });
        setShowAddSlotModal(false);
        refreshSchedule();
    };

    const handleDeleteSlot = async (id: string) => {
        if (confirm("Remove this availability slot?")) {
            await deleteCalendarSlot(id);
            refreshSchedule();
        }
    };

    // --- OVERVIEW / HOME COMPONENT ---
    const OverviewView = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysAppointments = schedule.filter(s => s.date === todayStr && (s.status === 'booked' || s.status === 'pending'));
        const nextSession = todaysAppointments.find(s => s.status === 'booked');

        return (
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                {/* 1. Alerts */}
                {!isProfileComplete && (
                    <div className="bg-amber-100 border border-amber-200 rounded-2xl p-6 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">⚠️</span>
                            <div>
                                <h3 className="text-amber-900 font-bold text-lg">Your Profile is Incomplete</h3>
                                <p className="text-amber-800 text-sm">You are currently hidden from the student directory. Complete your setup to accept bookings.</p>
                            </div>
                        </div>
                        <button className="bg-amber-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-800 shadow-lg">Complete Setup</button>
                    </div>
                )}

                {/* 2. Stat Cards Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Next Session */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-48 relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Next Session</h3>
                            {nextSession ? (
                                <>
                                    <div className="text-2xl font-bold text-slate-800 mb-1">{nextSession.time}</div>
                                    <div className="text-teal-600 font-bold text-sm mb-4">with {nextSession.studentName}</div>
                                    <a href={profile.bookingUrl} target="_blank" className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors">Join Meeting</a>
                                </>
                            ) : (
                                <div className="text-slate-400 text-sm mt-4">No sessions scheduled for today.</div>
                            )}
                        </div>
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-teal-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                    </div>

                    {/* Wallet */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-48 relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Wallet Balance</h3>
                            <div className="text-3xl font-bold text-slate-800 mb-1">PKR {availableBalance.toLocaleString()}</div>
                            <div className="text-amber-500 font-medium text-xs mb-4">Pending: PKR {pendingBalance.toLocaleString()}</div>
                            <button className="text-xs font-bold text-slate-400 hover:text-slate-600 underline">View History</button>
                        </div>
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                    </div>

                    {/* Patients */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-48 relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Active Patients</h3>
                            <div className="text-3xl font-bold text-slate-800 mb-1">{patients.length}</div>
                            <div className="text-indigo-500 font-medium text-xs mb-4">+2 New this week</div>
                            <div className="flex -space-x-2">
                                {patients.slice(0, 4).map(p => (
                                    <div key={p.id} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                        {p.name.charAt(0)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                    </div>
                </div>

                {/* 3. Today's Agenda (Wide View) */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Today's Agenda</h2>
                        <span className="text-slate-400 text-sm">{new Date().toLocaleDateString()}</span>
                    </div>
                    
                    {todaysAppointments.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p>You have a clear schedule today.</p>
                            <button className="mt-4 text-teal-600 text-sm font-bold hover:underline">Edit Availability</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {todaysAppointments.map(slot => (
                                <div key={slot.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="text-slate-900 font-bold w-20">{slot.time}</div>
                                        <div className="w-px h-8 bg-slate-200"></div>
                                        <div>
                                            <div className="font-bold text-slate-800">{slot.studentName}</div>
                                            <div className="text-xs text-slate-500">{slot.type || 'Standard Session'} • {slot.duration} mins</div>
                                        </div>
                                    </div>
                                    {slot.status === 'booked' ? (
                                        <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-bold uppercase">Confirmed</span>
                                    ) : (
                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase animate-pulse">Payment Pending</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* NO INTERNAL SIDEBAR - MAIN LAYOUT CONTROLS VIEW */}
            
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative w-full">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 w-full">
                    
                    {/* OVERVIEW (CONTROL CENTER) */}
                    {view === 'overview' && <OverviewView />}

                    {/* SCHEDULE VIEW */}
                    {(view === 'schedule' || view === 'calendar') && (
                        <div className="max-w-7xl mx-auto h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h1 className="text-2xl font-bold text-slate-800">Weekly Calendar</h1>
                                <div className="flex gap-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                                    <button onClick={() => setWeekOffset(weekOffset - 1)} className="px-4 py-2 hover:bg-slate-50 rounded-lg text-slate-600 font-bold">← Prev</button>
                                    <span className="px-4 py-2 text-sm font-bold text-slate-700 border-x border-slate-100 flex items-center">Week {weekOffset === 0 ? 'Current' : (weekOffset > 0 ? `+${weekOffset}` : weekOffset)}</span>
                                    <button onClick={() => setWeekOffset(weekOffset + 1)} className="px-4 py-2 hover:bg-slate-50 rounded-lg text-slate-600 font-bold">Next →</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 gap-4 mb-8">
                                {getWeekDays(weekOffset).map((date, i) => {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const daySlots = schedule.filter(s => s.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
                                    
                                    return (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 min-h-[500px] flex flex-col shadow-sm hover:shadow-md transition-shadow">
                                            <div className="font-bold text-slate-500 mb-4 pb-3 border-b border-slate-100 flex justify-between items-center">
                                                <span className="uppercase tracking-wider text-xs">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                                <span className="text-slate-800 text-lg">{date.getDate()}</span>
                                            </div>
                                            
                                            <div className="space-y-2 flex-1">
                                                {daySlots.map(slot => (
                                                    <div 
                                                        key={slot.id} 
                                                        className={`p-3 rounded-xl border cursor-pointer transition-all group relative ${
                                                            slot.status === 'booked' ? 'bg-teal-50 border-teal-100' : 
                                                            slot.status === 'pending' ? 'bg-amber-50 border-amber-100' : 
                                                            'bg-white border-slate-100 hover:border-teal-300 hover:ring-2 hover:ring-teal-50'
                                                        }`}
                                                    >
                                                        <div className={`text-xs font-bold mb-1 ${slot.status === 'available' ? 'text-slate-600' : 'text-teal-700'}`}>
                                                            {slot.time} <span className="opacity-50 font-normal">({slot.duration}m)</span>
                                                        </div>
                                                        
                                                        {slot.status === 'booked' ? (
                                                            <>
                                                                <div className="text-sm font-bold text-slate-700">{slot.studentName}</div>
                                                                <div className="text-[10px] text-slate-500">{slot.type || 'Session'}</div>
                                                                {/* Actions */}
                                                                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                                                                    <button onClick={handlePoliteDecline} className="w-6 h-6 bg-rose-50 text-rose-500 rounded flex items-center justify-center text-xs hover:bg-rose-100" title="Reschedule / Decline">✕</button>
                                                                    <button onClick={() => alert("Notes")} className="w-6 h-6 bg-slate-50 text-slate-600 rounded flex items-center justify-center text-xs hover:bg-slate-100" title="Notes">📝</button>
                                                                </div>
                                                            </>
                                                        ) : slot.status === 'pending' ? (
                                                            <>
                                                                <div className="text-sm font-bold text-amber-700">{slot.studentName}</div>
                                                                <div className="text-[10px] text-amber-600 animate-pulse">Awaiting Payment</div>
                                                            </>
                                                        ) : (
                                                            <div className="flex justify-between items-center mt-2">
                                                                <span className="text-[10px] uppercase font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">Open</span>
                                                                <button onClick={() => handleDeleteSlot(slot.id)} className="text-slate-300 hover:text-rose-500 text-xs px-2 py-1 hover:bg-rose-50 rounded">×</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <button 
                                                onClick={() => { setNewSlotDate(dateStr); setShowAddSlotModal(true); }}
                                                className="mt-4 w-full py-3 border border-dashed border-slate-300 text-slate-400 text-xs rounded-xl hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-colors font-bold"
                                            >
                                                + Add Slot
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PATIENTS VIEW */}
                    {view === 'patients' && (
                        !selectedPatientId ? (
                            <div className="max-w-7xl mx-auto h-full">
                                <h1 className="text-3xl font-bold text-slate-800 mb-8">Patient Registry</h1>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {patients.map(p => (
                                        <button key={p.id} onClick={() => setSelectedPatientId(p.id)} className="text-left bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-teal-200 transition-all group">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">{p.name.charAt(0)}</div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-lg group-hover:text-teal-700">{p.name}</div>
                                                    <div className="text-xs text-slate-500">{p.age} • {p.gender}</div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{p.profession}</span>
                                                <span className="font-bold text-teal-600">Active</span>
                                            </div>
                                        </button>
                                    ))}
                                    {patients.length === 0 && <div className="col-span-3 text-center text-slate-400 italic py-10">No active patients found.</div>}
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-7xl mx-auto h-full">
                                <button onClick={() => setSelectedPatientId(null)} className="mb-6 text-sm text-slate-500 hover:text-teal-600 font-bold flex items-center gap-2">
                                    <span>←</span> Back to Registry
                                </button>
                                
                                {/* Patient Header */}
                                <div className="flex items-center gap-6 mb-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center text-4xl font-bold text-slate-500">
                                        {selectedPatient?.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h1 className="text-3xl font-bold text-slate-800">{selectedPatient?.name}</h1>
                                            <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Weekly</span>
                                        </div>
                                        <div className="text-slate-500 text-sm font-medium">
                                            {selectedPatient?.age} Years • {selectedPatient?.gender} • {selectedPatient?.profession}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50">
                                            History
                                        </button>
                                        <button className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg">
                                            Message
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-8">
                                    {/* Left Col: Clinical Info */}
                                    <div className="col-span-2 space-y-8">
                                        {/* Clinical Impression */}
                                        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
                                            <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                                                <span>📝</span> Clinical Impression (Private)
                                            </h3>
                                            <textarea 
                                                className="w-full bg-white/50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 placeholder-amber-900/50 outline-none resize-none h-32"
                                                placeholder="Your private notes on personality, triggers, etc..."
                                            />
                                        </div>

                                        {/* AI Insights */}
                                        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl relative overflow-hidden">
                                            <h3 className="font-bold text-indigo-800 mb-4 flex items-center gap-2">
                                                <span>🤖</span> Clinical Co-Pilot
                                            </h3>
                                            
                                            <div className="flex gap-2 mb-4">
                                                <input 
                                                    className="flex-1 p-3 rounded-xl text-sm border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    placeholder="Ask AI about this patient..."
                                                    value={aiQuery}
                                                    onChange={e => setAiQuery(e.target.value)}
                                                />
                                                <button onClick={askClinicalAI} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">Ask</button>
                                            </div>
                                            
                                            {aiResponse ? (
                                                <div className="bg-white p-4 rounded-xl text-sm text-indigo-900 border border-indigo-100 animate-fade-in shadow-sm">
                                                    <strong>AI Suggestion:</strong> {aiResponse}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-indigo-400 italic pl-1">Try: "Summarize recent stress triggers" or "Suggest interventions for anxiety"</div>
                                            )}
                                        </div>

                                        {/* Session Notes History */}
                                        <div>
                                            <h3 className="font-bold text-slate-800 mb-4 text-lg">Session Notes History</h3>
                                            <div className="space-y-4">
                                                {filteredNotes.length === 0 && <div className="text-slate-400 text-sm italic py-4">No notes recorded yet.</div>}
                                                {filteredNotes.map(n => (
                                                    <div key={n.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-xs font-bold text-slate-400 uppercase">{n.dateOfNote}</span>
                                                            <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-600">{n.markType}</span>
                                                        </div>
                                                        <h4 className="font-bold text-slate-800 text-base mb-2">{n.title}</h4>
                                                        <p className="text-slate-600 text-sm leading-relaxed">{n.details}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Col: Add Note */}
                                    <div className="space-y-6">
                                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-6">
                                            <h4 className="font-bold text-slate-800 mb-4 text-lg">Add Session Note</h4>
                                            <input 
                                                className="w-full mb-3 p-3 bg-slate-50 rounded-xl outline-none text-sm border border-slate-100 focus:border-teal-300 transition-colors" 
                                                placeholder="Title / Summary"
                                                value={noteDraft.title}
                                                onChange={e => setNoteDraft({...noteDraft, title: e.target.value})}
                                            />
                                            <select 
                                                className="w-full mb-3 p-3 bg-slate-50 rounded-xl outline-none text-sm border border-slate-100"
                                                value={noteDraft.mark}
                                                onChange={e => setNoteDraft({...noteDraft, mark: e.target.value})}
                                            >
                                                <option>Progress</option><option>Warning</option><option>Needs Follow-up</option>
                                            </select>
                                            <textarea 
                                                className="w-full mb-4 p-3 bg-slate-50 rounded-xl outline-none text-sm h-40 resize-none border border-slate-100 focus:border-teal-300 transition-colors" 
                                                placeholder="Clinical observations..."
                                                value={noteDraft.details}
                                                onChange={e => setNoteDraft({...noteDraft, details: e.target.value})}
                                            />
                                            <button onClick={handleSaveNote} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-transform hover:scale-105">Save Record</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* WALLET VIEW */}
                    {view === 'finance' && (
                        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                            <h1 className="text-3xl font-bold text-slate-800">My Wallet</h1>
                            
                            {/* Summary Cards */}
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-48">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Available for Withdrawal</div>
                                        <div className="text-4xl font-bold text-teal-600">PKR {availableBalance.toLocaleString()}</div>
                                        <div className="text-xs text-slate-400 mt-1">Ready for transfer</div>
                                    </div>
                                    <button 
                                        onClick={() => setShowWithdrawModal(true)} 
                                        disabled={availableBalance === 0 || !isProfileComplete}
                                        className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                    >
                                        Request Payout
                                    </button>
                                </div>

                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-48">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pending Clearance</div>
                                        <div className="text-4xl font-bold text-amber-500">PKR {pendingBalance.toLocaleString()}</div>
                                        <div className="text-xs text-slate-400 mt-1">Held for 29-day security cycle</div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-400 w-1/2 animate-pulse"></div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-lg flex flex-col justify-between h-48 text-white">
                                    <div>
                                        <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">Lifetime Earnings</div>
                                        <div className="text-4xl font-bold">PKR {lifetimeEarnings.toLocaleString()}</div>
                                    </div>
                                    <div className="text-sm font-bold opacity-90 bg-white/20 w-fit px-3 py-1 rounded-lg backdrop-blur-sm">
                                        💎 Platinum Tier
                                    </div>
                                </div>
                            </div>

                            {/* Transactions Table */}
                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-700">Transaction History</h3>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4">Type</th><th className="p-4">Amount</th><th className="p-4">Status</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {transactions.map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50">
                                                <td className="p-4 text-slate-500">{t.date}</td>
                                                <td className="p-4 font-medium text-slate-800">{t.description || 'Transaction'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.type === 'Credit' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>{t.type}</span>
                                                </td>
                                                <td className={`p-4 font-bold ${t.type === 'Credit' ? 'text-teal-600' : 'text-rose-600'}`}>
                                                    {t.type === 'Credit' ? '+' : '-'} {t.type === 'Credit' ? t.therapistPayout.toLocaleString() : t.amount.toLocaleString()}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`flex items-center gap-1 text-xs font-bold ${t.status === 'Verified' || t.status === 'Processed' ? 'text-teal-600' : t.status === 'Pending' ? 'text-amber-600' : 'text-slate-400'}`}>
                                                        {t.status === 'Verified' || t.status === 'Processed' ? '✅' : t.status === 'Pending' ? '⏳' : '•'}
                                                        {t.status === 'Verified' ? 'Cleared' : t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {transactions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No transactions yet.</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {/* Withdrawal Modal */}
                            {showWithdrawModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                                    <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl animate-scale-in">
                                        <h3 className="text-xl font-bold text-slate-800 mb-4">Request Payout</h3>
                                        <p className="text-sm text-slate-500 mb-6">Funds will be sent to your registered {profile.bankDetails?.bankName} account.</p>
                                        
                                        <div className="mb-6">
                                            <label className="block text-xs font-bold text-slate-500 mb-2">Amount (PKR)</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none font-bold text-xl"
                                                placeholder="0.00"
                                                max={availableBalance}
                                                value={withdrawAmount}
                                                onChange={e => setWithdrawAmount(e.target.value)}
                                            />
                                            <div className="text-right text-xs text-slate-400 mt-2">Max: {availableBalance.toLocaleString()}</div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button onClick={() => setShowWithdrawModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
                                            <button onClick={handleWithdraw} className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg">Confirm</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ANALYTICS & REPUTATION VIEW */}
                    {view === 'analytics' && (
                        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                            <h1 className="text-3xl font-bold text-slate-800">Reputation & Reviews</h1>

                            {/* Career Card */}
                            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-200 to-yellow-400 p-1">
                                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-bold text-3xl text-amber-500">
                                            {profile.name?.charAt(0) || 'D'}
                                        </div>
                                    </div>
                                    <div className="mt-3 text-center">
                                        <div className="font-bold text-slate-800 text-lg">Dr. Sarah Khan</div>
                                        <div className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-full uppercase mt-1">Gold Tier</div>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-3 gap-4 text-center w-full">
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <div className="text-2xl font-bold text-indigo-600">{profile.loyaltyPoints?.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Loyalty Points</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <div className="text-2xl font-bold text-teal-600">4.9</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Avg Rating</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <div className="text-2xl font-bold text-rose-600">45</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sessions</div>
                                    </div>
                                </div>
                            </div>

                            {/* Badges */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-4">Trophy Room</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {profile.badges?.map(b => (
                                        <div key={b.id} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${b.isUnlocked ? 'bg-white border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50 grayscale'}`}>
                                            <div className="text-3xl mb-2">{b.icon}</div>
                                            <div className="font-bold text-sm text-slate-800">{b.label}</div>
                                            <div className="text-[10px] text-slate-500 mt-1">{b.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reviews */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-4">Student Reviews</h2>
                                <div className="space-y-4">
                                    {reviews.map(r => (
                                        <div key={r.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">
                                                        {r.studentName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-700">{r.studentName}</div>
                                                        <div className="text-xs text-slate-400">{r.date}</div>
                                                    </div>
                                                </div>
                                                <div className="text-amber-400 text-sm">
                                                    {'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}
                                                </div>
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed mb-4">"{r.feedback}"</p>
                                            <div className="flex gap-3">
                                                <button className="text-xs font-bold text-teal-600 hover:underline">Thank Student</button>
                                                <div className="w-px bg-slate-200"></div>
                                                <button className="text-xs font-bold text-rose-400 hover:text-rose-600 hover:underline">Report</button>
                                            </div>
                                        </div>
                                    ))}
                                    {reviews.length === 0 && <div className="text-center text-slate-400 py-8">No reviews yet.</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PROFILE / SETTINGS VIEW */}
                    {view === 'profile' && (
                        <div className="max-w-4xl mx-auto w-full">
                            <h1 className="text-3xl font-bold text-slate-800 mb-6">Setup Profile</h1>
                            
                            {/* Tabs */}
                            <div className="flex gap-2 mb-8 bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
                                <button onClick={() => setProfileTab('general')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${profileTab === 'general' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>General Profile</button>
                                <button onClick={() => setProfileTab('practice')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${profileTab === 'practice' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Practice & Meeting</button>
                                <button onClick={() => setProfileTab('banking')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${profileTab === 'banking' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Banking & Payouts</button>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                {profileTab === 'general' && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
                                                <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm font-bold" value="Dr. Sarah Khan" readOnly />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email (Locked)</label>
                                                <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm text-slate-400" value="test@sukoon.com" readOnly />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notification Preferences</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1">
                                                    <input type="checkbox" checked={profile.notificationPrefs?.email} onChange={e => setProfile({...profile, notificationPrefs: {...profile.notificationPrefs!, email: e.target.checked}})} className="w-5 h-5 rounded text-teal-600" />
                                                    <span className="text-sm font-medium">Email Alerts (New Bookings)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1">
                                                    <input type="checkbox" checked={profile.notificationPrefs?.sms} onChange={e => setProfile({...profile, notificationPrefs: {...profile.notificationPrefs!, sms: e.target.checked}})} className="w-5 h-5 rounded text-teal-600" />
                                                    <span className="text-sm font-medium">SMS Alerts (Reminders)</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {profileTab === 'practice' && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="grid md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Professional Title</label>
                                                <select className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm font-bold" value={profile.specialty} onChange={e => setProfile({...profile, specialty: e.target.value})}>
                                                    <option value="">Select...</option>
                                                    <option>Clinical Psychologist</option>
                                                    <option>Counselor</option>
                                                    <option>Psychiatrist</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">License Number</label>
                                                <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" value={profile.licenseNumber} onChange={e => setProfile({...profile, licenseNumber: e.target.value})} placeholder="e.g. 12345-X" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Years Exp.</label>
                                                <input type="number" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" value={profile.experience} onChange={e => setProfile({...profile, experience: Number(e.target.value)})} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Default Meeting Link <span className="text-rose-500">*</span></label>
                                            <input 
                                                className={`w-full p-4 bg-slate-50 rounded-xl border outline-none text-sm font-mono text-teal-600 ${!profile.bookingUrl ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-100'}`}
                                                placeholder="https://meet.google.com/abc-xyz-123"
                                                value={profile.bookingUrl}
                                                onChange={e => setProfile({...profile, bookingUrl: e.target.value})}
                                            />
                                            <p className="text-xs text-slate-400 mt-2">This link is automatically sent to students when they book.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Public Bio <span className="text-rose-500">*</span></label>
                                            <textarea 
                                                className={`w-full p-4 bg-slate-50 rounded-xl border outline-none text-sm h-32 resize-none ${!profile.bio ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-100'}`}
                                                placeholder="Write a short, welcoming introduction for students..."
                                                value={profile.bio}
                                                onChange={e => setProfile({...profile, bio: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}

                                {profileTab === 'banking' && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="flex items-center gap-2 mb-4 bg-teal-50 p-3 rounded-lg border border-teal-100 text-teal-800 text-sm">
                                            <span>🟢</span> Payout Status: <strong>Active</strong>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bank Name</label>
                                                <select className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" value={profile.bankDetails?.bankName} onChange={e => setProfile({...profile, bankDetails: {...profile.bankDetails!, bankName: e.target.value}})}>
                                                    <option value="">Select Bank...</option>
                                                    <option>HBL</option><option>Meezan Bank</option><option>EasyPaisa</option><option>JazzCash</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Title</label>
                                                <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" placeholder="Must match ID" value={profile.bankDetails?.accountTitle} onChange={e => setProfile({...profile, bankDetails: {...profile.bankDetails!, accountTitle: e.target.value}})} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">IBAN / Account Number</label>
                                            <input 
                                                className={`w-full p-4 bg-slate-50 rounded-xl border outline-none text-sm font-mono ${!profile.bankDetails?.iban ? 'border-rose-300' : 'border-slate-100'}`}
                                                placeholder="PK00 HABB 0000 0000 0000 0000 0000 0000"
                                                value={profile.bankDetails?.iban}
                                                onChange={e => setProfile({...profile, bankDetails: {...profile.bankDetails!, iban: e.target.value}})}
                                            />
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                                <input type="checkbox" checked readOnly className="w-4 h-4 text-teal-600" />
                                                I agree to the 20% Platform Commission.
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                                <input type="checkbox" checked readOnly className="w-4 h-4 text-teal-600" />
                                                I understand payouts are processed on a 29-Day Rolling Cycle.
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                    <button onClick={handleSaveProfile} className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg transition-transform hover:scale-105">Save Changes</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUPPORT VIEW */}
                    {view === 'support' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-8">
                                <h1 className="text-3xl font-bold text-slate-800">Support Center</h1>
                                <button onClick={() => setShowSupportModal(true)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg flex items-center gap-2">
                                    <span>📩</span> Open New Ticket
                                </button>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 mb-12">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                    <div className="text-2xl mb-2">💰</div>
                                    <h3 className="font-bold text-slate-800">Payout Issues</h3>
                                    <p className="text-xs text-slate-500 mt-1">Payment didn't arrive? Check our 29-day policy first.</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                    <div className="text-2xl mb-2">📅</div>
                                    <h3 className="font-bold text-slate-800">Scheduling</h3>
                                    <p className="text-xs text-slate-500 mt-1">Trouble with calendar slots or double booking?</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                    <div className="text-2xl mb-2">📹</div>
                                    <h3 className="font-bold text-slate-800">Tech Support</h3>
                                    <p className="text-xs text-slate-500 mt-1">Video link errors or dashboard bugs.</p>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-700 mb-4">Frequently Asked Questions</h3>
                            <div className="space-y-3">
                                {[
                                    {q: "When do I get paid?", a: "Payouts are processed 29 days after a session is marked complete."},
                                    {q: "How do I reschedule?", a: "Use the Polite Decline feature in your calendar to offer priority slots."},
                                    {q: "Can I use WhatsApp?", a: "No. Off-platform contact leads to immediate disqualification."}
                                ].map((faq, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200">
                                        <div className="font-bold text-slate-800 text-sm mb-1">{faq.q}</div>
                                        <div className="text-slate-600 text-sm">{faq.a}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RESOURCE PAGES VIEW */}
                    {view === 'code-of-conduct' && <CodeOfConductPage />}
                    {view === 'guidelines' && <ClinicalGuidelinesPage />}
                    {view === 'crisis-protocol' && <CrisisProtocolPage />}
                    {view === 'payout-policy' && <PayoutPolicyPage />}
                    {view === 'non-circumvention' && <NonCircumventionPage />}
                    {view === 'report-incident' && <ReportIncidentPage />}

                </div>

                {/* Footer */}
                <footer className="bg-white border-t border-slate-200 p-8 w-full">
                    <div className="max-w-7xl mx-auto grid grid-cols-4 gap-8 text-xs text-slate-500">
                        <div>
                            <div className="font-bold text-slate-900 text-sm mb-2">Sukoon Professional</div>
                            <p>System Online ● v2.5</p>
                            <p className="mt-1 font-mono">{CURRENT_THERAPIST_ID}</p>
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 mb-2">Practice Resources</div>
                            <ul className="space-y-2">
                                {/* Note: In real app, these would navigation links via App.tsx, here simplified */}
                                <li>Code of Conduct & Ethics</li>
                                <li>Clinical Guidelines</li>
                                <li>Crisis Protocol</li>
                                <li>Payout Policy</li>
                            </ul>
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 mb-2">Legal & Safety</div>
                            <ul className="space-y-2">
                                <li>Terms (Non-Circumvention)</li>
                                <li>Privacy Policy (HIPAA)</li>
                                <li>Report Safety Incident</li>
                            </ul>
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 mb-2">Support Center</div>
                            <p>admin-hotline@sukoon.com</p>
                            <button onClick={() => setShowSupportModal(true)} className="mt-2 text-teal-600 underline">Open Support Ticket</button>
                        </div>
                    </div>
                    <div className="text-center mt-8 text-[10px] text-slate-300">© 2025 Sukoon Health. All Rights Reserved.</div>
                </footer>

                {/* Floating Help Button */}
                <button 
                    onClick={() => { setShowSupportModal(true); }}
                    className="absolute bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold hover:scale-110 transition-transform z-30"
                >
                    ?
                </button>

                {/* Add Slot Modal */}
                {showAddSlotModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl animate-scale-in">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Set Availability</h3>
                            <p className="text-sm text-slate-500 mb-4">Add a slot for {newSlotDate}</p>
                            
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Start Time</label>
                                    <select 
                                        className="w-full p-3 bg-slate-50 rounded-xl outline-none text-sm"
                                        value={newSlotData.time}
                                        onChange={e => setNewSlotData({...newSlotData, time: e.target.value})}
                                    >
                                        <option>09:00 AM</option><option>10:00 AM</option><option>11:00 AM</option>
                                        <option>12:00 PM</option><option>01:00 PM</option><option>02:00 PM</option>
                                        <option>03:00 PM</option><option>04:00 PM</option><option>05:00 PM</option>
                                        <option>06:00 PM</option><option>07:00 PM</option><option>08:00 PM</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Duration</label>
                                    <div className="flex gap-2">
                                        {[30, 45, 60, 90].map(dur => (
                                            <button 
                                                key={dur}
                                                onClick={() => setNewSlotData({...newSlotData, duration: dur})}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${newSlotData.duration === dur ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                                            >
                                                {dur}m
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowAddSlotModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
                                <button onClick={handleAddSlot} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg">Add Slot</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Support Modal */}
                {showSupportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl animate-scale-in">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Submit Request</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Type</label>
                                    <select 
                                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                                        value={ticketData.type}
                                        onChange={e => setTicketData({...ticketData, type: e.target.value})}
                                    >
                                        <option>Bug Report</option>
                                        <option>Feature Request</option>
                                        <option>General Feedback</option>
                                        <option>Billing Issue</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                                    <input 
                                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                                        placeholder="Brief title..."
                                        value={ticketData.subject}
                                        onChange={e => setTicketData({...ticketData, subject: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                    <textarea 
                                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none h-32 resize-none"
                                        placeholder="Please describe the issue..."
                                        value={ticketData.description}
                                        onChange={e => setTicketData({...ticketData, description: e.target.value})}
                                    />
                                </div>
                                <div className="p-3 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 cursor-pointer hover:bg-slate-50">
                                    📎 Upload Screenshot (Optional)
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setShowSupportModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
                                <button onClick={handleSubmitTicket} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg">Send Report</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};
