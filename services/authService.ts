
import { UserSettings, Badge, Gender, Profession, TonePreference, Language, AIResponseStyle, Pronouns } from '../types';
import { supabase } from './supabaseClient';

const INITIAL_BADGES: Badge[] = [
    { id: 'day-1', label: '1 Day', description: 'You showed up for yourself today.', icon: '🌱', requiredDays: 1 }
];

interface RegisterData {
    email: string;
    password: string;
    name: string;
    age: number;
    region: string;
    gender: Gender;
    pronouns: Pronouns;
    profession: Profession;
    language: Language;
    tone: TonePreference;
    aiResponseStyle?: AIResponseStyle;
    preferredTherapistGender: 'Female' | 'Male' | 'No Preference';
    preventPhoneContact: boolean;
}

export const registerUser = async (data: RegisterData): Promise<{ user: UserSettings | null, error: string | null }> => {
    try {
        const cleanEmail = data.email.trim();
        const cleanName = data.name.trim();

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: data.password,
            options: { data: { name: cleanName } }
        });

        if (authError) {
            return { user: null, error: authError.message };
        }

        if (!authData.user) {
            return { user: null, error: "No user data returned." };
        }

        const newUser: UserSettings = {
            id: authData.user.id,
            email: cleanEmail,
            name: cleanName,
            age: data.age,
            region: data.region,
            gender: data.gender,
            pronouns: data.pronouns,
            profession: data.profession,
            preferredLanguage: data.language,
            tonePreference: data.tone,
            aiResponseStyle: data.aiResponseStyle || 'Empathetic',
            voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
            therapistStyle: 'gentle', personalityMode: 'introvert', darkMode: false, isAdmin: false,
            stats: { totalActiveDays: 0, lastActiveDate: '', badges: INITIAL_BADGES },
            preferredTherapistGender: data.preferredTherapistGender,
            preventPhoneContact: data.preventPhoneContact
        };

        // Update 'users' table (Auth trigger creates row, we perform update)
        // Using 'users' table now per new schema
        const { error: dbError } = await supabase.from('users').update({
            display_name: newUser.name,
            age: newUser.age,
            region: newUser.region,
            gender: newUser.gender,
            profession: newUser.profession,
            preferred_language: newUser.preferredLanguage,
            tone_preference: newUser.tonePreference,
            metadata: { 
                badges: INITIAL_BADGES, 
                totalActiveDays: 0, 
                aiResponseStyle: newUser.aiResponseStyle,
                pronouns: newUser.pronouns,
                preferredTherapistGender: newUser.preferredTherapistGender,
                preventPhoneContact: newUser.preventPhoneContact
            }
        }).eq('id', newUser.id);

        if (dbError) {
            console.error("User DB Update Failed", dbError);
        }

        return { user: newUser, error: null };
    } catch (e: any) {
        return { user: null, error: e.message || "An unexpected error occurred." };
    }
};

export const loginUser = async (email: string, password: string): Promise<UserSettings | null> => {
    // --- BYPASS FOR TESTING ---
    if (email === '1' && (password === '1' || password === 'one')) {
        return {
            id: 'test-user-1',
            email: 'test@sakoon.ai',
            name: '1',
            age: 21,
            region: 'Global',
            gender: 'Female',
            pronouns: 'She/Her',
            profession: 'Student',
            preferredLanguage: 'English',
            tonePreference: 'Soft',
            aiResponseStyle: 'Empathetic',
            voiceEnabled: false,
            autoPlayAudio: false,
            memoryEnabled: true,
            therapistStyle: 'gentle',
            personalityMode: 'introvert',
            darkMode: false,
            isAdmin: false,
            stats: { totalActiveDays: 1, lastActiveDate: new Date().toLocaleDateString('en-CA'), badges: INITIAL_BADGES },
            preferredTherapistGender: 'Female',
            preventPhoneContact: false
        };
    }
    // --------------------------

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error || !data.user) return null;

        const { data: profile } = await supabase
            .from('users') // Fetch from 'users' table
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (!profile) {
            // Fallback
            return {
                id: data.user.id,
                email: data.user.email || '',
                name: 'User',
                age: 0, region: '', gender: 'Other', pronouns: 'Prefer not to say', profession: 'Other',
                preferredLanguage: 'English', tonePreference: 'Soft',
                aiResponseStyle: 'Empathetic',
                voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
                therapistStyle: 'gentle', personalityMode: 'introvert',
                darkMode: false, isAdmin: false,
                stats: { totalActiveDays: 0, lastActiveDate: '', badges: INITIAL_BADGES },
                preferredTherapistGender: 'No Preference', preventPhoneContact: false
            };
        }

        return {
            id: profile.id,
            email: profile.email || data.user.email,
            name: profile.display_name || 'User',
            age: profile.age,
            region: profile.region,
            gender: profile.gender,
            pronouns: profile.metadata?.pronouns || 'Prefer not to say',
            profession: profile.profession,
            preferredLanguage: profile.preferred_language,
            tonePreference: profile.tone_preference,
            aiResponseStyle: profile.metadata?.aiResponseStyle || 'Empathetic',
            voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
            therapistStyle: 'gentle', personalityMode: 'introvert',
            darkMode: false,
            isAdmin: profile.role === 'admin' || profile.is_admin,
            stats: profile.metadata || { totalActiveDays: 0, lastActiveDate: '', badges: INITIAL_BADGES },
            preferredTherapistGender: profile.metadata?.preferredTherapistGender || 'No Preference',
            preventPhoneContact: profile.metadata?.preventPhoneContact || false
        };

    } catch (e) { return null; }
};

export const updateUserProfile = async (user: UserSettings) => {
    if (user.id.startsWith('guest-') || user.id === 'test-user-1') return;
    
    // Ensure metadata includes the response style & new preferences
    const metadata = { 
        ...user.stats,
        aiResponseStyle: user.aiResponseStyle,
        pronouns: user.pronouns,
        preferredTherapistGender: user.preferredTherapistGender,
        preventPhoneContact: user.preventPhoneContact
    };

    await supabase.from('users').update({
        display_name: user.name,
        age: user.age,
        region: user.region,
        gender: user.gender,
        profession: user.profession,
        preferred_language: user.preferredLanguage,
        tone_preference: user.tonePreference,
        metadata: metadata,
        last_active_at: new Date().toISOString()
    }).eq('id', user.id);
};
