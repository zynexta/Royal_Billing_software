import React from 'react';
import { Menu, Plus, CreditCard, Sparkles, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onOpenSidebar: () => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showDefaultActions?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  title,
  subtitle,
  actions,
  showDefaultActions = true,
}) => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 sm:h-20 px-3 sm:px-8 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden transition-colors shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-slate-200/90 p-1 lg:hidden shrink-0 shadow-soft">
          <img src="/logo.png?v=2" alt="Royal Logo" className="w-full h-full object-contain" />
        </div>

        <div className="min-w-0">
          {title && (
            <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight truncate">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs font-medium text-slate-500 mt-0.5 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Side: Custom Actions OR Date & Default Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {actions ? (
          actions
        ) : showDefaultActions ? (
          <>
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDate}</span>
            </div>

            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-1.5 p-2 sm:px-4 sm:py-2 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98]"
              title="Create New Invoice"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Invoice</span>
            </Link>

            <Link
              to="/payments"
              state={{ openAddModal: true }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-soft hover:bg-slate-50 transition-all active:scale-[0.98]"
              title="Record Payment"
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Record Payment</span>
            </Link>
          </>
        ) : (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDate}</span>
          </div>
        )}
      </div>
    </header>
  );
};
