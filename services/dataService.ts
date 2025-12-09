

import { Therapist, AdminStats, AdminUserView, AdminAlert, AdminReport, TherapyNote, BugReport, UserFeedback, CheckInEvent, SafetyCase, AuditLog, Message } from '../types';
import { supabase } from './supabaseClient';

const safeUserId = (userId: string) => userId.startsWith('guest-') ? null : userId;

// --- MOCK STORAGE (Simulating DB Tables for Prototype) ---
let MOCK_SAFETY_CASES: SafetyCase[] = [];
let MOCK_AUDIT_LOGS: AuditLog[] = [];

// --- PII DETECTION LOGIC ---
export const detectPII = (text: string): { found: boolean, redactedText: string, type?: string } => {
    let redacted = text;
    let found = false;
    let type = undefined;

    // Phone Numbers (Rough international/local regex)
    // Matches: +92..., 03..., 00..., 123-456...
    const phoneRegex = /(?:(?:\+|00)[1-9]\d{0,3}[\s-.]?)?(?:(?:\d{1,4})[\s-.]?){2,}\d{2,}/g;
    
    // Emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Bank/Card (Simple 16 digit check)
    const cardRegex = /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g;

    if (text.match(phoneRegex)) {
        // Filter out short numbers like years "2024" or small integers "100" by checking length
        const matches = text.match(phoneRegex);
        if (matches && matches.some(m => m.replace(/[^0-9]/g, '').length > 7)) {
            redacted = redacted.replace(phoneRegex, '[REDACTED PHONE]');
            found = true;
            type = 'PHONE';
        }
    }

    if (text.match(emailRegex)) {
        redacted = redacted.replace(emailRegex, '[REDACTED EMAIL]');
        found = true;
        type = type ? `${type}, EMAIL` : 'EMAIL';
    }

    if (text.match(cardRegex)) {
        redacted = redacted.replace(cardRegex, '[REDACTED FINANCIAL]');
        found = true;
        type = type ? `${type}, FINANCIAL` : 'FINANCIAL';
    }

    return { found, redactedText: redacted, type };
};

