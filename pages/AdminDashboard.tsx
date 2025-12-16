
import React, { useState, useEffect } from 'react';
import { getAdminStats, getTherapists, getTherapistApplications, approveTherapistApplication, rejectTherapistApplication, deleteTherapist, getAdminUsers, getAdminAlerts, resolveAlert, getTransactions, getInvestments, addInvestment, deleteInvestment, updateInvestment, addTransaction, deleteTransaction, getChatThreads, getSystemHealth, suspendUser, getMonetizationSettings, updateMonetizationSettings, getTherapistConnections, breakConnection, sendSystemBlast, getSystemNotifications, getBroadcastHistory, assignTherapist, getRecommendedTherapists, sendIntervention, getTeamMembers, addTeamMember, revokeTeamAccess, updateTeamMemberStatus, getPayoutRequests, processPayout, getCompanyExpenses, addCompanyExpense, recordManualPayout } from '../services/dataService';
import { AdminStats, Therapist, AdminUserView, AdminAlert, Transaction, Investment, ChatThread, SystemHealth, MonetizationConfig, TherapistConnection, SystemNotification, TherapistApplication, Broadcast, TeamMember, TeamRole, TeamPermissions, PayoutRequest, CompanyExpense } from '../types';
import { TherapistInspector } from '../components/TherapistInspector';
import { SearchableSelect } from '../components/SearchableSelect';
import { AdminSupport } from './admin/Support';
import { AdminMessages } from './admin/Messages';
import { RiskRadar } from '../components/admin/RiskRadar';
import { AddTeamModal } from '../components/admin/modals/AddTeamModal';
import { ManualAssignModal } from '../components/admin/modals/ManualAssignModal';
import { FinanceDashboard } from './admin/Finance';

// --- UTILS ---
interface StatCardProps { label: string; value: string | number; sub: string; color?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, color = "teal" }) => (
    <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-navy-700">
        <div className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">{label}</div>
        <div className={`text-3xl font-sans font-bold text-${color}-600 dark:text-white mb-1`}>{value}</div>
        <div className={`text-xs text-${color}-500 font-medium`}>{sub}</div>
    </div>
);

// --- VIEWS ---

