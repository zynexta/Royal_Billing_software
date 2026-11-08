import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  CreditCard,
  Settings,
  LogOut,
  Building2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navSections = [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { label: 'Clients', to: '/clients', icon: Users },
      ],
    },
    {
      title: 'DOCUMENT MANAGEMENT',
      items: [
        { label: 'Quotations', to: '/quotations', icon: ClipboardList },
        { label: 'Tax Invoices', to: '/invoices', icon: FileText },
      ],
    },
    {
      title: 'FINANCIAL',
      items: [
        { label: 'Payments', to: '/payments', icon: CreditCard },
      ],
    },
    {
      title: 'CONFIGURATION',
      items: [
        { label: 'Settings', to: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container - Clean Luxury White & Black Theme */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200/90 text-slate-900 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Brand Header */}
        <div className="flex items-center justify-between h-20 px-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-slate-200/90 shadow-soft p-1 shrink-0">
              <img src="/logo.png?v=2" alt="Royal Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">
                ROYAL
              </h1>
              <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mt-1 truncate">
                ENGINEERING &amp; CONSTRUCTION
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-black lg:hidden transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links - Pitch Black Active Buttons */}
        <div className="flex-1 px-4 py-5 space-y-4 overflow-y-auto">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-3 mb-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 group ${
                        isActive
                          ? 'bg-black text-white shadow-md shadow-black/10 scale-[1.01]'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-black'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Enterprise Edition Badge */}
        <div className="px-4 py-2">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-800 text-[10px] font-bold uppercase tracking-wider">
              <span>Enterprise Edition</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              GST Compliant Construction Invoicing & Cashflow
            </p>
          </div>
        </div>

        {/* User Account Profile & Logout */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-black text-white text-xs font-black uppercase shrink-0">
                {user?.name ? user.name[0] : 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Admin User'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@construction.com'}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
