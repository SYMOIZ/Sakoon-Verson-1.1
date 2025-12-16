
import { 
    MarketingExpense, FinanceStats, PayoutRequest, UserSettings, Notification, Broadcast, 
    AdminStats, Therapist, TherapistApplication, AdminUserView, AdminAlert, Transaction, 
    Investment, ChatThread, SystemHealth, MonetizationConfig, TherapistConnection, 
    SystemNotification, TeamMember, CompanyExpense, TherapyNote, SupportTicket, Review, 
    CalendarSlot, SafetyIncident, RiskAlert, UserFeedback, BugReport, SessionRating,
    Message, Session, JournalEntry
} from '../types';
import { supabase } from './supabaseClient';

// --- HELPER: Admin Logger ---
const logAdminAction = async (action: string, details: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('admin_actions').insert({
            admin_id: user.id,
            action_type: action,
            details: details,
            created_at: new Date().toISOString()
        });
    }
};

// --- FINANCE (Connected to: wallet_transactions, marketing_expenses, payout_requests) ---

export const getFinanceStats = async (): Promise<FinanceStats> => {
    // 1. Marketing Expenses
    const { data: expenses } = await supabase.from('marketing_expenses').select('amount');
    const totalExpenses = expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    // 2. Payouts
    const { data: payouts } = await supabase.from('payout_requests').select('amount, status');
    const pendingPayouts = payouts?.filter(p => p.status === 'Pending').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
    const clearedPayouts = payouts?.filter(p => p.status === 'Processed').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    // 3. Revenue (From wallet_transactions where type = 'Credit')
    const { data: credits } = await supabase.from('wallet_transactions')
        .select('amount, therapist_payout')
        .eq('type', 'Credit')
        .eq('status', 'Verified');
    
    const totalRevenue = credits?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
    
    // Profit = Revenue - Therapist Payouts (The 20% cut is implicit in the difference)
    const totalTherapistShare = credits?.reduce((acc, curr) => acc + Number(curr.therapist_payout), 0) || 0;
    const grossProfit = totalRevenue - totalTherapistShare;
    const netIncome = grossProfit - totalExpenses;

    // 4. Top Performers (Aggregation)
    // Note: In a real heavy-load app, these should be RPC calls. Doing client-side aggregation for prototype.
    const { data: txs } = await supabase.from('wallet_transactions').select('therapist_id, student_id, amount').eq('type', 'Credit');
    
    // Aggregate Top Therapist
    const therapistMap: Record<string, number> = {};
    txs?.forEach(t => { therapistMap[t.therapist_id] = (therapistMap[t.therapist_id] || 0) + Number(t.amount); });
    const topTId = Object.keys(therapistMap).reduce((a, b) => therapistMap[a] > therapistMap[b] ? a : b, '');
    let topTherapistName = 'None';
    if(topTId) {
        const { data: u } = await supabase.from('users').select('display_name').eq('id', topTId).single();
        topTherapistName = u?.display_name || 'Unknown';
    }

    // Aggregate Top Student
    const studentMap: Record<string, number> = {};
    txs?.forEach(t => { studentMap[t.student_id] = (studentMap[t.student_id] || 0) + Number(t.amount); });
    const topSId = Object.keys(studentMap).reduce((a, b) => studentMap[a] > studentMap[b] ? a : b, '');
    let topStudentName = 'None';
    if(topSId) {
        const { data: u } = await supabase.from('users').select('display_name').eq('id', topSId).single();
        topStudentName = u?.display_name || 'Unknown';
    }

    return {
        revenue: totalRevenue,
        profit: grossProfit,
        marketing: totalExpenses,
        net_income: netIncome,
        pending_payouts: pendingPayouts,
        cleared_payouts: clearedPayouts,
        top_therapist: { name: topTherapistName, total: therapistMap[topTId] || 0 },
        top_student: { name: topStudentName, total: studentMap[topSId] || 0 },
        most_active: { name: 'Calc...', sessions: 0 } // Requires session count logic
    };
};

