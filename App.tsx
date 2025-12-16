
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { WelcomePage } from './pages/WelcomePage';
import { ChatPage } from './pages/ChatPage';
import { JournalPage } from './pages/JournalPage';
import { SettingsPage } from './pages/SettingsPage';
import { TherapistDirectory } from './pages/TherapistDirectory';
import { SupportPage } from './pages/SupportPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminBroadcast } from './pages/admin/Broadcast';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { TeamPage } from './pages/TeamPage';
import { TermsPage } from './pages/TermsPage';
import { CreditsPage } from './pages/CreditsPage';
import { CrisisPage } from './pages/CrisisPage';
import { StatusPage } from './pages/StatusPage';
import { TherapistDashboard } from './pages/TherapistDashboard';
import { UserSettings } from './types';
import { updateUserProfile } from './services/authService';

function App() {
  const [user, setUser] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState('chat');

  useEffect(() => {
    // URL Routing
    const path = window.location.pathname;
    if (path === '/status' || path === '/credits' || path === '/crisis-support') return;

    const storedUser = localStorage.getItem('sukoon_current_user');
    if (storedUser) {
        const u = JSON.parse(storedUser);
        setUser(u);
        if (u.isAdmin) setActiveTab('admin-dashboard');
        else if (u.role === 'therapist') setActiveTab('therapist-overview');
    }
  }, []);

  const handleUpdateUser = (updated: UserSettings) => {
      setUser(updated);
      if (!updated.is_anonymous) {
        updateUserProfile(updated);
        localStorage.setItem('sukoon_current_user', JSON.stringify(updated));
      }
      if (updated.darkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  };

  const handleLogin = (settings: UserSettings) => {
      handleUpdateUser(settings);
      if(settings.isAdmin) setActiveTab('admin-dashboard');
      else if (settings.role === 'therapist') setActiveTab('therapist-overview');
      else setActiveTab('chat');
  };

  const handleLogout = () => {
      localStorage.removeItem('sukoon_current_user');
      setUser(null);
      setActiveTab('chat');
  };

  // Standalone Pages
  if (window.location.pathname === '/status') return <StatusPage />;
  if (window.location.pathname === '/credits') return <CreditsPage />;
  if (window.location.pathname === '/crisis-support') return <CrisisPage />;
  
  if (!user) return <WelcomePage onComplete={handleLogin} />;

  // Render Logic
  const renderContent = () => {
    if (user.isAdmin) {
        if (activeTab === 'admin-broadcast') return <AdminBroadcast />;
        if (activeTab === 'therapist-dashboard') return <TherapistDashboard view="overview" />;
        if (activeTab.startsWith('admin-')) return <AdminDashboard currentView={activeTab} />;
    }

    if (user.role === 'therapist') {
        if (activeTab === 'notifications') return <NotificationsPage />;
        if (activeTab.startsWith('therapist-')) {
            const view = activeTab.replace('therapist-', '');
            return <TherapistDashboard view={view as any} />;
        }
    }

    switch(activeTab) {
      case 'chat': return <ChatPage settings={user} onUpdateUser={handleUpdateUser} onSignUp={handleLogout} />;
      case 'journal': return <JournalPage userId={user.id} />;
      case 'directory': return <TherapistDirectory />;
      case 'support': return <SupportPage />;
      case 'settings': return <SettingsPage settings={user} onUpdateSettings={handleUpdateUser} />;
      case 'profile': return <ProfilePage settings={user} />;
      case 'team': return <TeamPage />;
      case 'terms': return <TermsPage />;
      case 'notifications': return <NotificationsPage />;
      // Fallback for therapist
      case 'therapist-dashboard': return <TherapistDashboard view="overview" />;
      default: return <ChatPage settings={user} onUpdateUser={handleUpdateUser} onSignUp={handleLogout} />;
    }
  };

  return (
    <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        settings={user}
        onToggleDarkMode={() => handleUpdateUser({...user, darkMode: !user.darkMode})}
        onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
