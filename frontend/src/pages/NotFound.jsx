import React from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="h-16 w-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2 animate-bounce">
        <AlertOctagon size={32} />
      </div>
      <h1 className="text-3xl font-bold text-slate-100">404 - Page Not Found</h1>
      <p className="text-slate-400 text-sm max-w-md">
        The corporate resource or policy manifest module you are looking for does not exist or you lack permission to access it.
      </p>
      <Link
        to="/"
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/15"
      >
        Return to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