export const getMarketingExpenses = async (): Promise<MarketingExpense[]> => {
    const { data, error } = await supabase.from('marketing_expenses').select('*').order('date', { ascending: false });
    if (error) {
        console.error("Expense Fetch Error:", error.message);
        return [];
    }
    return (data || []).map((d: any) => ({...d, date: new Date(d.date).getTime()}));
};

export const addMarketingExpense = async (expense: Omit<MarketingExpense, 'id' | 'date'>) => {
    await supabase.from('marketing_expenses').insert({
        platform: expense.platform,
        amount: expense.amount,
        description: expense.description,
        date: new Date().toISOString()
    });
    await logAdminAction('add_expense', { amount: expense.amount, platform: expense.platform });
};

// --- PAYOUTS (Connected to: payout_requests) ---

export const getPayoutRequests = async (): Promise<PayoutRequest[]> => {
    const { data, error } = await supabase.from('payout_requests').select('*').order('request_date', { ascending: false });
    if (error) console.error("Payout Fetch Error:", error.message);
    return (data || []).map((d: any) => ({
        id: d.id,
        therapistId: d.therapist_id,
        therapistName: d.therapist_name,
        amount: d.amount,
        status: d.status,
        requestDate: new Date(d.request_date).getTime(),
        method: d.method,
        processedAt: d.processed_at ? new Date(d.processed_at).getTime() : undefined
    }));
};

export const processPayout = async (id: string, status: 'Processed' | 'Rejected') => {
    const { error } = await supabase.from('payout_requests').update({
        status,
        processed_at: new Date().toISOString()
    }).eq('id', id);
    
    if (!error) {
        // If rejected, refund the wallet transaction (simplified logic)
        if (status === 'Rejected') {
             // Logic to credit back wallet would go here
        }
        await logAdminAction('process_payout', { id, status });
    }
    return !error;
};

export const requestPayout = async (amount: number, details: any) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    
    // Create Payout Request
    await supabase.from('payout_requests').insert({
        therapist_id: user.id,
        therapist_name: user.user_metadata?.name || 'Unknown',
        amount,
        status: 'Pending',
        request_date: new Date().toISOString(),
        method: `${details.bankName} - ${details.iban}`
    });

    // Create Debit Transaction in Wallet
    await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: amount,
        type: 'Debit',
        status: 'Pending', // Pending admin approval
        description: 'Withdrawal Request',
        date: new Date().toISOString(),
        therapist_payout: 0
    });
};

export const getTransactions = async (): Promise<Transaction[]> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data } = await supabase.from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    return (data || []).map((t: any) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        type: t.type,
        amount: t.amount,
        status: t.status,
        therapistPayout: t.therapist_payout
    }));
};

// --- THERAPISTS & USERS (Connected to: users, therapist_profiles, therapist_applications) ---

export const checkConnection = async (): Promise<{ status: 'connected' | 'error', details?: any }> => {
    try {
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return { status: 'connected', details: { userCount: count } };
    } catch (e: any) {
        return { status: 'error', details: { message: e.message } };
    }
};

export const getTherapists = async (): Promise<Therapist[]> => {
    // Join users with profiles
    const { data, error } = await supabase.from('users')
        .select(`
            id, email, display_name, role, account_status,
            therapist_profiles (*)
        `)
        .eq('role', 'therapist');

    if (error || !data) return [];
    
    return data.map((u: any) => {
        const profile = u.therapist_profiles || {}; // One-to-one mapping usually
        return {
            id: u.id,
            name: u.display_name,
            email: u.email,
            specialty: profile.specialty || 'General Therapist',
            bio: profile.bio || '',
            languages: profile.languages || ['English'],
            experience: profile.experience || 0,
            rating: profile.rating || 5.0,
            reviewCount: profile.review_count || 0,
            bookingUrl: profile.booking_url || '',
            status: u.account_status === 'active' ? 'LIVE' : 'PENDING',
            isCrisisCertified: profile.is_crisis_certified,
            licenseNumber: profile.license_number,
            bankDetails: profile.bank_details,
            clinicalSpecializations: profile.clinical_specializations,
            loyaltyPoints: profile.loyalty_points,
            cvFileName: null, // Usually stored in applications table, not profile
            degreeFileName: null,
            availableSlots: [] 
        };
    });
};

