import React from 'react';
import { UserSettings } from '../types';

interface ProfilePageProps {
  settings: UserSettings;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ settings }) => {
  const { stats } = settings;

  return (
    <div className="p-6 md:p-12 overflow-y-auto h-full max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-lavender-400 to-teal-400 flex items-center justify-center shadow-lg text-3xl font-bold text-white">
              {settings.name.charAt(0)}
          </div>
          <div>
              <h1 className="text-3xl font-sans font-bold text-slate-800 dark:text-white">{settings.name}</h1>
              <p className="text-slate-500 dark:text-slate-400">Member since {new Date().getFullYear()}</p>
          </div>
      </div>

      {/* Streak Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-navy-700 flex flex-col items-center justify-center text-center">
              <div className="text-5xl font-bold text-teal-500 mb-2">{stats.totalActiveDays}</div>
              <div className="text-sm uppercase tracking-wide font-bold text-slate-400">Total Active Days</div>
              <div className="text-xs text-slate-400 mt-2">Every step counts.</div>
          </div>
          
          <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-navy-700 flex flex-col items-center justify-center text-center">
              <div className="text-5xl font-bold text-lavender-500 mb-2">{stats.badges.filter(b => b.unlockedAt).length}</div>
              <div className="text-sm uppercase tracking-wide font-bold text-slate-400">Badges Earned</div>
              <div className="text-xs text-slate-400 mt-2">Milestones on your journey.</div>
          </div>
      </div>

      {/* Badges Collection */}
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Badge Collection</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.badges.map(badge => (
              <div 
                key={badge.id}
                className={`p-6 rounded-2xl border flex flex-col items-center text-center transition-all ${
                    badge.unlockedAt 
                    ? 'bg-white dark:bg-navy-800 border-teal-200 dark:border-navy-600 shadow-sm' 
                    : 'bg-slate-50 dark:bg-navy-900 border-slate-100 dark:border-navy-800 opacity-50 grayscale'
                }`}
              >
                  <div className="text-4xl mb-3">{badge.icon}</div>
                  <div className="font-bold text-slate-800 dark:text-white">{badge.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{badge.description}</div>
                  {badge.unlockedAt && (
                      <div className="mt-3 px-2 py-1 bg-teal-50 dark:bg-navy-950 text-teal-600 dark:text-teal-400 text-[10px] rounded-full font-bold">
                          Earned
                      </div>
                  )}
              </div>
          ))}
      </div>
    </div>
  );
};
