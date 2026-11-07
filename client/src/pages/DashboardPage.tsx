import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Users,
  CreditCard,
  ArrowUpRight,
  Building2,
  Receipt,
  ShieldCheck,
  BarChart3,
  LineChart,
  Calendar,
  Wallet,
  Coins,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Header } from '../components/layout/Header';
import { dashboardService } from '../services/api';
import { DashboardSummary, DashboardAnalytics } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { ClientModal } from '../components/clients/ClientModal';
import { PaymentModal } from '../components/payments/PaymentModal';

export const DashboardPage: React.FC = () => {
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();

  const [period, setPeriod] = useState<string>('all');
  const [chartView, setChartView] = useState<'area' | 'bar'>('area');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [recentActivity, setRecentActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quick modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, anaRes, actRes] = await Promise.all([
        dashboardService.getSummary({ period: period === 'all' ? undefined : period }),
        dashboardService.getAnalytics(),
        dashboardService.getRecentActivity(),
      ]);
      setSummary(sumRes.data.data);
      setAnalytics(anaRes.data.data);
      setRecentActivity(actRes.data.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const totalValue = summary?.totalProjectValue || 0;
  const totalReceived = summary?.totalAmountReceived || 0;
  const outstanding = summary?.outstandingAmount || 0;

  const recoveryRate = totalValue > 0 ? (totalReceived / totalValue) * 100 : 0;
  const pendingRate = totalValue > 0 ? (outstanding / totalValue) * 100 : 0;

  const settledPercentDisplay = useMemo(() => {
    if (totalValue <= 0) return '0%';
    if (outstanding <= 0) return '100%';
    const rate = (totalReceived / totalValue) * 100;
    // If there is outstanding balance due, never falsely display 100%
    if (rate >= 99.9) return '99.9%';
    return `${rate.toFixed(1)}%`;
  }, [totalReceived, totalValue, outstanding]);

  // Pie chart data for collection health ring
  const donutData = [
    { name: 'Collected', value: totalReceived, color: '#10B981' },
    { name: 'Outstanding', value: outstanding, color: '#F59E0B' },
  ];

  // Helper for client avatar initials
  const getInitials = (name?: string) => {
    if (!name) return 'CL';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title="Executive Construction Dashboard"
        subtitle="Real-time cashflow trajectory, verified receivables & GST invoice metrics"
        showDefaultActions={false}
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full pb-24">
        {/* Top Control Bar: Segmented Periods + Primary Quick Actions */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-soft">
          {/* Left: Date Filters Segmented Control */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2.5 mr-1 sm:mr-2 pr-2 sm:pr-3 border-r border-slate-200">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200/90 p-1 shadow-soft shrink-0">
                <img src="/logo.png?v=2" alt="Royal Logo" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block leading-tight">
                <span className="text-xs font-black text-slate-900 tracking-tight block">ROYAL</span>
                <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider block">ENGINEERING &amp; CONSTRUCTION</span>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden md:inline">
              Period:
            </span>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 overflow-x-auto max-w-full">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'this_year', label: 'This Year' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPeriod(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-200 ${
                    period === tab.id
                      ? 'bg-black text-white shadow-soft scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="hidden xl:flex items-center gap-2 ml-3 px-3 py-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[11px] font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FY 2026-27 Active</span>
            </div>
          </div>

          {/* Right: Primary Operational Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start sm:justify-end">
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-soft hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98]"
            >
              <Users className="w-3.5 h-3.5 text-brand-600" />
              <span>Add Client</span>
            </button>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl shadow-soft hover:bg-emerald-100 transition-all active:scale-[0.98]"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Record Payment</span>
            </button>

            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </Link>
          </div>
        </div>

        {/* 4 Ultra-Premium KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Project Value */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-800" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Project Value
              </span>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-soft group-hover:scale-110 transition-transform p-1.5">
                <img src="/logo.png?v=2" alt="Royal Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {formatCurrency(totalValue)}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{summary?.totalInvoices || 0} Projects</span>
                <span>· Gross invoiced contract value</span>
              </div>
            </div>
          </div>

          {/* Card 2: Amount Collected (With Recovery Progress Bar) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Amount Collected
              </span>
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight font-mono">
                {formatCurrency(totalReceived)}
              </p>
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-emerald-700">Realized Recovery</span>
                  <span className="text-emerald-700">{recoveryRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, recoveryRate)}%` }}
                  />
                </div>
                {Boolean((summary?.totalAdvances || 0) > 0) && (
                  <p className="text-[10px] text-slate-400 font-medium pt-0.5">
                    + {formatCurrency(summary?.totalAdvances || 0)} held as client advance
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Outstanding Receivables (With Pending Progress Bar) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-700 to-amber-950" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Outstanding Balance
              </span>
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight font-mono">
                {formatCurrency(outstanding)}
              </p>
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-amber-800">Unsettled Backlog</span>
                  <span className="text-amber-800">{pendingRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, pendingRate)}%` }}
                  />
                </div>
                {summary?.pendingInvoicesCount ? (
                  <p className="text-[10px] text-amber-700 font-semibold pt-0.5">
                    Across {summary.pendingInvoicesCount} pending invoice{summary.pendingInvoicesCount > 1 ? 's' : ''}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Card 4: Total Invoices & Client Count */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Invoices
              </span>
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200/70 group-hover:scale-110 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {summary?.totalInvoices || 0}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {summary?.paidInvoicesCount || 0} Settled
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {summary?.pendingInvoicesCount || 0} Pending
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Flow Trajectory (Left 68%) + Recovery Health Donut (Right 32%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Chart: Revenue vs Payment Inflow */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Revenue vs. Payment Collection Velocity
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Monthly trajectory of invoiced contract value against verified incoming client payments
                  </p>
                </div>

                {/* View Switcher & Indicators */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 text-xs font-bold mr-2">
                    <span className="flex items-center gap-1.5 text-brand-800">
                      <span className="w-3 h-3 rounded-md bg-brand-700 inline-block" /> Invoiced
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" /> Collected
                    </span>
                  </div>

                  <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                    <button
                      onClick={() => setChartView('area')}
                      title="Smooth Spline Trend"
                      className={`p-1.5 rounded-lg transition-all ${
                        chartView === 'area'
                          ? 'bg-white text-brand-700 shadow-soft'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <LineChart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setChartView('bar')}
                      title="Bar Comparison"
                      className={`p-1.5 rounded-lg transition-all ${
                        chartView === 'bar'
                          ? 'bg-white text-brand-700 shadow-soft'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Visual Canvas */}
              <div className="h-80 w-full pt-6">
                {analytics?.monthlyTrends && analytics.monthlyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartView === 'area' ? (
                      <AreaChart
                        data={analytics.monthlyTrends}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey="month"
                          stroke="#94A3B8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#94A3B8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                          tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val}`}
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            formatCurrency(Number(value)),
                            name === 'billed' ? 'Invoiced Amount' : 'Payment Received',
                          ]}
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px',
                            padding: '10px 14px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="billed"
                          stroke="#1E3A5F"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorBilled)"
                        />
                        <Area
                          type="monotone"
                          dataKey="collected"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorCollected)"
                        />
                      </AreaChart>
                    ) : (
                      <BarChart
                        data={analytics.monthlyTrends}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey="month"
                          stroke="#94A3B8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#94A3B8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                          tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val}`}
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            formatCurrency(Number(value)),
                            name === 'billed' ? 'Invoiced Amount' : 'Payment Received',
                          ]}
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px',
                            padding: '10px 14px',
                          }}
                        />
                        <Bar
                          dataKey="billed"
                          name="Invoiced Amount"
                          fill="#1E3A5F"
                          radius={[6, 6, 0, 0]}
                          barSize={24}
                        />
                        <Bar
                          dataKey="collected"
                          name="Payment Received"
                          fill="#10B981"
                          radius={[6, 6, 0, 0]}
                          barSize={24}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-mutedText">
                    Loading analytics trends...
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  Total Invoiced
                </span>
                <p className="text-sm font-bold text-brand-900 mt-0.5">{formatCurrency(totalValue)}</p>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100/80">
                <span className="text-emerald-700 font-bold uppercase text-[10px] tracking-wider">
                  Total Deposited
                </span>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(totalReceived)}</p>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100/80 col-span-2 sm:col-span-1">
                <span className="text-amber-800 font-bold uppercase text-[10px] tracking-wider">
                  Net Receivable
                </span>
                <p className="text-sm font-bold text-amber-700 mt-0.5">{formatCurrency(outstanding)}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Collection Efficiency & Channels */}
          <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Collection Efficiency
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Settlement ratio & payment method distribution
                </p>
              </div>

              {/* Donut Chart Ring */}
              <div className="relative h-56 flex items-center justify-center mt-2">
                {totalValue > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        innerRadius={65}
                        outerRadius={88}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          `${formatCurrency(Number(val))} (${((Number(val) / (totalValue || 1)) * 100).toFixed(1)}%)`,
                          name === 'Collected' ? 'Collected Funds' : 'Pending Receivables',
                        ]}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-mutedText">No settlement data yet</div>
                )}

                {/* Center Ring Metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {settledPercentDisplay}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${outstanding <= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {outstanding <= 0 ? 'Fully Settled' : 'Collected'}
                  </span>
                </div>
              </div>

              {/* Breakdown Bars */}
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-800">Collected Funds</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(totalReceived)}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-semibold text-slate-800">Pending Receivables</span>
                  </div>
                  <span className="font-mono font-bold text-amber-700">{formatCurrency(outstanding)}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className="pt-4 mt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                Deposit Channels
              </span>
              <div className="space-y-2">
                {analytics?.paymentMethods && analytics.paymentMethods.length > 0 ? (
                  analytics.paymentMethods.slice(0, 3).map((pm, idx) => {
                    const pct = totalReceived > 0 ? (pm.value / totalReceived) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-medium text-slate-700">{pm.name}</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(pm.value)} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-mutedText">No channel distribution recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Operational Ledger: Recent Invoices (Left) + Recent Payments (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices Ledger */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-50 text-brand-700 border border-brand-200/60">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      Recent Project Invoices
                    </h4>
                    <p className="text-[11px] text-slate-400">Latest issued and draft billing statements</p>
                  </div>
                </div>

                <Link
                  to="/invoices"
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 hover:underline"
                >
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentActivity?.recentInvoices && recentActivity.recentInvoices.length > 0 ? (
                  recentActivity.recentInvoices.map((inv: any) => (
                    <Link
                      key={inv._id}
                      to={`/invoices/${inv._id}`}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-slate-50/80 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Avatar */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 text-xs font-black uppercase shrink-0">
                          {getInitials(inv.clientSnapshot?.clientName)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-brand-900 group-hover:text-brand-600 transition-colors">
                              {inv.invoiceNumber}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                                inv.status
                              )}`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                            {inv.projectName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {inv.clientSnapshot?.clientName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                          {formatCurrency(inv.grandTotal)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(inv.invoiceDate)}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-mutedText py-6 text-center">No invoices created yet.</p>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <Link
                to="/invoices/new"
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" /> Create New Tax Invoice
              </Link>
            </div>
          </div>

          {/* Recent Payments Ledger */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      Recent Payment Deposits
                    </h4>
                    <p className="text-[11px] text-slate-400">Verified cashflow and client advances</p>
                  </div>
                </div>

                <Link
                  to="/payments"
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 hover:underline"
                >
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentActivity?.recentPayments && recentActivity.recentPayments.length > 0 ? (
                  recentActivity.recentPayments.map((p: any) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Green deposit icon */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                          <Coins className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {p.clientId?.clientName || 'Direct Client'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-semibold text-brand-800">
                              {p.invoiceId ? p.invoiceId.invoiceNumber : 'Direct Advance'}
                            </span>
                            <span>·</span>
                            <span className="px-1.5 py-0.2 bg-slate-200/60 text-slate-700 rounded text-[10px] font-semibold">
                              {p.paymentMethod}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm font-black text-emerald-600 font-mono">
                          + {formatCurrency(p.amount)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(p.paymentDate)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-mutedText py-6 text-center">No payment entries yet.</p>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" /> Record Incoming Payment
              </button>
            </div>
          </div>
        </div>

        {/* Quick Operations Dock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <Link
            to="/invoices/new"
            className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-slate-200 shadow-soft hover:shadow-premium hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 group-hover:bg-brand-700 group-hover:text-white transition-colors">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                Generate Invoice
              </p>
              <p className="text-[11px] text-slate-400">Create GST compliant bill</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-slate-200 shadow-soft hover:shadow-premium hover:-translate-y-0.5 transition-all group text-left"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Log Cash / Bank Receipt
              </p>
              <p className="text-[11px] text-slate-400">Record partial or full payment</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => setIsClientModalOpen(true)}
            className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-slate-200 shadow-soft hover:shadow-premium hover:-translate-y-0.5 transition-all group text-left"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                Add New Client
              </p>
              <p className="text-[11px] text-slate-400">Client profile & GSTIN</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <Link
            to="/settings"
            className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-slate-200 shadow-soft hover:shadow-premium hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                Company & GST Setup
              </p>
              <p className="text-[11px] text-slate-400">Bank accounts & invoice prefix</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </main>

      {/* Quick Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />
    </>
  );
};
