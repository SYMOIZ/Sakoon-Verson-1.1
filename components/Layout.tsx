
import React, { useState, useRef, useEffect } from 'react';
import { UserSettings, Broadcast } from '../types';
import { getActiveBroadcasts, getUserNotifications } from '../services/dataService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
  settings: UserSettings;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

// ... (NotificationMenu and ChatMenu components remain unchanged) ...
const NotificationMenu = ({ role, onClose }: { role: string, onClose: () => void }) => {
    const notifications = [
        { id: 1, text: role === 'admin' ? "Critical Risk Alert: User #992" : role === 'therapist' ? "New Booking Request: 10:00 AM" : "Session starting in 10 mins", time: "2m ago", unread: true },
        { id: 2, text: role === 'admin' ? "New Therapist Application" : role === 'therapist' ? "Document Approved by Admin" : "Payment Verified by Admin", time: "1h ago", unread: false },
        { id: 3, text: role === 'admin' ? "Payment Screenshot Uploaded" : role === 'therapist' ? "Payment Processed: Nov Salary" : "New Message from Support", time: "3h ago", unread: false },
    ];

    return (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-100 dark:border-navy-700 overflow-hidden z-50 animate-fade-in">
            <div className="p-3 border-b border-slate-100 dark:border-navy-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Notifications</h3>
                <button onClick={onClose} className="text-xs text-slate-400 hover:text-teal-600">Mark all read</button>
            </div>
            <div className="max-h-64 overflow-y-auto">
                {notifications.map(n => (
                    <div key={n.id} className={`p-3 border-b border-slate-50 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors cursor-pointer ${n.unread ? 'bg-teal-50/50 dark:bg-navy-900/50' : ''}`}>
                        <div className="flex gap-3">
                            <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.unread ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                            <div>
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{n.text}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-2 text-center border-t border-slate-100 dark:border-navy-700">
                <button className="text-xs font-bold text-teal-600 hover:underline">View All</button>
            </div>
        </div>
    );
};

const ChatMenu = ({ role, onClose, onNavigate }: { role: string, onClose: () => void, onNavigate: (tab: string) => void }) => {
    let items = [];
    if (role === 'admin') items = [{ label: 'Therapist Support Tickets', icon: '🎫' }, { label: 'Student Help Requests', icon: '🙋' }];
    else if (role === 'therapist') items = [{ label: 'My Clients', icon: '👥' }, { label: 'Admin Hotline', icon: '🔥' }];
    else items = [{ label: 'My Therapist', icon: '🩺' }, { label: 'Support / Admin', icon: '🛡️' }];

    const handleItemClick = (label: string) => {
        if (role === 'therapist') {
            if (label === 'My Clients') onNavigate('therapist-patients');
            else if (label === 'Admin Hotline') onNavigate('therapist-support');
        } else if (role === 'admin') {
             // Updated navigation for Admin
             if (label === 'Therapist Support Tickets') onNavigate('admin-support');
             else if (label === 'Student Help Requests') onNavigate('admin-support');
             else onNavigate('admin-messages'); 
        } else {
             if (label === 'My Therapist') onNavigate('chat');
             else onNavigate('support');
        }
        onClose();
    };

    return (
        <div className="absolute right-12 top-12 w-64 bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-100 dark:border-navy-700 overflow-hidden z-50 animate-fade-in">
            <div className="p-3 border-b border-slate-100 dark:border-navy-700">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Messages & Support</h3>
            </div>
            <div>
                {items.map((item, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => handleItemClick(item.label)}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors flex items-center gap-3"
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, isActive, onClick, badge }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, badge?: number }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${
      isActive 
        ? 'bg-teal-50 dark:bg-navy-800 text-teal-600 dark:text-teal-400 font-bold shadow-sm' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-900 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
    }`}
  >
    <div className={`${isActive ? 'text-teal-600' : 'text-slate-400'}`}>{icon}</div>
    <span className="hidden lg:block whitespace-nowrap">{label}</span>
    {badge && badge > 0 ? (
        <span className="absolute right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">{badge}</span>
    ) : null}
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, settings, onToggleDarkMode, onLogout }) => {
  const isAdmin = settings.isAdmin;
  const isTherapist = settings.role === 'therapist';
  const role = isAdmin ? 'admin' : isTherapist ? 'therapist' : 'client';

  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Fetch Broadcasts & Unread Count
  useEffect(() => {
      // 1. Fetch Banner Broadcasts
      if (settings && !isAdmin) {
          getActiveBroadcasts(settings).then(broadcasts => {
              // Only critical banners
              const banner = broadcasts.find(b => b.type === 'critical');
              setBroadcast(banner || null);
          });
      }

      // 2. Fetch Notification Count
      getUserNotifications().then(notifs => {
          const unread = notifs.filter(n => !n.isRead).length;
          setUnreadCount(unread);
      });
  }, [settings, activeTab, isAdmin]);

  // Close menus on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
              setShowChatMenu(false);
              setShowNotifMenu(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`flex h-screen ${settings.darkMode ? 'dark' : ''} bg-beige-50 dark:bg-navy-900 overflow-hidden transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className="w-16 lg:w-64 bg-white dark:bg-navy-950 flex flex-col border-r border-lavender-200 dark:border-navy-800 shrink-0 shadow-sm z-20 transition-all duration-300">
          <div className="p-4 flex items-center gap-3 justify-center lg:justify-start">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-sans font-bold text-white shadow-lg shrink-0 ${isAdmin ? 'bg-slate-800' : isTherapist ? 'bg-teal-600' : 'bg-gradient-to-br from-lavender-400 to-teal-400'}`}>
                {isAdmin ? 'A' : isTherapist ? 'T' : 'S'}
            </div>
            <span className="hidden lg:block font-sans font-bold text-xl tracking-tight text-slate-800 dark:text-lavender-100">
                {isAdmin ? 'Admin Panel' : isTherapist ? 'Therapist Portal' : 'Sukoon'}
            </span>
          </div>

          <nav className="flex-1 w-full space-y-1 px-2 py-4 overflow-y-auto scrollbar-hide">
            {isAdmin ? (
                <>
                {/* Admin Nav Items (Unchanged) */}
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                    label="Dashboard" 
                    isActive={activeTab === 'admin-dashboard'} 
                    onClick={() => onTabChange('admin-dashboard')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
                    label="Therapists" 
                    isActive={activeTab === 'admin-therapists'} 
                    onClick={() => onTabChange('admin-therapists')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                    label="Messages" 
                    isActive={activeTab === 'admin-messages'} 
                    onClick={() => onTabChange('admin-messages')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    label="Support & Feedback" 
                    isActive={activeTab === 'admin-support'} 
                    onClick={() => onTabChange('admin-support')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    label="User Base" 
                    isActive={activeTab === 'admin-users'} 
                    onClick={() => onTabChange('admin-users')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="Finance" 
                    isActive={activeTab === 'admin-finance'} 
                    onClick={() => onTabChange('admin-finance')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                    label="Broadcasts" 
                    isActive={activeTab === 'admin-broadcast'} 
                    onClick={() => onTabChange('admin-broadcast')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                    label="Connections" 
                    isActive={activeTab === 'admin-connections'} 
                    onClick={() => onTabChange('admin-connections')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    label="Team Access" 
                    isActive={activeTab === 'admin-team'} 
                    onClick={() => onTabChange('admin-team')} 
                />
                </>
            ) : isTherapist ? (
                <>
                {/* Existing Therapist Nav... */}
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                    label="My Practice" 
                    isActive={activeTab === 'therapist-overview'} 
                    onClick={() => onTabChange('therapist-overview')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                    label="Notifications" 
                    isActive={activeTab === 'notifications'} 
                    onClick={() => onTabChange('notifications')} 
                    badge={unreadCount}
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    label="Calendar" 
                    isActive={activeTab === 'therapist-calendar'} 
                    onClick={() => onTabChange('therapist-calendar')}
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    label="My Patients" 
                    isActive={activeTab === 'therapist-patients'} 
                    onClick={() => onTabChange('therapist-patients')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                    label="My Wallet" 
                    isActive={activeTab === 'therapist-finance'} 
                    onClick={() => onTabChange('therapist-finance')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="Reputation" 
                    isActive={activeTab === 'therapist-analytics'} 
                    onClick={() => onTabChange('therapist-analytics')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    label="Profile & Setup" 
                    isActive={activeTab === 'therapist-profile'} 
                    onClick={() => onTabChange('therapist-profile')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    label="Support" 
                    isActive={activeTab === 'therapist-support'} 
                    onClick={() => onTabChange('therapist-support')} 
                />
                </>
            ) : (
                <>
                {/* Existing User Nav... */}
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                    label="Chat" 
                    isActive={activeTab === 'chat'} 
                    onClick={() => onTabChange('chat')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                    label="Notifications" 
                    isActive={activeTab === 'notifications'} 
                    onClick={() => onTabChange('notifications')} 
                    badge={unreadCount}
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                    label="Journal" 
                    isActive={activeTab === 'journal'} 
                    onClick={() => onTabChange('journal')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                    label="Therapists" 
                    isActive={activeTab === 'directory'} 
                    onClick={() => onTabChange('directory')} 
                />
                <NavItem 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
                    label="Support" 
                    isActive={activeTab === 'support'} 
                    onClick={() => onTabChange('support')} 
                />
                </>
            )}
            
            {/* Common User Items */}
            {!isAdmin && !isTherapist && (
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-navy-800">
                    <NavItem 
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        label="Profile" 
                        isActive={activeTab === 'profile'} 
                        onClick={() => onTabChange('profile')} 
                    />
                    <NavItem 
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        label="Settings" 
                        isActive={activeTab === 'settings'} 
                        onClick={() => onTabChange('settings')} 
                    />
                     <NavItem 
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                        label="Our Team" 
                        isActive={activeTab === 'team'} 
                        onClick={() => onTabChange('team')} 
                    />
                    <NavItem 
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        label="Terms" 
                        isActive={activeTab === 'terms'} 
                        onClick={() => onTabChange('terms')} 
                    />
                </div>
            )}
          </nav>
          
          <div className="p-4 border-t border-lavender-200 dark:border-navy-800 space-y-2">
            {isTherapist && (
                <button 
                    onClick={() => onTabChange('non-circumvention')}
                    className="w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-900 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="hidden lg:block text-sm font-medium">Terms</span>
                </button>
            )}
            <button 
                onClick={onToggleDarkMode} 
                className="w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-900 rounded-lg transition-colors"
                title="Toggle Theme"
            >
                {settings.darkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
                <span className="hidden lg:block text-sm font-medium">Theme</span>
            </button>
            <button 
                onClick={onLogout} 
                className="w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                title="Logout"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span className="hidden lg:block text-sm font-bold">Logout</span>
            </button>
          </div>
      </aside>

      <main className="flex-1 overflow-hidden relative flex flex-col">
          
          {/* Admin Broadcast Bar */}
          {broadcast && (
              <div className={`w-full px-4 py-2 flex justify-between items-center shadow-sm z-40 transition-colors ${
                  broadcast.type === 'critical' ? 'bg-rose-600 text-white' : 
                  broadcast.type === 'warning' ? 'bg-amber-100 text-amber-800 border-b border-amber-200' : 
                  'bg-indigo-600 text-white'
              }`}>
                  <div className="flex items-center gap-3">
                      <span className="text-lg animate-pulse">{broadcast.type === 'critical' ? '🚨' : broadcast.type === 'warning' ? '⚠️' : '📢'}</span>
                      <div className="text-sm font-medium">
                          <span className="font-bold mr-2 uppercase tracking-wide">{broadcast.title}:</span>
                          {broadcast.message}
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <button onClick={() => setBroadcast(null)} className="opacity-70 hover:opacity-100 text-lg leading-none">&times;</button>
                  </div>
              </div>
          )}

          {/* Global TopBar */}
          <div className="h-16 border-b border-slate-100 dark:border-navy-800 bg-white/80 dark:bg-navy-950/80 backdrop-blur-md flex justify-between items-center px-6 shrink-0 z-10" ref={headerRef}>
              <h1 className="font-bold text-lg text-slate-800 dark:text-white capitalize">
                  {activeTab.replace(/-/g, ' ').replace('therapist ', '')}
              </h1>
              
              <div className="flex items-center gap-4 relative">
                  {/* Chat Action */}
                  <button 
                    onClick={() => { setShowChatMenu(!showChatMenu); setShowNotifMenu(false); }} 
                    className="p-2 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors relative"
                  >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </button>
                  {showChatMenu && <ChatMenu role={role} onClose={() => setShowChatMenu(false)} onNavigate={onTabChange} />}

                  {/* Notification Action (Bell) */}
                  <button 
                    onClick={() => onTabChange('notifications')} 
                    className="p-2 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors relative"
                  >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                      {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-navy-950"></span>}
                  </button>

                  {/* Profile Avatar */}
                  <button onClick={() => onTabChange(isTherapist ? 'therapist-profile' : 'profile')} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-navy-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs overflow-hidden border border-slate-100 dark:border-navy-700">
                      {settings.name.charAt(0)}
                  </button>
              </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {children}
          </div>
      </main>
    </div>
  );
};

export default Layout;
