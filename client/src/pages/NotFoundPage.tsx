import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-canvas p-6 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-white border border-slate-200/90 shadow-soft p-2 mb-6">
        <img src="/logo.png?v=2" alt="Royal Logo" className="w-full h-full object-contain" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
      <p className="text-sm font-semibold text-slate-700 mt-2">Billing Page Not Found</p>
      <p className="text-xs text-mutedText max-w-sm mt-1">
        The requested billing module or invoice record does not exist or has been moved.
      </p>

      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};