export const createSafetyCase = async (userId: string, category: SafetyCase['category'], summary: string) => {
    const newCase: SafetyCase = {
        id: `C-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        userId,
        category,
        aiSummary: summary,
        status: 'active',
        timestamp: Date.now()
    };
    MOCK_SAFETY_CASES.unshift(newCase);
    
    // Log creation
    logAudit('system', 'CREATE_CASE', `Created case ${newCase.id} for user ${userId} due to ${category}`);
    
    // Persist to supabase if needed, currently using memory for prototype session
    // In real app: await supabase.from('safety_cases').insert(newCase);
};

export const getSafetyCases = async (): Promise<SafetyCase[]> => {
    return MOCK_SAFETY_CASES;
};

export const resolveSafetyCase = async (caseId: string) => {
    const c = MOCK_SAFETY_CASES.find(c => c.id === caseId);
    if (c) {
        c.status = 'resolved';
        logAudit('admin', 'RESOLVE_CASE', `Resolved case ${caseId}`);
    }
};

export const logAudit = (actorId: string, action: AuditLog['action'], details: string) => {
    const log: AuditLog = {
        id: crypto.randomUUID(),
        actorId,
        action,
        details,
        timestamp: Date.now()
    };
    MOCK_AUDIT_LOGS.unshift(log);
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
    return MOCK_AUDIT_LOGS;
};

// --- DIAGNOSTICS ---
export const checkConnection = async (): Promise<{ status: 'connected' | 'error', details?: any }> => {
    try {
        // Simple query to check if we can read from the 'users' table
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return { status: 'connected', details: { userCount: count } };
    } catch (e: any) {
        console.error("Supabase Connection Check Failed:", e);
        return { status: 'error', details: e.message };
    }
};

// --- ADMIN API ---

export const getAdminStats = async (): Promise<AdminStats> => {
    try {
        const { data, error } = await supabase.rpc('get_admin_overview');
        if (error) throw error;
        
        return {
            totalUsers: data.totalUsers,
            activeUsersToday: data.activeUsersToday,
            activeUsersWeekly: 0,
            activeUsersMonthly: 0,
            totalSessions: data.totalSessions,
            avgSessionDuration: data.avgSessionDuration,
            moodDistribution: data.moodDistribution || {},
            languageDistribution: {},
            genderDistribution: {},
            professionDistribution: {},
            toneDistribution: {},
            regionDistribution: {},
            userGrowth: []
        };
    } catch (e) {
        console.error("Admin stats failed", e);
        return { totalUsers: 0, activeUsersToday: 0, activeUsersWeekly: 0, activeUsersMonthly: 0, totalSessions: 0, avgSessionDuration: 0, moodDistribution: {}, languageDistribution: {}, genderDistribution: {}, professionDistribution: {}, toneDistribution: {}, regionDistribution: {}, userGrowth: [] };
    }
};

export const getTherapists = async (): Promise<Therapist[]> => {
    // In a real app, fetch from DB. Here we return mock data + any saved ones.
    const MOCK_THERAPISTS: Therapist[] = [
        {
            id: 't1',
            name: 'Syed Moiz',
            specialty: 'CBT Specialist',
            tags: ['Iqra University', 'Computer Science', 'Anxiety'],
            location: 'Remote / Karachi',
            languages: ['English', 'Urdu'],
            experience: 5,
            bio: 'Specializing in student anxiety and exam stress. I use structured CBT techniques to help you regain focus.',
            bookingUrl: '#',
            availableSlots: [{day: 'Mon', time: '10:00 AM', duration: '45m'}],
            publicListing: false
        },
        {
            id: 't2',
            name: 'Kunal Kumar',
            specialty: 'Counseling Psychologist',
            tags: ['Counseling', 'Hindi', 'Urdu', 'Depression'],
            location: 'Remote',
            languages: ['Hindi', 'Urdu', 'English'],
            experience: 4,
            bio: 'Warm, empathetic listening for those feeling disconnected or low. I provide a safe space to vent.',
            bookingUrl: '#',
            availableSlots: [{day: 'Wed', time: '2:00 PM', duration: '45m'}],
            publicListing: false
        }
    ];
    return MOCK_THERAPISTS;
};

export const saveTherapist = async (therapist: Therapist) => {
    const payload = {
        id: therapist.id, 
        name: therapist.name,
        specialties: [therapist.specialty],
        specialty: therapist.specialty,
        location: therapist.location,
        languages: therapist.languages,
        experience: therapist.experience,
        bio: therapist.bio,
        image_url: therapist.imageUrl,
        booking_url: therapist.bookingUrl,
        available_slots: therapist.availableSlots,
        public_listing: true
    };
    await supabase.from('therapists').upsert(payload);
};

export const deleteTherapist = async (id: string) => {
    await supabase.from('therapists').delete().eq('id', id);
};

// --- DATA COLLECTION ---

export const saveCheckInEvent = async (event: CheckInEvent) => {
    await supabase.from('analytics_events').insert({
        event_type: event.event,
        payload: { questionId: event.questionId, response: event.response }
    });
};

export const saveUserFeedback = async (feedback: UserFeedback) => {
    await supabase.from('feedback').insert({
        user_id: safeUserId(feedback.userId),
        type: 'feedback',
        category: feedback.category,
        message: feedback.note,
        metadata: { feedbackType: feedback.feedbackType }
    });
};

export const saveBugReport = async (bug: BugReport) => {
    await supabase.from('feedback').insert({
        user_id: safeUserId(bug.userId),
        type: 'bug',
        category: bug.issueType,
        message: bug.description,
        metadata: { 
            session_id: bug.sessionId, 
            device: bug.deviceInfo, 
            browser: bug.browser,
            app_version: bug.appVersion
        },
        status: bug.status
    });
};

export const getBugReports = async (): Promise<BugReport[]> => {
    const { data } = await supabase.from('feedback').select('*').eq('type', 'bug');
    return (data || []).map((b: any) => ({
        id: b.id,
        userId: b.user_id || 'guest',
        sessionId: b.metadata?.session_id,
        issueType: b.category,
        description: b.message,
        deviceInfo: b.metadata?.device,
        browser: b.metadata?.browser,
        appVersion: b.metadata?.app_version || '1.0',
        capturedContext: [], 
        status: b.status,
        timestamp: new Date(b.created_at).getTime()
    }));
};

export const getUserFeedback = async (): Promise<UserFeedback[]> => {
    const { data } = await supabase.from('feedback').select('*').eq('type', 'feedback');
    return (data || []).map((f: any) => ({
        id: f.id,
        userId: f.user_id || 'guest',
        feedbackType: f.metadata?.feedbackType,
        category: f.category,
        note: f.message,
        timestamp: new Date(f.created_at).getTime()
    }));
};

// --- THERAPY NOTES ---

export const getTherapyNotes = async (userId?: string): Promise<TherapyNote[]> => {
    try {
        let query = supabase.from('therapy_notes').select('*');
        if (userId && !userId.startsWith('guest-')) {
            query = query.eq('user_id', userId);
        }
        const { data } = await query;
        if (!data) return [];

        return data.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            therapistId: n.therapist_id,
            dateOfNote: n.date_of_note,
            title: n.title,
            details: n.note,
            markType: n.mark_type || 'Note',
            nextReminder: n.next_reminder,
            createdAt: new Date(n.created_at).getTime()
        }));
    } catch(e) { return []; }
}

export const saveTherapyNote = async (note: TherapyNote) => {
    if (note.userId.startsWith('guest-')) return;
    await supabase.from('therapy_notes').insert({
        user_id: note.userId,
        title: note.title,
        note: note.details, 
        mark_type: note.markType,
        next_reminder: note.nextReminder,
        date_of_note: note.dateOfNote
    });
};

// --- ADMIN USERS & ALERTS ---

export const getAdminUsers = async (): Promise<AdminUserView[]> => {
    try {
        const { data } = await supabase.from('users').select('*');
        if (!data) return [];
        return data.map((p: any) => ({
            id: p.id,
            name: p.display_name,
            email: p.email,
            region: p.region,
            age: p.age,
            gender: p.gender,
            pronouns: p.metadata?.pronouns,
            profession: p.profession,
            language: p.preferred_language,
            lastActive: new Date(p.last_active_at || Date.now()).getTime(),
            sessionCount: 0,
            status: 'active',
            flags: p.metadata?.preventPhoneContact ? ['No Phone'] : []
        }));
    } catch (e) { return []; }
};

export const getAdminAlerts = async (): Promise<AdminAlert[]> => {
    const { data } = await supabase.from('emergencies').select('*').eq('status', 'escalated');
    return (data || []).map((e: any) => ({
        id: e.id,
        type: 'High Risk',
        priority: 'HIGH',
        message: e.reason || 'Critical Emergency',
        userId: e.user_id || 'guest',
        timestamp: new Date(e.created_at).getTime(),
        status: 'active'
    }));
};

export const getAdminReports = (): AdminReport[] => [];
export const resolveBugReport = async (id: string) => supabase.from('feedback').update({status:'resolved'}).eq('id',id);
export const deleteBugReport = async (id: string) => supabase.from('feedback').delete().eq('id',id);
export const deleteUserFeedback = async (id: string) => supabase.from('feedback').delete().eq('id',id);
export const saveRating = (rating: any) => {};