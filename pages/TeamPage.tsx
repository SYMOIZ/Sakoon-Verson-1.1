import React from 'react';

export const TeamPage: React.FC = () => {
  return (
    <div className="p-6 md:p-12 overflow-y-auto h-full max-w-4xl mx-auto text-center">
      <h1 className="text-4xl font-sans font-bold text-slate-800 dark:text-white mb-6">Our Team</h1>
      <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-16">
          The passionate minds behind Sakoon AI, working together to make mental wellness accessible to all.
      </p>

      <div className="grid md:grid-cols-3 gap-8 mb-20">
          <TeamMember name="Syed Moiz" role="Lead Developer" />
          <TeamMember name="Kunal Kumar" role="Backend & AI Engineer" />
          <TeamMember name="Pawan" role="UI/UX Designer" />
      </div>

      <div className="bg-slate-50 dark:bg-navy-950 p-10 rounded-3xl">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Final Year Project</h2>
          <p className="text-slate-500 dark:text-slate-400">
              Sakoon AI is a Final Year Project Prototype created with dedication by:
          </p>
          <div className="mt-6 flex flex-col gap-2 font-medium text-slate-700 dark:text-slate-300">
              <span>Syed Moiz</span>
              <span>Kunal Kumar</span>
              <span>Pawan</span>
          </div>
      </div>
    </div>
  );
};

const TeamMember = ({ name, role }: { name: string, role: string }) => (
    <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-navy-700 hover:-translate-y-2 transition-transform">
        <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-lavender-200 to-teal-200 rounded-full mb-6 flex items-center justify-center text-2xl font-bold text-slate-600">
            {name.charAt(0)}
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{name}</h3>
        <p className="text-teal-600 dark:text-teal-400 font-medium text-sm mt-1">{role}</p>
    </div>
);