export const getTherapistApplications = async (): Promise<TherapistApplication[]> => {
    const { data } = await supabase.from('therapist_applications').select('*');
    return (data || []).map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        fullName: a.full_name,
        email: a.email,
        phone: a.phone,
        yearsExperience: a.years_experience,
        specialization: a.specialization,
        licenseNumber: a.license_number,
        cvFileName: a.cv_file,
        degreeFileName: a.degree_file,
        status: a.status,
        submittedAt: new Date(a.submitted_at).getTime()
    }));
};

export const approveTherapistApplication = async (app: TherapistApplication) => {
    // 1. Update Application Status
    await supabase.from('therapist_applications').update({ status: 'approved' }).eq('id', app.id);
    
    // 2. Activate User Account
    await supabase.from('users').update({ account_status: 'active' }).eq('id', app.userId);
    
    // 3. Create/Update Profile
    await supabase.from('therapist_profiles').upsert({
        user_id: app.userId,
        specialty: app.specialization,
        experience: app.yearsExperience,
        license_number: app.licenseNumber,
        is_crisis_certified: false
    });

    await logAdminAction('approve_therapist', { userId: app.userId });
};

export const rejectTherapistApplication = async (id: string) => {
    await supabase.from('therapist_applications').update({ status: 'rejected' }).eq('id', id);
    await logAdminAction('reject_therapist', { appId: id });
};

export const updateTherapistProfile = async (id: string, data: any) => {
    const { error } = await supabase.from('therapist_profiles').upsert({
        user_id: id,
        bio: data.bio,
        specialty: data.specialty,
        booking_url: data.bookingUrl,
        experience: data.experience,
        license_number: data.licenseNumber,
        bank_details: data.bankDetails,
        notification_prefs: data.notificationPrefs,
        clinical_specializations: data.clinicalSpecializations,
        updated_at: new Date().toISOString()
    });
    if (error) console.error("Profile Update Error", error.message);
};

export const getAdminUsers = async (): Promise<AdminUserView[]> => {
    const { data } = await supabase.from('users').select('*');
    return (data || []).map((u: any) => ({
        id: u.id,
        name: u.display_name,
        email: u.email,
        age: u.age,
        gender: u.gender,
        region: u.region,
        profession: u.profession,
        riskLevel: 'low', // Would need logic from risk_alerts to populate this
        status: u.account_status
    }));
};

// --- SUPPORT & FEEDBACK (Connected to: support_tickets, user_feedback, bug_reports, reviews) ---

export const getReviews = async (therapistId: string): Promise<Review[]> => {
    const { data } = await supabase.from('reviews').select('*').eq('therapist_id', therapistId).order('date', { ascending: false });
    return (data || []).map((r: any) => ({
        id: r.id,
        therapistId: r.therapist_id,
        studentName: r.student_name, // If relation exists, use r.users.display_name
        rating: r.rating,
        feedback: r.comment,
        date: new Date(r.created_at).toLocaleDateString()
    }));
};

export const saveRating = async (rating: SessionRating) => {
    await supabase.from('session_ratings').insert({
        session_id: rating.sessionId,
        rating: rating.rating,
        remark: rating.remark,
        created_at: new Date(rating.timestamp).toISOString()
    });
};

