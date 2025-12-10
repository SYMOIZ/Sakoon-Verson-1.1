import React from 'react';

export const SupportPage: React.FC = () => {
  return (
    <div className="p-6 md:p-12 overflow-y-auto h-full max-w-4xl mx-auto">
       <div className="text-center mb-12">
            <h1 className="text-4xl font-sans font-bold text-slate-800 dark:text-white mb-4">Help Us Heal</h1>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Sukoon AI is on a mission to make emotional support accessible, private, and stigma-free for everyone, everywhere.
            </p>
       </div>

       <div className="grid md:grid-cols-2 gap-8 mb-12">
           <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-navy-700">
                <div className="w-12 h-12 bg-lavender-100 text-lavender-600 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Our Promise</h2>
                <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                        <span className="text-teal-500">✓</span> Always private & encrypted
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-teal-500">✓</span> Free access to basic support
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-teal-500">✓</span> No judgment, ever
                    </li>
                </ul>
           </div>
           
           <div className="bg-gradient-to-br from-lavender-500 to-teal-500 text-white p-8 rounded-3xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Support Our Devs</h2>
                <p className="mb-6 opacity-90">
                    We are a small team of developers and mental health advocates building this out of passion. Your donation helps keep the servers running and the lights on.
                </p>
                <button 
                    onClick={() => alert("This would open a Stripe/PayPal link in production.")}
                    className="w-full py-3 bg-white text-lavender-600 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-md"
                >
                    Donate $5
                </button>
                <div className="text-center mt-4 text-xs opacity-75">
                    Donations are voluntary and not required to use the app.
                </div>
           </div>
       </div>

       <div className="bg-slate-50 dark:bg-navy-950 p-8 rounded-3xl text-center">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Transparency</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">
                Sukoon AI is a technology demonstration. We are not a licensed medical provider. All funds go directly to hosting costs and further development of the AI models.
            </p>
       </div>
    </div>
  );
};