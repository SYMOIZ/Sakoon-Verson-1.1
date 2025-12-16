
import React, { useState, useEffect } from 'react';
import { getRiskAlerts, getCrisisTherapists, createEmergencySession } from '../../services/dataService';
import { RiskAlert, Therapist } from '../../types';

export const RiskRadar: React.FC = () => {
    const [alerts, setAlerts] = useState<RiskAlert[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
    const [suggestedTherapists, setSuggestedTherapists] = useState<Therapist[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        refreshAlerts();
    }, []);

    const refreshAlerts = async () => {
        setLoading(true);
        const data = await getRiskAlerts();
        setAlerts(data);
        setLoading(false);
    };

    const handleInitiateProtocol = async (alert: RiskAlert) => {
        setSelectedAlert(alert);
        // Fetch Crisis Specialists
        const therapists = await getCrisisTherapists();
        setSuggestedTherapists(therapists);
    };

    const handleConnect = async (therapist: Therapist) => {
        if (!selectedAlert) return;
        setProcessingId(therapist.id);
        
        await createEmergencySession(selectedAlert.id, selectedAlert.studentId, therapist.id);
        
        alert(`PROTOCOL ACTIVE: ${selectedAlert.studentName} has been connected to Dr. ${therapist.name}.`);
        setProcessingId(null);
        setSelectedAlert(null);
        refreshAlerts();
    };

    return (
        <div className="space-y-6 animate-fade-in relative h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center bg-rose-50 p-6 rounded-2xl border border-rose-100">
                <div>
                    <h1 className="text-2xl font-bold text-rose-800 flex items-center gap-3">
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                        </span>
                        Risk Radar & Crisis Protocol
                    </h1>
                    <p className="text-rose-600 text-sm mt-1">Monitoring for high-risk keywords and safety triggers.</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-rose-700">{alerts.length}</div>
                    <div className="text-xs font-bold uppercase tracking-wider text-rose-400">Active Threats</div>
                </div>
            </div>

            {/* Radar List */}
            <div className="flex-1 bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-700 overflow-hidden relative">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Scanning...</div>
                ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="text-4xl mb-4">🛡️</div>
                        <p>System Clear. No active risks detected.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-rose-50 text-rose-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Student</th>
                                <th className="p-4">Trigger</th>
                                <th className="p-4">Detected</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-50">
                            {alerts.map(alert => (
                                <tr key={alert.id} className="hover:bg-rose-50/50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800 dark:text-white">{alert.studentName}</td>
                                    <td className="p-4">
                                        <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-md font-mono text-xs border border-rose-200">
                                            "{alert.triggerKeyword}"
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs">
                                        {new Date(alert.detectedAt).toLocaleTimeString()}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-rose-600 font-bold text-xs uppercase animate-pulse">Critical</span>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => handleInitiateProtocol(alert)}
                                            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-rose-700 hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <span>🚨</span> Initiate Protocol
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Emergency Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-900/90 backdrop-blur-md p-4 animate-scale-in">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-rose-500">
                        {/* Header */}
                        <div className="bg-rose-600 p-6 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
                                    ⚠️ Critical Intervention
                                </h2>
                                <p className="opacity-90 text-sm">Iron Dome Protocol Initiated</p>
                            </div>
                            <button onClick={() => setSelectedAlert(null)} className="text-rose-200 hover:text-white text-2xl font-bold">×</button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Analysis */}
                            <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="block text-xs font-bold text-rose-400 uppercase">Student</span>
                                        <span className="text-lg font-bold text-slate-800">{selectedAlert.studentName}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-rose-400 uppercase">Trigger</span>
                                        <span className="text-lg font-bold text-rose-600">"{selectedAlert.triggerKeyword}"</span>
                                    </div>
                                </div>
                            </div>

                            {/* Specialist Selection */}
                            <div>
                                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <span>⚡</span> Auto-Suggested Specialists (Online)
                                </h3>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {suggestedTherapists.length === 0 && (
                                        <div className="text-center py-4 text-slate-400 italic">
                                            No certified crisis specialists are currently online.
                                            <br/>
                                            <span className="text-rose-500 font-bold">Manual Intervention Required.</span>
                                        </div>
                                    )}
                                    {suggestedTherapists.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 hover:border-teal-500 rounded-xl transition-all shadow-sm group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold">
                                                    {t.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{t.name}</div>
                                                    <div className="text-xs text-slate-500">{t.specialty} • {t.experience} Yrs Exp</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleConnect(t)}
                                                disabled={processingId === t.id}
                                                className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg group-hover:bg-teal-600 transition-colors shadow-lg disabled:opacity-50"
                                            >
                                                {processingId === t.id ? 'Connecting...' : '⚡ Connect Immediately'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="text-xs text-center text-slate-400">
                                This action overrides the therapist's schedule and creates an instant booking.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
