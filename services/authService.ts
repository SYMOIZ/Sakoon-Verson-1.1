
import { UserSettings, Badge, Gender, Profession, TonePreference, Language, Religion } from '../types';
import { supabase } from './supabaseClient';
import { User, Session } from '@supabase/supabase-js';

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
    religion: Religion;
    profession: Profession;
    language: Language;
    tone: TonePreference;
}

export const signInAnonymously = async (): Promise<UserSettings | null> => {
    try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) {
            console.error("Anonymous sign in error:", error?.message);
            return null;
        }
        
        const user = data.user;

        const guestSettings: UserSettings = {
            id: user.id,
            email: user.email || 'guest@sukoon.ai',
            name: 'Guest',
            is_anonymous: true,
            age: 25, region: 'Global', gender: 'Other', profession: 'Other', religion: 'Other',
            preferredLanguage: 'English', tonePreference: 'Calm',
            voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
            therapistStyle: 'gentle', personalityMode: 'introvert', darkMode: false, isAdmin: false,
            stats: { totalActiveDays: 1, lastActiveDate: new Date().toLocaleDateString('en-CA'), badges: [] }
        };

        // An auth trigger creates a row in public.users. We update it with guest defaults.
        await supabase.from('users').update({
            display_name: guestSettings.name,
            age: guestSettings.age,
            region: guestSettings.region,
            gender: guestSettings.gender,
            religion: guestSettings.religion,
            profession: guestSettings.profession,
            preferred_language: guestSettings.preferredLanguage,
            tone_preference: guestSettings.tonePreference,
            metadata: guestSettings.stats
        }).eq('id', user.id);

        return guestSettings;

    } catch (e) {
        console.error("Anonymous sign in failed", e);
        return null;
    }
}

export const registerUser = async (data: RegisterData): Promise<{ user: UserSettings | null, error: string | null }> => {
    try {
        const cleanEmail = data.email.trim();
        const cleanName = data.name.trim();

        const { data: { session } } = await supabase.auth.getSession();
        const isAnonymous = session?.user?.is_anonymous;

        let authResponseUser: User | null = null;
        let authResponseSession: Session | null = null;
        
        if (isAnonymous) {
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
                email: cleanEmail,
                password: data.password,
                data: { name: cleanName }
            });
            if (updateError) {
                if (updateError.message.includes("already registered") || updateError.message.includes("same value")) {
                    return { user: null, error: "This email is already registered. Please log in." };
                }
                // FIX: Removed custom CAPTCHA error handling to allow Supabase to manage it.
                throw updateError;
            }
            authResponseUser = updateData.user;
            const { data: newSessionData } = await supabase.auth.getSession();
            authResponseSession = newSessionData.session;
        } else {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: data.password,
                options: { data: { name: cleanName } }
            });

            if (signUpError) {
                // FIX: Removed custom CAPTCHA error handling to allow Supabase to manage it.
                throw signUpError;
            }
            
            authResponseUser = signUpData.user;
            authResponseSession = signUpData.session;
        }

        if (authResponseUser && !authResponseSession) {
            return { user: null, error: "Your account could not be created at this time. Please contact support if the problem persists." };
        }
        
        if (!authResponseUser || !authResponseSession) {
            return { user: null, error: "An unknown error occurred during sign up." };
        }

        const newUser: UserSettings = {
            id: authResponseUser.id,
            email: cleanEmail,
            name: cleanName,
            is_anonymous: false,
            age: data.age,
            region: data.region,
            gender: data.gender,
            religion: data.religion,
            profession: data.profession,
            preferredLanguage: data.language,
            tonePreference: data.tone,
            voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
            therapistStyle: 'gentle', personalityMode: 'introvert', darkMode: false, isAdmin: false,
            stats: { totalActiveDays: 1, lastActiveDate: new Date().toLocaleDateString('en-CA'), badges: INITIAL_BADGES }
        };

        const { error: dbError } = await supabase.from('users').update({
            display_name: newUser.name,
            age: newUser.age,
            region: newUser.region,
            gender: newUser.gender,
            religion: newUser.religion,
            profession: newUser.profession,
            preferred_language: newUser.preferredLanguage,
            tone_preference: newUser.tonePreference,
            metadata: newUser.stats
        }).eq('id', newUser.id);

        if (dbError) {
            console.error("User DB Update Failed", dbError);
        }

        return { user: newUser, error: null };
    } catch (e: any) {
        // FIX: Removed custom CAPTCHA error handling to allow Supabase to manage it.
        return { user: null, error: e.message || "An unexpected error occurred." };
    }
};

export const loginUser = async (email: string, password: string): Promise<UserSettings | null> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error || !data.user) {
            if (error) console.error("Login error:", error.message);
            return null;
        }

        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (!profile) {
            return {
                id: data.user.id,
                email: data.user.email || '',
                name: 'User',
                is_anonymous: data.user.is_anonymous,
                age: 0, region: '', gender: 'Other', profession: 'Other',
                religion: 'Other',
                preferredLanguage: 'English', tonePreference: 'Soft',
                voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
                therapistStyle: 'gentle', personalityMode: 'introvert',
                darkMode: false, isAdmin: false,
                stats: { totalActiveDays: 0, lastActiveDate: '', badges: INITIAL_BADGES }
            };
        }

        return {
            id: profile.id,
            email: profile.email || data.user.email,
            name: profile.display_name || 'User',
            is_anonymous: data.user.is_anonymous,
            age: profile.age,
            region: profile.region,
            gender: profile.gender,
            religion: profile.religion || 'Other',
            profession: profile.profession,
            preferredLanguage: profile.preferred_language,
            tonePreference: profile.tone_preference,
            voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
            therapistStyle: 'gentle', personalityMode: 'introvert',
            darkMode: false,
            isAdmin: profile.role === 'admin' || profile.is_admin,
            stats: profile.metadata || { totalActiveDays: 0, lastActiveDate: '', badges: INITIAL_BADGES }
        };

    } catch (e) { return null; }
};

export const updateUserProfile = async (user: UserSettings) => {
    if (user.is_anonymous || user.id === 'admin') return;
    await supabase.from('users').update({
        display_name: user.name,
        age: user.age,
        region: user.region,
        gender: user.gender,
        religion: user.religion,
        profession: user.profession,
        preferred_language: user.preferredLanguage,
        tone_preference: user.tonePreference,
        metadata: user.stats,
        last_active_at: new Date().toISOString()
    }).eq('id', user.id);
};