export const saveBugReport = async (report: any, isAnon: boolean) => {
    await supabase.from('bug_reports').insert({
        user_id: report.userId,
        session_id: report.sessionId,
        issue_type: report.issueType,
        description: report.description,
        device_info: report.deviceInfo,
        status: 'new',
        created_at: new Date(report.timestamp).toISOString()
    });
};

export const saveUserFeedback = async (feedback: any, isAnon: boolean) => {
    await supabase.from('user_feedback').insert({
        user_id: feedback.userId,
        feedback_type: feedback.feedbackType,
        category: feedback.category,
        note: feedback.note,
        created_at: new Date(feedback.timestamp).toISOString()
    });
};

export const getStudentFeedback = async (): Promise<UserFeedback[]> => {
    const { data } = await supabase.from('user_feedback').select(`*, users(display_name, email)`).order('created_at', { ascending: false });
    return (data || []).map((f: any) => ({
        id: f.id,
        userId: f.user_id,
        feedbackType: f.feedback_type,
        category: f.category,
        note: f.note,
        timestamp: new Date(f.created_at).getTime(),
        userName: f.users?.display_name || 'Anon',
        userEmail: f.users?.email || '',
        status: f.status || 'Pending',
        metadata: f.metadata
    }));
};

export const updateFeedbackStatus = async (id: string, status: string, note: string) => {
    await supabase.from('user_feedback').update({ status, metadata: { admin_note: note } }).eq('id', id);
};

export const saveSupportTicket = async (ticket: SupportTicket) => {
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('support_tickets').insert({
        user_id: user?.id,
        user_email: user?.email,
        user_name: user?.user_metadata?.name,
        type: ticket.type,
        subject: ticket.subject,
        description: ticket.description,
        status: 'Open',
        created_at: new Date().toISOString()
    });
};

export const getSupportTickets = async (): Promise<SupportTicket[]> => {
    const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    return (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        userName: t.user_name,
        userEmail: t.user_email,
        type: t.type,
        subject: t.subject,
        description: t.description,
        status: t.status,
        created_at: t.created_at,
        timestamp: new Date(t.created_at).getTime(),
        admin_response: t.admin_response
    }));
};

export const resolveSupportTicket = async (id: string, reply: string) => {
    await supabase.from('support_tickets').update({
        status: 'Resolved',
        admin_response: reply,
        resolved_at: new Date().toISOString()
    }).eq('id', id);
};

// --- SAFETY & ALERTS (Connected to: risk_alerts, safety_incidents, emergency_sessions) ---

export const triggerRiskAlert = async (alertData: any) => {
    await supabase.from('risk_alerts').insert({
        user_id: alertData.userId,
        student_name: alertData.userName,
        trigger_keyword: alertData.triggerKeyword,
        message: alertData.message,
        detected_at: new Date().toISOString(),
        status: 'Active'
    });
};

export const getRiskAlerts = async (): Promise<RiskAlert[]> => {
    const { data } = await supabase.from('risk_alerts').select('*').eq('status', 'Active');
    return (data || []).map((a: any) => ({
        id: a.id,
        studentId: a.user_id,
        studentName: a.student_name,
        triggerKeyword: a.trigger_keyword,
        detectedAt: new Date(a.detected_at).getTime(),
        status: a.status
    }));
};

export const reportSafetyIncident = async (incident: SafetyIncident) => {
    await supabase.from('safety_incidents').insert({
        therapist_id: incident.therapistId,
        student_name: incident.studentName,
        incident_type: incident.type,
        description: incident.description,
        time_of_incident: incident.timeOfIncident,
        status: 'Reported',
        created_at: new Date().toISOString()
    });
};

