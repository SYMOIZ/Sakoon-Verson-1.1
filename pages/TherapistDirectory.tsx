import React, { useState, useEffect } from 'react';
import { getTherapists } from '../services/dataService';
import { Therapist } from '../types';

export const TherapistDirectory: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTherapists().then(data => {
        setTherapists(data);
        setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 md:p-12 overflow-y-auto h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-sans font-bold text-slate-800 dark:text-white mb-2">Find a Professional</h1>
        <p className="text-slate-500 dark:text-slate-400">
            Connect with licensed human therapists for deeper, clinical support. Sakoon AI is not a medical service.
        </p>
      </div>

      {loading ? (
          <div className="text-center text-slate-400 py-12">Loading directory...</div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {therapists.map(therapist => (
              <div key={therapist.id} className="bg-white dark:bg-navy-800 rounded-3xl shadow-sm border border-slate-100 dark:border-navy-700 overflow-hidden hover:shadow-md transition-shadow">
                 <div className="h-32 bg-gradient-to-r from-teal-100 to-lavender-100 dark:from-navy-700 dark:to-navy-800 relative">
                    {therapist.imageUrl && <img src={therapist.imageUrl} className="w-full h-full object-cover opacity-50" />}
                 </div>
                 
                 <div className="p-6 relative">
                     <div className="absolute -top-12 left-6 w-20 h-20 rounded-full bg-white dark:bg-navy-900 border-4 border-white dark:border-navy-800 shadow-md flex items-center justify-center text-2xl font-bold text-slate-400">
                        {therapist.imageUrl ? <img src={therapist.imageUrl} className="w-full h-full rounded-full object-cover" /> : therapist.name[0]}
                     </div>
                     
                     <div className="mt-8">
                         <h2 className="text-xl font-bold text-slate-800 dark:text-white">{therapist.name}</h2>
                         <p className="text-teal-600 dark:text-teal-400 text-sm font-semibold mb-2">{therapist.specialty}</p>
                         
                         <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {therapist.location}
                         </div>

                         <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 line-clamp-3">
                             {therapist.bio}
                         </p>

                         <div className="flex flex-wrap gap-2 mb-6">
                             {therapist.languages.map(lang => (
                                 <span key={lang} className="px-2 py-1 bg-slate-100 dark:bg-navy-900 text-slate-600 dark:text-slate-300 text-xs rounded-lg">
                                     {lang}
                                 </span>
                             ))}
                             <span className="px-2 py-1 bg-lavender-50 dark:bg-navy-900 text-lavender-600 dark:text-lavender-300 text-xs rounded-lg">
                                 {therapist.experience} Years Exp.
                             </span>
                         </div>

                         <div className="pt-4 border-t border-slate-100 dark:border-navy-700">
                             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Available Slots</h3>
                             <div className="flex flex-wrap gap-2">
                                 {therapist.availableSlots && therapist.availableSlots.map((slot, i) => (
                                     <a 
                                        key={i}
                                        href={therapist.bookingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 border border-teal-200 dark:border-navy-600 text-teal-700 dark:text-teal-400 text-xs rounded-lg hover:bg-teal-50 dark:hover:bg-navy-700 transition-colors"
                                     >
                                         {slot.day} {slot.time}
                                     </a>
                                 ))}
                             </div>
                         </div>
                         
                         <a 
                            href={therapist.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full mt-6 block text-center py-3 bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity"
                         >
                             Book Session (External)
                         </a>
                     </div>
                 </div>
              </div>
            ))}
          </div>
      )}
    </div>
  );
};