
import React, { useState, useEffect } from 'react';
import { getFinanceStats, getMarketingExpenses, addMarketingExpense, getPayoutRequests, processPayout } from '../../services/dataService';
import { FinanceStats, MarketingExpense, PayoutRequest } from '../../types';

// Simple SVG Line Chart Component
const RevenueChart = () => (
    <div className="relative h-48 w-full">
        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-300">
            <div className="border-b border-slate-100 w-full h-0"></div>
            <div className="border-b border-slate-100 w-full h-0"></div>
            <div className="border-b border-slate-100 w-full h-0"></div>
            <div className="border-b border-slate-100 w-full h-0"></div>
        </div>
        
        {/* The Line */}
        <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none">
            <path 
                d="M0 150 C 50 140, 100 100, 150 110 S 250 80, 300 60 S 400 90, 500 40 S 600 20, 800 10" 
                fill="none" 
                stroke="#0d9488" 
                strokeWidth="3" 
                strokeLinecap="round"
            />
            {/* Gradient Fill under line */}
            <path 
                d="M0 150 C 50 140, 100 100, 150 110 S 250 80, 300 60 S 400 90, 500 40 S 600 20, 800 10 V 200 H 0 Z" 
                fill="url(#gradient)" 
                opacity="0.1"
            />
            <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                </linearGradient>
            </defs>
        </svg>

        {/* Data Points */}
        <div className="absolute top-[10px] right-0 bg-teal-600 text-white text-[10px] px-2 py-1 rounded-lg shadow-lg font-bold">
            Today: 45k
        </div>
    </div>
);

