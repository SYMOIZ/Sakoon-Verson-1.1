
import { UserSettings, Badge, Gender, Profession, TonePreference, Language, TherapistApplication } from '../types';
import { supabase } from './supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import { saveTherapistApplication } from './dataService';

const INITIAL_BADGES: Badge[] = [
    { id: 'day-1', label: '1 Day', description: 'You showed up for yourself today.', icon: '🌱', requiredDays: 1 }
];

interface RegisterData {
    email: string;
    password: string;
    name: string;
    age: number;
    region: string;
    gender: string;
    profession: string;
    language: Language;
    tone: TonePreference;
    captchaToken?: string; // Added CAPTCHA support
}

interface RegisterTherapistData {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    yearsExperience: number;
    specialization: string;
    licenseNumber: string;
    cvFile: File | null;
    degreeFile: File | null;
    captchaToken?: string; // Added CAPTCHA support
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
            age: 25, region: 'Global', gender: 'Other', profession: 'Other',
            preferredLanguage: 'English', tonePreference: 'Calm',
            voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
            therapistStyle: 'gentle', personalityMode: 'introvert', darkMode: false, isAdmin: false,
            role: 'patient', accountStatus: 'active',
            stats: { totalActiveDays: 1, lastActiveDate: new Date().toLocaleDateString('en-CA'), badges: [] }
        };

        // An auth trigger creates a row in public.users. We update it with guest defaults.
        await supabase.from('users').update({
            display_name: guestSettings.name,
            age: guestSettings.age,
            region: guestSettings.region,
            gender: guestSettings.gender,
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

export const registerTherapist = async (data: RegisterTherapistData): Promise<{ user: UserSettings | null, applicationId: string | null, error: string | null }> => {
    try {
        // 1. Create Auth User with CAPTCHA
        const cleanEmail = data.email.trim();
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: data.password,
            options: { 
                data: { name: data.fullName, role: 'therapist' },
                captchaToken: data.captchaToken // Pass CAPTCHA
            }
        });

        if (signUpError) {
             if (signUpError.message.includes("already registered")) {
                return { user: null, applicationId: null, error: "Email already registered." };
            }
            throw signUpError;
        }

        const user = signUpData.user;
        if (!user) throw new Error("User creation failed.");

        // 2. Upload Files to Supabase Storage
        let cvPath = 'Not Provided';
        let degreePath = 'Not Provided';

        if (data.cvFile) {
            const fileName = `${user.id}/${Date.now()}_CV_${data.cvFile.name.replace(/\s+/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('therapist-documents').upload(fileName, data.cvFile);
            if (!uploadError) cvPath = fileName;
            else console.error("CV Upload Failed", uploadError);
        }

        if (data.degreeFile) {
            const fileName = `${user.id}/${Date.now()}_Degree_${data.degreeFile.name.replace(/\s+/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('therapist-documents').upload(fileName, data.degreeFile);
            if (!uploadError) degreePath = fileName;
            else console.error("Degree Upload Failed", uploadError);
        }

        // 3. Prepare Application Data
        const appId = crypto.randomUUID();
        const application: TherapistApplication = {
            id: appId,
            userId: user.id,
            fullName: data.fullName,
            email: cleanEmail,
            phone: data.phone,
            yearsExperience: data.yearsExperience,
            specialization: data.specialization,
            licenseNumber: data.licenseNumber,
            cvFileName: cvPath,
            degreeFileName: degreePath,
            status: 'pending',
            submittedAt: Date.now()
        };

        // 4. Save Application & Update User Metadata
        await saveTherapistApplication(application);

        // 5. Return Pending User Object
        const therapistUser: UserSettings = {
            id: user.id,
            email: cleanEmail,
            name: data.fullName,
            is_anonymous: false,
            // Defaults for profile
            age: 30, region: 'Unknown', gender: 'Other', profession: 'Working Professional',
            preferredLanguage: 'English', tonePreference: 'Calm',
            voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
            therapistStyle: 'gentle', personalityMode: 'introvert', 
            darkMode: false, isAdmin: false,
            role: 'therapist',
            accountStatus: 'pending', // IMPORTANT: LOCKED STATE
            stats: { totalActiveDays: 0, lastActiveDate: '', badges: [] }
        };

        return { user: therapistUser, applicationId: appId, error: null };

    } catch (e: any) {
        return { user: null, applicationId: null, error: e.message || "Registration failed." };
    }
};

export const registerUser = async (data: RegisterData): Promise<{ user: UserSettings | null, error: string | null }> => {
    try {
        const cleanEmail = data.email.trim();
        const cleanName = data.name.trim();

        const { data: { session } } = await supabase.auth.getSession();
        const isAnonymous = session?.user?.is_anonymous;

        let authResponseUser: User | null = null;
        let authResponseSession: Session | null = null;
        
        if (isAnonymous) {
            // Upgrade anonymous user
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
                email: cleanEmail,
                password: data.password,
                data: { 
                    name: cleanName, 
                    role: 'patient',
                    age: data.age,
                    region: data.region,
                    gender: data.gender,
                    profession: data.profession,
                    language: data.language,
                    tone: data.tone
                }
            });
            if (updateError) {
                if (updateError.message.includes("already registered") || updateError.message.includes("same value")) {
                    return { user: null, error: "This email is already registered. Please log in." };
                }
                throw updateError;
            }
            authResponseUser = updateData.user;
            const { data: newSessionData } = await supabase.auth.getSession();
            authResponseSession = newSessionData.session;
        } else {
            // New Signup with CAPTCHA
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: data.password,
                options: { 
                    data: { 
                        name: cleanName, 
                        role: 'patient',
                        age: data.age,
                        region: data.region,
                        gender: data.gender,
                        profession: data.profession,
                        language: data.language,
                        tone: data.tone
                    },
                    captchaToken: data.captchaToken // Pass CAPTCHA
                }
            });

            if (signUpError) {
                throw signUpError;
            }
            
            authResponseUser = signUpData.user;
            authResponseSession = signUpData.session;
        }

        if (authResponseUser && !authResponseSession) {
            // Usually indicates Email Confirmation is enabled on Supabase.
            // We return the user object but alert them to check email.
            return { user: null, error: "Account created! Please check your email to confirm." };
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
            profession: data.profession,
            preferredLanguage: data.language,
            tonePreference: data.tone,
            voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
            therapistStyle: 'gentle', personalityMode: 'introvert', darkMode: false, isAdmin: false,
            role: 'patient', accountStatus: 'active',
            stats: { totalActiveDays: 1, lastActiveDate: new Date().toLocaleDateString('en-CA'), badges: INITIAL_BADGES }
        };

        // Note: The database trigger 'handle_new_user' (in schema.sql) automatically populates public.users
        // We only need to return the user object here.

        return { user: newUser, error: null };
    } catch (e: any) {
        return { user: null, error: e.message || "An unexpected error occurred." };
    }
};