export const getCrisisTherapists = async (): Promise<Therapist[]> => {
    // Filter therapists where profile.is_crisis_certified = true
    const { data, error } = await supabase.from('users')
        .select(`id, display_name, therapist_profiles!inner(is_crisis_certified, specialty, experience)`)
        .eq('role', 'therapist')
        .eq('therapist_profiles.is_crisis_certified', true);

    if (error || !data) return [];

    return data.map((u: any) => ({
        id: u.id,
        name: u.display_name,
        email: '',
        specialty: u.therapist_profiles.specialty,
        experience: u.therapist_profiles.experience,
        languages: [],
        rating: 5,
        reviewCount: 0,
        bookingUrl: '',
        status: 'LIVE',
        bio: ''
    }));
};

export const createEmergencySession = async (alertId: string, studentId: string, therapistId: string) => {
    await supabase.from('emergency_sessions').insert({
        alert_id: alertId,
        student_id: studentId,
        therapist_id: therapistId,
        started_at: new Date().toISOString()
    });
    // Mark alert handled
    await supabase.from('risk_alerts').update({ status: 'Handling' }).eq('id', alertId);
};

// --- CALENDAR & APPOINTMENTS (Connected to: calendar_slots) ---

export const getTherapistSchedule = async (therapistId: string): Promise<CalendarSlot[]> => {
    const { data } = await supabase.from('calendar_slots')
        .select('*')
        .eq('therapist_id', therapistId)
        .gte('date', new Date().toISOString().split('T')[0]);
        
    return (data || []).map((s: any) => ({
        id: s.id,
        date: s.date,
        time: s.time,
        duration: s.duration,
        status: s.status,
        studentName: s.student_name,
        type: s.session_type
    }));
};

export const addCalendarSlot = async (slot: any) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    
    await supabase.from('calendar_slots').insert({
        therapist_id: user.id,
        date: slot.date,
        time: slot.time,
        duration: slot.duration,
        status: 'available'
    });
};

export const deleteCalendarSlot = async (id: string) => {
    await supabase.from('calendar_slots').delete().eq('id', id);
};

// --- TEAM & ADMIN (Connected to: team_members, broadcasts) ---

export const getTeamMembers = async (): Promise<TeamMember[]> => {
    const { data } = await supabase.from('team_members').select('*');
    return (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
        is_active: m.status === 'Active',
        access_expires_at: m.access_expires_at,
        lastLogin: new Date(m.last_login || Date.now()).getTime(),
        addedAt: new Date(m.created_at).getTime(),
        permissions: m.permissions || {}
    }));
};

export const addTeamMember = async (member: TeamMember) => {
    await supabase.from('team_members').insert({
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status,
        permissions: member.permissions,
        access_expires_at: member.access_expires_at,
        created_at: new Date().toISOString()
    });
    await logAdminAction('add_team_member', { email: member.email, role: member.role });
};

export const revokeTeamAccess = async (id: string) => {
    await supabase.from('team_members').delete().eq('id', id);
    await logAdminAction('revoke_team_member', { id });
};

export const updateTeamMemberStatus = async (id: string, status: string) => {
    await supabase.from('team_members').update({ status }).eq('id', id);
};

export const sendBroadcast = async (title: string, message: string, type: string, audience: string) => {
    const { error } = await supabase.from('broadcasts').insert({
        title, message, type, audience, sent_at: new Date().toISOString()
    });
    return !error;
};

export const getBroadcastHistory = async (): Promise<Broadcast[]> => {
    const { data } = await supabase.from('broadcasts').select('*').order('sent_at', { ascending: false });
    return (data || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        message: b.message,
        type: b.type,
        audience: b.audience,
        sentAt: new Date(b.sent_at).getTime()
    }));
};

// --- MESSAGING & CONNECTIONS (Connected to: direct_messages, therapist_connections, therapy_notes) ---

export const getDirectMessages = async (otherUserId: string) => {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return [];

    const { data } = await supabase.from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true });
        
    return data || [];
};

export const sendDirectMessage = async (receiverId: string, content: string) => {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return;

    await supabase.from('direct_messages').insert({
        sender_id: myId,
        receiver_id: receiverId,
        content,
        created_at: new Date().toISOString()
    });
};

