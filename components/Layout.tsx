
import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
  settings: UserSettings;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, settings, onToggleDarkMode, onLogout }) => {
  const isAdmin = settings.isAdmin;
  const isGuest = settings.id.startsWith('guest-');
  
  // Banner Persistence Logic
  const [showBanner, setShowBanner] = useState(() => {
      return !sessionStorage.getItem('websuite_banner_dismissed');
  });

  const dismissBanner = () => {
      sessionStorage.setItem('websuite_banner_dismissed', 'true');
      setShowBanner(false);
  }

  return (
    <div className={`flex h-screen ${settings.darkMode ? 'dark' : ''} bg-beige-50 dark:bg-navy-900 overflow-hidden transition-colors duration-300 flex-col`}>
      
      {/* WebSuite Global Ad Banner */}
      {showBanner && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs md:text-sm font-medium flex justify-between items-center z-50">
            <div className="flex items-center gap-2 mx-auto">
                <span className="opacity-80">Built with</span>
                <span className="font-bold text-teal-400">WebSuite by WebSyntex</span>
                <span className="hidden md:inline opacity-80">— Get a free website audit for your university project.</span>
            </div>
            <button onClick={dismissBanner} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-16 md:w-20 lg:w-64 bg-white dark:bg-navy-950 flex flex-col items-center lg:items-start py-6 border-r border-lavender-200 dark:border-navy-800 shrink-0 shadow-sm z-20 overflow-y-auto scrollbar-hide">
            <div className="mb-8 px-4 flex items-center gap-3 w-full justify-center lg:justify-start shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-sans font-bold text-white shadow-lg shrink-0 ${isAdmin ? 'bg-slate-800' : 'bg-gradient-to-br from-lavender-400 to-teal-400'}`}>
                {isAdmin ? 'A' : 'S'}
            </div>
            <span className="hidden lg:block font-sans font-bold text-xl tracking-tight text-slate-800 dark:text-lavender-100">
                {isAdmin ? 'Admin Panel' : 'Sakoon'}
            </span>
            </div>

            <nav className="flex-1 w-full space-y-2 px-3">
            {isAdmin ? (
                // --- ADMIN NAVIGATION ---
                <>
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                    label="Dashboard" 
                    isActive={activeTab === 'admin-dashboard'} 
                    onClick={() => onTabChange('admin-dashboard')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    label="Users" 
                    isActive={activeTab === 'admin-users'} 
                    onClick={() => onTabChange('admin-users')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
                    label="Therapists" 
                    isActive={activeTab === 'admin-therapists'} 
                    onClick={() => onTabChange('admin-therapists')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    label="Therapy Notes" 
                    isActive={activeTab === 'admin-notes'} 
                    onClick={() => onTabChange('admin-notes')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
                    label="Feedback" 
                    isActive={activeTab === 'admin-feedback'} 
                    onClick={() => onTabChange('admin-feedback')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    label="Analytics" 
                    isActive={activeTab === 'admin-analytics'} 
                    onClick={() => onTabChange('admin-analytics')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                    label="Emergency" 
                    isActive={activeTab === 'admin-emergency'} 
                    onClick={() => onTabChange('admin-emergency')} 
                />
                </>
            ) : (
                // --- USER NAVIGATION ---
                <>
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                    label="Chat" 
                    isActive={activeTab === 'chat'} 
                    onClick={() => onTabChange('chat')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                    label="Journal" 
                    isActive={activeTab === 'journal'} 
                    onClick={() => onTabChange('journal')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="My Profile" 
                    isActive={activeTab === 'profile'} 
                    onClick={() => onTabChange('profile')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    label="Find Therapist" 
                    isActive={activeTab === 'directory'} 
                    onClick={() => onTabChange('directory')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
                    label="Support Us" 
                    isActive={activeTab === 'support'} 
                    onClick={() => onTabChange('support')} 
                />
                <NavItem 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    label="Settings" 
                    isActive={activeTab === 'settings'} 
                    onClick={() => onTabChange('settings')} 
                />
                </>
            )}
            </nav>

            <div className="p-4 w-full shrink-0">
                {isGuest ? (
                    <div className="w-full mb-4 flex gap-2">
                        <button onClick={onLogout} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700">Log In</button>
                        <button onClick={onLogout} className="flex-1 py-2 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600">Join</button>
                    </div>
                ) : (
                    <button 
                        onClick={onLogout}
                        className="w-full mb-3 flex items-center justify-center lg:justify-start gap-3 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span className="hidden lg:block text-sm">Log Out</span>
                    </button>
                )}
                
                <button 
                    onClick={() => onTabChange(isAdmin ? 'admin-team' : 'team')}
                    className="w-full mb-1 text-center text-xs text-slate-400 hover:text-teal-500 hover:underline"
                >
                    Our Team & Credits
                </button>
                <button 
                    onClick={() => onTabChange(isAdmin ? 'admin-terms' : 'terms')}
                    className="w-full mb-3 text-center text-xs text-slate-400 hover:text-teal-500 hover:underline"
                >
                    Terms & Privacy
                </button>
                <button 
                    onClick={onToggleDarkMode}
                    className="w-full flex items-center justify-center lg:justify-start gap-3 p-2 rounded-lg hover:bg-lavender-100 dark:hover:bg-navy-800 text-slate-500 dark:text-lavender-300 transition-colors"
                    title="Toggle Dark Mode"
                >
                    {settings.darkMode ? (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            <span className="hidden lg:block text-sm">Light Mode</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                            <span className="hidden lg:block text-sm">Dark Mode</span>
                        </>
                    )}
                </button>
            </div>
        </aside>

        <main className="flex-1 relative flex flex-col h-full overflow-hidden bg-beige-50 dark:bg-navy-900 text-slate-800 dark:text-slate-100">
            {children}
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, isActive, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
      isActive 
        ? 'bg-slate-800 text-white shadow-md' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800'
    }`}
  >
    {icon}
    <span className="hidden lg:block font-medium">{label}</span>
  </button>
);

export default Layout;