const UsersView = ({ users, onRefresh }: { users: AdminUserView[], onRefresh: () => void }) => {
    // ... existing code ...
    const handleSuspend = async (id: string, name: string) => {
        if(confirm(`Are you sure you want to suspend ${name}?`)) {
            await suspendUser(id, "Admin Action");
            onRefresh();
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">User Management</h1>
                <div className="text-sm text-slate-500">{users.length} Registered Users</div>
            </div>
            <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">User Details</th>
                            <th className="p-4">Demographics</th>
                            <th className="p-4">Risk Status</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800 dark:text-white">{u.name}</div>
                                    <div className="text-xs text-slate-400">{u.email}</div>
                                </td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">
                                    {u.age} y/o • {u.gender} • {u.region}
                                </td>
                                <td className="p-4">
                                    {u.riskLevel === 'critical' ? (
                                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700 animate-pulse">Critical</span>
                                    ) : u.riskLevel === 'moderate' ? (
                                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">Moderate</span>
                                    ) : (
                                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500">Low</span>
                                    )}
                                </td>
                                <td className="p-4">
                                     <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {u.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {u.status === 'active' && (
                                        <button onClick={() => handleSuspend(u.id, u.name)} className="text-rose-500 hover:text-rose-700 font-bold text-xs border border-rose-200 px-3 py-1 rounded hover:bg-rose-50">Suspend</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TherapistsView = ({ therapists, applications, onRefresh }: { therapists: Therapist[], applications: TherapistApplication[], onRefresh: () => void }) => {
    // ... existing code ...
    const [tab, setTab] = useState<'active' | 'pending'>('active');
    const [inspectingTherapist, setInspectingTherapist] = useState<Therapist | null>(null);

    const handleApprove = async (id: string) => {
        const app = applications.find(a => a.userId === id) || therapists.find(t => t.id === id);
        if (app) {
            await approveTherapistApplication(app as any);
            setInspectingTherapist(null);
            onRefresh();
        }
    };

    const handleReject = async (id: string) => {
        await rejectTherapistApplication(id);
        setInspectingTherapist(null);
        onRefresh();
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
             {inspectingTherapist && (
                 <TherapistInspector 
                    therapist={inspectingTherapist} 
                    onClose={() => setInspectingTherapist(null)} 
                    onApprove={inspectingTherapist.status !== 'LIVE' ? handleApprove : undefined}
                    onReject={inspectingTherapist.status !== 'LIVE' ? handleReject : undefined}
                 />
             )}

             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Therapist Network</h1>
                <div className="flex bg-white dark:bg-navy-800 rounded-lg border border-slate-200 dark:border-navy-700 p-1">
                    <button onClick={() => setTab('active')} className={`px-4 py-2 text-sm font-bold rounded-md ${tab === 'active' ? 'bg-slate-100 dark:bg-navy-700 text-slate-800 dark:text-white' : 'text-slate-500'}`}>Active ({therapists.length})</button>
                    <button onClick={() => setTab('pending')} className={`px-4 py-2 text-sm font-bold rounded-md ${tab === 'pending' ? 'bg-slate-100 dark:bg-navy-700 text-slate-800 dark:text-white' : 'text-slate-500'}`}>Pending ({applications.length})</button>
                </div>
            </div>

            {tab === 'active' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {therapists.map(t => (
                        <div 
                            key={t.id} 
                            onClick={() => setInspectingTherapist(t)}
                            className="bg-white dark:bg-navy-800 p-6 rounded-2xl border border-slate-200 dark:border-navy-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 relative z-10">{t.name[0]}</div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white">{t.name}</div>
                                    <div className="text-xs text-teal-600">{t.specialty}</div>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 mb-4">{t.experience} Years Exp • {t.languages.join(', ')}</div>
                            <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${t.status === 'LIVE' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {t.status}
                                </span>
                                {t.isCrisisCertified && <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-rose-100 text-rose-700 border border-rose-200">Crisis Certified</span>}
                            </div>
                            
                            {/* "Incomplete" Indicator */}
                            {t.status !== 'LIVE' && (
                                <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-[9px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                                    SETUP INCOMPLETE
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.map(app => (
                        <div key={app.id} className="bg-white dark:bg-navy-800 p-6 rounded-2xl border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{app.fullName}</h3>
                                <div className="text-sm text-slate-500">{app.email} • {app.phone}</div>
                                <div className="mt-2 text-xs text-slate-400">EXP: {app.yearsExperience} Years • CV: {app.cvFileName}</div>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setInspectingTherapist({
                                        ...app as any, 
                                        name: app.fullName, 
                                        languages: ['English'], 
                                        specialty: app.specialization,
                                        experience: app.yearsExperience,
                                        status: 'PENDING'
                                    })} 
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2"
                                >
                                    <span>🔍</span> Review Application
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ConnectionsView = () => {
    // ... existing code ...
    const [connections, setConnections] = useState<TherapistConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);

    useEffect(() => {
        refresh();
    }, []);

    const refresh = async () => {
        setLoading(true);
        const data = await getTherapistConnections();
        setConnections(data);
        setLoading(false);
    };

    const handleAssignSubmit = async (data: any) => {
        await assignTherapist(data);
        alert("Assignment Successful. The student has been notified.");
        refresh();
    };

    const handleBreakConnection = async (id: string, clientName: string) => {
        if(confirm(`⚠️ WARNING: Severing this connection will unassign the therapist from ${clientName}. This cannot be undone. Proceed?`)) {
            await breakConnection(id);
            refresh();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col relative">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Active Connections</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowAssignModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <span>+</span> Assign Manually
                    </button>
                    <div className="bg-slate-100 dark:bg-navy-700 px-4 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center">
                        Total: {connections.length} Pairs
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-700 overflow-hidden flex-1">
                {loading ? (
                    <div className="flex justify-center items-center h-full text-slate-400">Loading connections...</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Student</th>
                                <th className="p-4">Therapist</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Stats</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                            {connections.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 dark:text-white">{c.clientName}</div>
                                        <div className="text-xs text-slate-400">ID: {c.clientId}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 dark:text-white">{c.therapistName}</div>
                                        <div className="text-xs text-slate-400">ID: {c.therapistId}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${c.status === 'ACTIVE' ? 'bg-teal-100 text-teal-800' : c.status === 'DISPUTED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-slate-500">
                                        <div>{c.totalSessions} Sessions</div>
                                        <div>Last: {c.lastMeeting}</div>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => handleBreakConnection(c.id, c.clientName)}
                                            className="text-rose-500 hover:text-rose-700 font-bold text-xs border border-rose-200 px-3 py-1.5 rounded hover:bg-rose-50 transition-colors"
                                        >
                                            Sever Connection
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {connections.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-slate-400">No active student-therapist links found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {showAssignModal && (
                <ManualAssignModal 
                    onClose={() => setShowAssignModal(false)}
                    onSubmit={handleAssignSubmit}
                />
            )}
        </div>
    );
};

const TeamAccessView = () => {
    // ... existing code ...
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        refresh();
    }, []);

    const refresh = async () => {
        const data = await getTeamMembers();
        setMembers(data);
    };

    const handleAddSubmit = async (data: any) => {
        // Map form data to TeamMember structure
        const permissions: TeamPermissions = { users: 'read', therapists: 'read', finance: 'none', chat: 'none', system: 'locked' };
        if (data.role === 'Super Admin') {
            permissions.users = 'full'; permissions.therapists = 'full'; permissions.finance = 'full'; permissions.chat = 'full';
        } else if (data.role === 'Accountant') {
            permissions.finance = 'full'; permissions.users = 'none';
        }

        await addTeamMember({
            id: '', // Generated in service
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.isActive ? 'Active' : 'Suspended',
            is_active: data.isActive,
            access_expires_at: data.access_expires_at,
            lastLogin: Date.now(),
            addedAt: Date.now(),
            permissions,
            password: data.password // passed to mock auth creator
        });
        refresh();
    };

    const handleRevoke = async (id: string) => {
        if (confirm("Permanently revoke access for this team member?")) {
            await revokeTeamAccess(id);
            refresh();
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
        await updateTeamMemberStatus(id, newStatus);
        refresh();
    };

    const getRoleBadge = (role: TeamRole) => {
        switch(role) {
            case 'Super Admin': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Accountant': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Moderator': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const formatExpiry = (isoString?: string | null) => {
        if (!isoString) return null;
        const date = new Date(isoString);
        const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? `${diff} days left` : 'Expired';
    };

    return (
        <div className="space-y-8 animate-fade-in relative">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Team Access</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage staff roles, time-limited access, and permissions.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                    <span>+</span> Invite Member
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map(m => {
                    const daysLeft = formatExpiry(m.access_expires_at);
                    const isExpired = daysLeft === 'Expired' || m.status === 'Expired';
                    
                    return (
                        <div key={m.id} className={`bg-white dark:bg-navy-800 p-6 rounded-2xl border shadow-sm flex flex-col justify-between h-56 transition-all ${isExpired ? 'border-rose-200 dark:border-rose-900/30 opacity-75' : 'border-slate-200 dark:border-navy-700'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getRoleBadge(m.role)}`}>
                                        {m.role}
                                    </span>
                                    <button onClick={() => handleRevoke(m.id)} className="text-slate-300 hover:text-rose-500 text-lg" title="Delete User">×</button>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                    {m.name}
                                    {m.access_expires_at && !isExpired && <span className="text-amber-500 text-xs" title={`Access expires in ${daysLeft}`}>🕒</span>}
                                </h3>
                                <p className="text-xs text-slate-500">{m.email}</p>
                                
                                {m.access_expires_at && (
                                    <div className={`mt-2 text-[10px] font-mono font-bold px-2 py-1 rounded w-fit ${isExpired ? 'bg-rose-100 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {isExpired ? 'ACCESS EXPIRED' : `Expires: ${new Date(m.access_expires_at).toLocaleDateString()}`}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-4 text-[10px] text-slate-400 font-mono">
                                    <span>Last Login: {new Date(m.lastLogin).toLocaleDateString()}</span>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                    <div className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${m.status === 'Active' ? 'bg-teal-500' : isExpired ? 'bg-rose-500' : 'bg-slate-400'}`}></div>
                                        <span className={m.status === 'Active' ? 'text-teal-500' : isExpired ? 'text-rose-500' : 'text-slate-500'}>{m.status}</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleToggleStatus(m.id, m.status)}
                                        disabled={isExpired}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${m.status === 'Active' ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-teal-200 text-teal-600 hover:bg-teal-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {m.status === 'Active' ? 'Suspend' : 'Activate'}
                                    </button>
                                    <button className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Edit</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Invite Modal */}
            {showModal && (
                <AddTeamModal 
                    onClose={() => setShowModal(false)}
                    onSubmit={handleAddSubmit}
                />
            )}
        </div>
    );
};

const MonetizationView = () => <div className="text-center p-10 text-slate-400">Monetization Module (Unchanged)</div>;
const NotificationsView = () => <div className="text-center p-10 text-slate-400">Notifications Module (Unchanged)</div>;

const DashboardHome = ({ stats, health, alerts, onRefreshAlerts, onNavigateRisk }: { stats: AdminStats | null, health: SystemHealth | null, alerts: AdminAlert[], onRefreshAlerts: () => void, onNavigateRisk: () => void }) => {
    // ... existing code ...
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Total Users" value={stats?.totalUsers || 0} sub="+12% this week" />
                <StatCard label="Active Today" value={stats?.activeUsersToday || 0} sub="Real-time count" color="indigo" />
                <StatCard label="Sessions Held" value={stats?.totalSessions || 0} sub="Avg Duration: 45m" color="amber" />
                <StatCard label="System Health" value={health?.status || 'Unknown'} sub={`Errors: ${health?.apiErrors || 0}`} color={health?.status === 'Healthy' ? 'teal' : 'rose'} />
            </div>

            {/* Risk Banner */}
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900 p-6 rounded-2xl flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2">
                        <span className="animate-pulse">🚨</span> Risk Radar Active
                    </h2>
                    <p className="text-sm text-rose-600 dark:text-rose-300 mt-1">Monitor high-risk students and initiate protocols.</p>
                </div>
                <button onClick={onNavigateRisk} className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg hover:bg-rose-700 hover:scale-105 transition-all">
                    Open Radar
                </button>
            </div>

            {/* Alerts Section */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recent Flags</h2>
                    <div className="space-y-4">
                        {alerts.slice(0, 3).map(alert => (
                            <div key={alert.id} className="p-4 bg-slate-50 dark:bg-navy-900 border-l-4 border-amber-500 rounded-r-xl">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-amber-700 uppercase">{alert.type}</span>
                                    <span className="text-xs text-slate-400">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white mb-1">User: {alert.userName}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">"{alert.message}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface AdminDashboardProps {
  currentView: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentView }) => {
  // Local state to handle internal navigation if needed, though mostly props driven
  const [internalView, setInternalView] = useState(currentView);
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [applications, setApplications] = useState<TherapistApplication[]>([]);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  const refreshData = async () => {
        try {
            const [s, t, app, u, a, h] = await Promise.all([
                getAdminStats(),
                getTherapists(),
                getTherapistApplications(),
                getAdminUsers(),
                getAdminAlerts(),
                getSystemHealth()
            ]);
            setStats(s); setTherapists(t); setApplications(app); setUsers(u); setAlerts(a); setSystemHealth(h);
        } catch (e) {
            console.error("Dashboard Load Error", e);
        }
  };

  useEffect(() => {
    setLoading(true);
    refreshData().finally(() => setLoading(false));
    setInternalView(currentView);
  }, [currentView]);

  const renderContent = () => {
      if (loading) return <div className="flex items-center justify-center h-full text-slate-400">Loading System...</div>;

      // Special Override for Risk Radar if triggered internally
      if (internalView === 'risk-radar') return <RiskRadar />;

      switch(internalView) {
          case 'admin-users': return <UsersView users={users} onRefresh={refreshData} />;
          case 'admin-therapists': return <TherapistsView therapists={therapists} applications={applications} onRefresh={refreshData} />;
          case 'admin-analytics': return <DashboardHome stats={stats} health={systemHealth} alerts={alerts} onRefreshAlerts={refreshData} onNavigateRisk={() => setInternalView('risk-radar')} />; 
          case 'admin-finance': return <FinanceDashboard />; // New Finance Dashboard
          case 'admin-chat': return <AdminMessages />; 
          case 'admin-messages': return <AdminMessages />; 
          case 'admin-support': return <AdminSupport />; 
          case 'admin-connections': return <ConnectionsView />;
          case 'admin-monetization': return <MonetizationView />;
          case 'admin-notifications': return <NotificationsView />;
          case 'admin-team': return <TeamAccessView />;
          case 'admin-dashboard': return <DashboardHome stats={stats} health={systemHealth} alerts={alerts} onRefreshAlerts={refreshData} onNavigateRisk={() => setInternalView('risk-radar')} />;
          default: return <DashboardHome stats={stats} health={systemHealth} alerts={alerts} onRefreshAlerts={refreshData} onNavigateRisk={() => setInternalView('risk-radar')} />;
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-navy-900">
        <div className="bg-rose-600 text-white px-6 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center shadow-md z-10">
            <span>Admin Mode — Business Analytics Only</span>
            <div className="flex gap-4">
                 <span className={systemHealth?.status === 'Healthy' ? 'text-white' : 'text-amber-200 animate-pulse'}>
                     System: {systemHealth?.status || 'Unknown'}
                 </span>
                 <span>{new Date().toLocaleDateString()}</span>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-12">
            {renderContent()}
        </div>
    </div>
  );
};