export const getTherapistConnections = async (): Promise<TherapistConnection[]> => {
    // Joins to get names
    const { data } = await supabase.from('therapist_connections')
        .select(`
            id, status, created_at,
            student:users!student_id(id, display_name),
            therapist:users!therapist_id(id, display_name)
        `);
        
    return (data || []).map((c: any) => ({
        id: c.id,
        therapistId: c.therapist?.id,
        therapistName: c.therapist?.display_name,
        clientId: c.student?.id,
        clientName: c.student?.display_name,
        status: c.status === 'active' ? 'ACTIVE' : 'ENDED',
        totalSessions: 0,
        lastMeeting: new Date(c.created_at).toLocaleDateString()
    }));
};

export const breakConnection = async (id: string) => {
    await supabase.from('therapist_connections').delete().eq('id', id);
    await logAdminAction('break_connection', { id });
};

export const assignTherapist = async (data: { studentId: string, therapistId: string, duration: number, frequency: string, reason?: string }) => {
    await supabase.from('therapist_connections').insert({
        student_id: data.studentId,
        therapist_id: data.therapistId,
        status: 'active',
        notes: data.reason,
        config: { duration: data.duration, frequency: data.frequency },
        created_at: new Date().toISOString()
    });
    await logAdminAction('assign_therapist', { student: data.studentId, therapist: data.therapistId });
    return true;
};

export const getTherapyNotes = async (): Promise<TherapyNote[]> => {
    const { data } = await supabase.from('therapy_notes').select('*').order('created_at', { ascending: false });
    return (data || []).map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        therapistId: n.therapist_id,
        title: n.title,
        details: n.details,
        markType: n.mark_type,
        dateOfNote: n.date_of_note,
        createdAt: new Date(n.created_at).getTime(),
        nextReminder: n.next_reminder
    }));
};

export const saveTherapyNote = async (note: TherapyNote) => {
    await supabase.from('therapy_notes').insert({
        user_id: note.userId,
        therapist_id: note.therapistId,
        title: note.title,
        details: note.details,
        mark_type: note.markType,
        date_of_note: note.dateOfNote,
        next_reminder: note.nextReminder,
        created_at: new Date().toISOString()
    });
};

export const getTherapistPatients = async (therapistId: string): Promise<AdminUserView[]> => {
    // Get students connected to this therapist via therapist_connections
    const { data } = await supabase.from('therapist_connections')
        .select(`student:users!student_id(*)`)
        .eq('therapist_id', therapistId);
        
    return (data || []).map((d: any) => ({
        id: d.student.id,
        name: d.student.display_name,
        email: d.student.email,
        age: d.student.age,
        gender: d.student.gender,
        region: d.student.region,
        profession: d.student.profession,
        riskLevel: 'low',
        status: d.student.account_status
    }));
};

export const searchUsers = async (query: string, role: string) => {
    const { data } = await supabase.from('users')
        .select('id, display_name, email, role')
        .ilike('display_name', `%${query}%`)
        .eq('role', role === 'student' ? 'patient' : role)
        .limit(5);
        
    return (data || []).map((u: any) => ({ 
        id: u.id, 
        name: u.display_name || 'Unknown', 
        email: u.email || 'No Email' 
    }));
};

// --- DATA PERSISTENCE (Chat & Journal) ---

export const saveChatSession = async (userId: string, session: Session) => {
    if (!userId || userId === 'guest') return;
    const { error } = await supabase.from('chat_sessions').upsert({
        id: session.id,
        user_id: userId,
        created_at: new Date(session.startTime).toISOString(),
        updated_at: new Date(session.endTime).toISOString(),
        mood: session.moodStart || null
    });
    if (error) console.error("Error saving session to DB:", error.message);
};

