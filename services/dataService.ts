
import { Therapist, AdminStats, AdminUserView, AdminAlert, AdminReport, TherapyNote, BugReport, UserFeedback, CheckInEvent } from '../types';
import { supabase } from './supabaseClient';

const safeUserId = (userId: string, is_anonymous?: boolean) => is_anonymous ? null : userId;

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
    try {
        const { data, error } = await supabase.from('therapists').select('*');
        if (error || !data) return [];
        return data.map((t: any) => ({
            id: t.id,
            name: t.name,
            specialty: t.specialty ? t.specialty : (t.specialties ? t.specialties[0] : ''),
            location: t.location || t.region,
            languages: t.languages || [],
            experience: t.experience,
            bio: t.bio,
            imageUrl: t.image_url,
            bookingUrl: t.booking_url,
            availableSlots: t.available_slots || [],
            contactBusiness: t.contact_business,
            publicListing: t.public_listing
        }));
    } catch (e) { return []; }
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
    // Only save if user is logged in (or handle guest logic if you want to track anon stats)
    // For now, we allow it to fail silently if no auth context, or we rely on RLS allowing anon inserts
    await supabase.from('analytics_events').insert({
        event_type: event.event,
        payload: { questionId: event.questionId, response: event.response }
    });
};

export const saveUserFeedback = async (feedback: UserFeedback, is_anonymous?: boolean) => {
    await supabase.from('feedback').insert({
        user_id: safeUserId(feedback.userId, is_anonymous),
        type: 'feedback',
        category: feedback.category,
        message: feedback.note,
        metadata: { feedbackType: feedback.feedbackType }
    });
};

export const saveBugReport = async (bug: BugReport, is_anonymous?: boolean) => {
    await supabase.from('feedback').insert({
        user_id: safeUserId(bug.userId, is_anonymous),
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
        if (userId) { // anonymous users have real IDs
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
            profession: p.profession,
            language: p.preferred_language,
            lastActive: new Date(p.last_active_at || Date.now()).getTime(),
            sessionCount: 0,
            status: 'active'
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