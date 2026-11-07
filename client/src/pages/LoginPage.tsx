import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('admin@construction.com');
  const [password, setPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      toast.success('Welcome back! Signed in successfully.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex bg-[#F8FAFC] relative overflow-hidden font-sans">
      {/* Left Column: Construction Architecture Visual with Diagonal Cut */}
      <div className="hidden lg:block lg:w-[48%] xl:w-[50%] relative h-full shrink-0 [clip-path:polygon(0_0,100%_0,78%_100%,0_100%)] z-10 shadow-2xl bg-slate-900">
        <img
          src="/construction-hero.jpg"
          alt="Royal Engineering Construction Site"
          className="w-full h-full object-cover object-left"
        />
        {/* Subtle architectural gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />
      </div>

      {/* Right Column: Centered Royal Brand & Floating Sign-In Card (Strict Viewport Fit) */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:px-8 sm:py-6 relative z-20 h-full overflow-hidden bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9]/50">
        {/* Subtle decorative architectural blueprint wireframe watermark */}
        <div className="absolute bottom-0 right-0 w-72 h-72 opacity-[0.035] pointer-events-none select-none">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full stroke-black stroke-[1.5]">
            <rect x="20" y="40" width="160" height="140" />
            <line x1="20" y1="80" x2="180" y2="80" />
            <line x1="20" y1="120" x2="180" y2="120" />
            <line x1="60" y1="40" x2="60" y2="180" />
            <line x1="100" y1="40" x2="100" y2="180" />
            <line x1="140" y1="40" x2="140" y2="180" />
            <line x1="20" y1="40" x2="180" y2="180" />
            <line x1="180" y1="40" x2="20" y2="180" />
          </svg>
        </div>

        <div className="w-full max-w-[420px] flex flex-col items-center my-auto">
          {/* Top Brand Block: Centered Logo + Typography */}
          <div className="flex flex-col items-center text-center mb-3 sm:mb-4">
            <img
              src="/logo.png?v=2"
              alt="Royal Engineering & Construction Logo"
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm transition-transform hover:scale-105"
            />
            <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight mt-1.5 leading-none">
              ROYAL
            </h1>
            <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-600 uppercase tracking-[0.22em] mt-1">
              ENGINEERING &amp; CONSTRUCTION
            </p>
          </div>

          {/* Floating Elevated Login Card */}
          <div className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.07)] border border-slate-100/90 relative">
            {/* Pill Badge at Card Top */}
            <div className="flex justify-center mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200/90 bg-white text-[11px] font-semibold text-slate-700 shadow-sm">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Billing Suite</span>
              </div>
            </div>

            {/* Heading & Subtitle */}
            <div className="mb-4 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Sign In
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                Access your construction billing &amp; invoice management
              </p>
            </div>

            {/* Interactive Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email Address */}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-black focus:ring-black accent-black cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {/* Submit Pill Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1.5 py-3 px-6 rounded-full bg-black hover:bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? (
                  'Verifying...'
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Fill Demo Helper */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Admin: admin@construction.com</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@construction.com');
                  setPassword('Admin@123456');
                  toast.success('Demo credentials loaded!');
                }}
                className="font-bold text-slate-700 hover:text-black hover:underline"
              >
                Auto-fill
              </button>
            </div>
          </div>

          {/* Footer Copyright */}
          <p className="mt-3.5 text-[11px] text-slate-400 text-center">
            &copy; {new Date().getFullYear()} Royal Engineering &amp; Construction. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