export const saveChatMessage = async (userId: string, sessionId: string, message: Message) => {
    if (!userId || userId === 'guest') return;
    const { error } = await supabase.from('chat_messages').insert({
        id: message.id,
        session_id: sessionId,
        user_id: userId,
        role: message.role,
        content: message.text,
        created_at: new Date(message.timestamp).toISOString(),
        metadata: {
            grounding_links: message.groundingLinks || [],
            has_audio: !!message.audioBase64
        }
    });
    if (error) console.error("Error saving message to DB:", error.message);
};

export const saveJournalEntry = async (userId: string, entry: JournalEntry) => {
    if (!userId || userId === 'guest') return;
    const { error } = await supabase.from('journal_entries').insert({
        id: entry.id,
        user_id: userId,
        content: entry.content,
        title: entry.title,
        mood: entry.mood,
        created_at: new Date(entry.timestamp).toISOString()
    });
    if (error) console.error("Error saving journal to DB:", error.message);
};

export const saveCheckInEvent = async (event: any) => {
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('check_in_events').insert({
        user_id: user?.id || 'anon',
        question_id: event.questionId,
        response: event.response,
        created_at: new Date(event.timestamp).toISOString()
    });
};

export const saveTherapistApplication = async (app: TherapistApplication) => {
    await supabase.from('therapist_applications').insert({
        user_id: app.userId,
        full_name: app.fullName,
        email: app.email,
        phone: app.phone,
        years_experience: app.yearsExperience,
        specialization: app.specialization,
        license_number: app.licenseNumber,
        cv_file: app.cvFileName,
        degree_file: app.degreeFileName,
        status: app.status,
        submitted_at: new Date(app.submittedAt).toISOString()
    });
};

export const suspendUser = async (userId: string, reason: string) => {
    await supabase.from('users').update({ 
        account_status: 'suspended', 
        suspension_reason: reason 
    }).eq('id', userId);
};

// --- MISC EXPORTS / PLACEHOLDERS (To maintain TS interface) ---
export const getActiveBroadcasts = async (settings: UserSettings): Promise<Broadcast[]> => getBroadcastHistory();
export const getUserNotifications = async (): Promise<Notification[]> => [];
export const markNotificationRead = async (id: string) => {};
export const checkPendingInterventions = (userId: string): any[] => [];
export const scanForPII = (text: string) => {
    const phoneRegex = /(\+92|0)?3[0-9]{2}-?[0-9]{7}/;
    if (phoneRegex.test(text)) return { detected: true, type: 'Phone Number', match: text.match(phoneRegex)?.[0] };
    return { detected: false };
};
export const getAdminStats = async (): Promise<AdminStats> => ({ totalUsers: 0, activeUsersToday: 0, totalSessions: 0, activeTherapists: 0, totalRevenue: 0 });
export const deleteTherapist = async (id: string) => {};
export const getAdminAlerts = async (): Promise<AdminAlert[]> => [];
export const resolveAlert = async (id: string) => {};
export const getInvestments = async (): Promise<Investment[]> => [];
export const addInvestment = async () => {};
export const deleteInvestment = async () => {};
export const updateInvestment = async () => {};
export const addTransaction = async () => {};
export const deleteTransaction = async () => {};
export const getChatThreads = async (): Promise<ChatThread[]> => [];
export const getSystemHealth = async (): Promise<SystemHealth> => ({ status: 'Healthy', apiErrors: 0, latency: 45, database: 'Online' });
export const getMonetizationSettings = async (): Promise<MonetizationConfig> => ({ commissionRate: 20, payoutCycleDays: 29 });
export const updateMonetizationSettings = async () => {};
export const sendSystemBlast = async () => {};
export const getSystemNotifications = async (): Promise<SystemNotification[]> => [];
export const getRecommendedTherapists = async () => {};
export const sendIntervention = async () => {};
export const getCompanyExpenses = async (): Promise<CompanyExpense[]> => [];
export const addCompanyExpense = async () => {};
export const recordManualPayout = async () => {};
