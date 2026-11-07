export function formatCurrency(amount: number | undefined | null): string {
  const safe = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(safe);
}

export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Paid':
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-600/10';
    case 'Partially Paid':
      return 'bg-blue-50 text-blue-700 border-blue-200/80 ring-1 ring-blue-600/10';
    case 'Issued':
      return 'bg-amber-50 text-amber-700 border-amber-200/80 ring-1 ring-amber-600/10';
    case 'Draft':
      return 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-600/10';
    case 'Overdue':
      return 'bg-rose-50 text-rose-700 border-rose-200/80 ring-1 ring-rose-600/10';
    case 'Cancelled':
    case 'Reversed':
      return 'bg-zinc-100 text-zinc-500 border-zinc-200 line-through';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