export const loginUser = async (email: string, password: string): Promise<{ user: UserSettings | null, error: string | null }> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error || !data.user) {
            if (error) console.error("Login error:", error.message);
            return { user: null, error: error?.message || "Invalid login credentials." };
        }

        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (!profile) {
            // Fallback if profile doesn't exist yet (e.g. legacy user)
            return {
                user: {
                    id: data.user.id,
                    email: data.user.email || '',
                    name: 'User',
                    is_anonymous: data.user.is_anonymous,
                    age: 0, region: '', gender: 'Other', profession: 'Other',
                    preferredLanguage: 'English', tonePreference: 'Soft',
                    voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
                    therapistStyle: 'gentle', personalityMode: 'introvert',
                    darkMode: false, isAdmin: false,
                    role: 'patient', accountStatus: 'active',
                    stats: { totalActiveDays: 0, lastActiveDate: '', badges: INITIAL_BADGES }
                },
                error: null
            };
        }

        // Check metadata for application status if they are a therapist
        let accountStatus: 'active' | 'pending' | 'suspended' = 'active';
        if (profile.metadata?.applicationStatus === 'pending') {
            accountStatus = 'pending';
        }

        return {
            user: {
                id: profile.id,
                email: profile.email || data.user.email,
                name: profile.display_name || 'User',
                is_anonymous: data.user.is_anonymous,
                age: profile.age,
                region: profile.region,
                gender: profile.gender,
                profession: profile.profession,
                preferredLanguage: profile.preferred_language,
                tonePreference: profile.tone_preference, // Maintaining compat
                voiceEnabled: false, autoPlayAudio: false, memoryEnabled: true,
                therapistStyle: 'gentle', personalityMode: 'introvert',
                darkMode: false,
                isAdmin: profile.role === 'admin' || profile.role === 'staff',
                role: profile.role === 'therapist' ? 'therapist' : profile.role === 'admin' ? 'admin' : 'patient',
                accountStatus: accountStatus,
                stats: profile.metadata || { totalActiveDays: 0, lastActiveDate: '', badges: INITIAL_BADGES }
            },
            error: null
        };

    } catch (e: any) { 
        return { user: null, error: e.message || "An unexpected login error occurred." }; 
    }
};

export const updateUserProfile = async (user: UserSettings) => {
    if (user.is_anonymous || user.id === 'admin') return;
    await supabase.from('users').update({
        display_name: user.name,
        age: user.age,
        region: user.region,
        gender: user.gender,
        profession: user.profession,
        preferred_language: user.preferredLanguage,
        tone_preference: user.tonePreference,
        metadata: user.stats,
        last_active_at: new Date().toISOString()
    }).eq('id', user.id);
};