// --- Payout Modal Component ---
const PayoutQueueModal = ({ onClose }: { onClose: () => void }) => {
    const [requests, setRequests] = useState<PayoutRequest[]>([]);
    const [filter, setFilter] = useState<'Pending' | 'Processed' | 'All'>('Pending');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        const data = await getPayoutRequests();
        setRequests(data);
        setLoading(false);
    };

    const handleAction = async (id: string, action: 'Processed' | 'Rejected') => {
        if (action === 'Rejected' && !confirm("Are you sure you want to reject this payout? This will refund the wallet.")) return;
        
        await processPayout(id, action);
        load(); // Refresh list
    };

    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);

    const filteredRequests = filter === 'All' ? requests : requests.filter(r => r.status === filter);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-navy-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-700 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-navy-800 flex justify-between items-center bg-slate-50 dark:bg-navy-950">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Payout Queue</h3>
                        <p className="text-xs text-slate-500">Manage therapist withdrawals.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-2xl font-bold">×</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-navy-800 bg-white dark:bg-navy-900 px-6 py-2 gap-4">
                    <button 
                        onClick={() => setFilter('Pending')}
                        className={`py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${filter === 'Pending' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Pending Requests
                        <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full">{requests.filter(r => r.status === 'Pending').length}</span>
                    </button>
                    <button 
                        onClick={() => setFilter('Processed')}
                        className={`py-2 text-sm font-bold border-b-2 transition-colors ${filter === 'Processed' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Processed History
                    </button>
                    <button 
                        onClick={() => setFilter('All')}
                        className={`py-2 text-sm font-bold border-b-2 transition-colors ${filter === 'All' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        All Records
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-navy-900 p-6">
                    {loading ? (
                        <div className="text-center text-slate-400 py-10">Loading payouts...</div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="text-center text-slate-400 py-20 flex flex-col items-center">
                            <div className="text-4xl mb-2">💸</div>
                            <p>No {filter.toLowerCase()} payout requests found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRequests.map(req => (
                                <div key={req.id} className="bg-white dark:bg-navy-800 p-4 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-navy-700 rounded-full flex items-center justify-center font-bold text-slate-500 text-xs">
                                            {req.therapistName?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-white">{req.therapistName}</div>
                                            <div className="text-xs text-slate-500 font-mono">{req.therapistId} • {new Date(req.requestDate).toLocaleDateString()}</div>
                                            <div className="text-[10px] text-teal-600 mt-1 font-medium bg-teal-50 dark:bg-navy-950 px-2 py-0.5 rounded w-fit">{req.method}</div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xl font-bold text-slate-800 dark:text-white">{formatCurrency(req.amount)}</div>
                                        <div className={`text-[10px] font-bold uppercase ${req.status === 'Pending' ? 'text-amber-500 animate-pulse' : req.status === 'Processed' ? 'text-teal-500' : 'text-rose-500'}`}>
                                            {req.status}
                                        </div>
                                    </div>

                                    {req.status === 'Pending' && (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleAction(req.id, 'Rejected')}
                                                className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Reject
                                            </button>
                                            <button 
                                                onClick={() => handleAction(req.id, 'Processed')}
                                                className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-xs font-bold shadow-md transition-colors"
                                            >
                                                Approve Transfer
                                            </button>
                                        </div>
                                    )}
                                    {req.status !== 'Pending' && (
                                        <div className="text-xs text-slate-400 italic px-4">
                                            {req.status === 'Processed' ? 'Transfer Complete' : 'Request Returned'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const FinanceDashboard: React.FC = () => {
    const [stats, setStats] = useState<FinanceStats | null>(null);
    const [expenses, setExpenses] = useState<MarketingExpense[]>([]);
    const [newExpense, setNewExpense] = useState({ platform: 'Facebook', amount: '', description: '' });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPayoutModal, setShowPayoutModal] = useState(false);

    useEffect(() => {
        refresh();
    }, []);

    const refresh = async () => {
        const [s, e] = await Promise.all([getFinanceStats(), getMarketingExpenses()]);
        setStats(s);
        setExpenses(e);
    };

    const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.description) return;
        await addMarketingExpense({
            platform: newExpense.platform as any,
            amount: Number(newExpense.amount),
            description: newExpense.description
        });
        setNewExpense({ platform: 'Facebook', amount: '', description: '' });
        setShowAddModal(false);
        refresh();
    };

    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);

    if (!stats) return <div className="p-10 text-center text-slate-400">Loading Financial Data...</div>;

    const budgetTotal = 50000; // Mock Budget
    const budgetUsedPercent = Math.min(100, (stats.marketing / budgetTotal) * 100);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Finance & Analytics</h1>
                    <p className="text-slate-500 text-sm mt-1">Platform health, P&L, and expense tracking.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300">
                        📥 Export CSV
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 shadow-lg">
                        + Add Expense
                    </button>
                </div>
            </div>

            {/* SECTION A: High-Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl border border-slate-200 dark:border-navy-700 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Revenue</div>
                        <div className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(stats.revenue)}</div>
                        <div className="text-xs text-teal-600 font-bold mt-2">↑ 12% vs last month</div>
                    </div>
                    <div className="absolute right-0 top-0 w-24 h-24 bg-slate-50 dark:bg-navy-700 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                </div>

                <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl border border-slate-200 dark:border-navy-700 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Platform Profit (20%)</div>
                        <div className="text-3xl font-bold text-teal-600">{formatCurrency(stats.profit)}</div>
                        <div className="text-xs text-slate-400 mt-2">Before expenses</div>
                    </div>
                    <div className="absolute right-0 top-0 w-24 h-24 bg-teal-50 dark:bg-teal-900/20 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                </div>

                <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl border border-slate-200 dark:border-navy-700 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Marketing Spend</div>
                        <div className="text-3xl font-bold text-rose-500">{formatCurrency(stats.marketing)}</div>
                        <div className="text-xs text-slate-400 mt-2">{budgetUsedPercent.toFixed(0)}% of monthly budget</div>
                    </div>
                    <div className="absolute right-0 top-0 w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Profit</div>
                        <div className="text-3xl font-bold">{formatCurrency(stats.net_income)}</div>
                        <div className="text-xs text-emerald-400 font-bold mt-2">Liquid Cash</div>
                    </div>
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-teal-500 blur-[60px] opacity-20"></div>
                </div>
            </div>

            {/* SECTION B: Charts & Leaderboards */}
            <div className="grid md:grid-cols-3 gap-8">
                {/* Revenue Chart */}
                <div className="md:col-span-2 bg-white dark:bg-navy-800 p-8 rounded-3xl border border-slate-200 dark:border-navy-700 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Revenue Trend</h3>
                        <select className="bg-slate-50 dark:bg-navy-950 border-none text-xs font-bold text-slate-500 rounded-lg p-2">
                            <option>This Month</option>
                            <option>Last 3 Months</option>
                        </select>
                    </div>
                    <RevenueChart />
                </div>

                {/* Top Performers (Leaderboard) */}
                <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl border border-slate-200 dark:border-navy-700 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">🏆 Top Performers</h3>
                    
                    <div className="space-y-6">
                        {/* Therapist */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shadow-sm">🩺</div>
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase">Top Therapist</div>
                                <div className="font-bold text-slate-800 dark:text-white">{stats.top_therapist.name}</div>
                                <div className="text-xs text-teal-600 font-bold">Generates {formatCurrency(stats.top_therapist.total)}</div>
                            </div>
                        </div>

                        {/* Student */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl shadow-sm">🎓</div>
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase">Top Student</div>
                                <div className="font-bold text-slate-800 dark:text-white">{stats.top_student.name}</div>
                                <div className="text-xs text-indigo-500 font-bold">Spent {formatCurrency(stats.top_student.total)}</div>
                            </div>
                        </div>

                        {/* Activity */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl shadow-sm">🔥</div>
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase">Most Active</div>
                                <div className="font-bold text-slate-800 dark:text-white">{stats.most_active.name}</div>
                                <div className="text-xs text-rose-500 font-bold">{stats.most_active.sessions} Sessions</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION C: Payout Management */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl border border-slate-200 dark:border-navy-700 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">Payout Liabilities</h3>
                    
                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex-1 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900">
                            <div className="text-xs text-amber-700 font-bold uppercase mb-1">Pending Clearance</div>
                            <div className="text-2xl font-bold text-amber-800 dark:text-amber-500">{formatCurrency(stats.pending_payouts)}</div>
                            <div className="text-xs text-amber-600 mt-1">Held for 29 days</div>
                        </div>
                        <div className="flex-1 p-4 bg-teal-50 dark:bg-teal-900/10 rounded-2xl border border-teal-100 dark:border-teal-900">
                            <div className="text-xs text-teal-700 font-bold uppercase mb-1">Cleared for Pay</div>
                            <div className="text-2xl font-bold text-teal-800 dark:text-teal-500">{formatCurrency(stats.cleared_payouts)}</div>
                            <div className="text-xs text-teal-600 mt-1">Ready for transfer</div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setShowPayoutModal(true)}
                        className="w-full py-3 border border-slate-200 dark:border-navy-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-navy-700"
                    >
                        View Detailed Payout Queue →
                    </button>
                </div>

                {/* SECTION D: Marketing Budget Tracker */}
                <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Marketing Budget</h3>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-navy-700 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">
                            Limit: {formatCurrency(budgetTotal)}
                        </span>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                            <span>Used: {formatCurrency(stats.marketing)}</span>
                            <span>{budgetUsedPercent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-navy-950 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${budgetUsedPercent > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${budgetUsedPercent}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 max-h-48 pr-2">
                        {expenses.map(exp => (
                            <div key={exp.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-navy-950 rounded-xl border border-slate-100 dark:border-navy-800">
                                <div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{exp.platform}</div>
                                    <div className="text-xs text-slate-400">{exp.description}</div>
                                </div>
                                <div className="text-sm font-bold text-slate-800 dark:text-white">
                                    - {formatCurrency(exp.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-scale-in">
                    <div className="bg-white dark:bg-navy-900 w-full max-w-sm p-8 rounded-3xl shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Log Expense</h2>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Platform</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 dark:bg-navy-950 rounded-xl outline-none border border-slate-200 dark:border-navy-800"
                                    value={newExpense.platform}
                                    onChange={e => setNewExpense({...newExpense, platform: e.target.value})}
                                >
                                    <option>Facebook</option><option>Google</option><option>Instagram</option><option>Influencer</option><option>Server</option><option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount (PKR)</label>
                                <input 
                                    type="number"
                                    className="w-full p-3 bg-slate-50 dark:bg-navy-950 rounded-xl outline-none border border-slate-200 dark:border-navy-800"
                                    value={newExpense.amount}
                                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <input 
                                    className="w-full p-3 bg-slate-50 dark:bg-navy-950 rounded-xl outline-none border border-slate-200 dark:border-navy-800"
                                    value={newExpense.description}
                                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
                            <button onClick={handleAddExpense} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {showPayoutModal && <PayoutQueueModal onClose={() => setShowPayoutModal(false)} />}
        </div>
    );
};
