import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  FileText,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { clientService } from '../services/api';
import { Client } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ClientModal } from '../components/clients/ClientModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { useToast } from '../context/ToastContext';

export const ClientsPage: React.FC = () => {
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Deletion modal state
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await clientService.getClients({ search: search.trim() || undefined });
      setClients(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleEdit = (c: Client) => {
    setClientToEdit(c);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    try {
      setDeleteLoading(true);
      await clientService.deleteClient(clientToDelete._id);
      toast.success('Client record processed successfully.');
      setClientToDelete(null);
      fetchClients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove client');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title="Client Management"
        subtitle="Manage construction customers, track project billing & balances"
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24">
        {/* Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name, phone, GSTIN, city..."
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-soft"
            />
          </div>

          <button
            onClick={() => {
              setClientToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </button>
        </div>

        {/* Clients Table / Cards - Ultra Premium Styling */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-xs text-mutedText">Loading client accounts...</div>
          ) : clients.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No client accounts found</p>
              <p className="text-xs text-mutedText max-w-xs mx-auto">
                {search ? 'No clients matched your search filter.' : 'Add your first construction client to start generating invoices.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Client / Business</th>
                    <th className="py-4 px-4">Contact</th>
                    <th className="py-4 px-4">Location & GSTIN</th>
                    <th className="py-4 px-4 text-center">Quotations</th>
                    <th className="py-4 px-4 text-center">Invoices</th>
                    <th className="py-4 px-4 text-right">Total Billed</th>
                    <th className="py-4 px-4 text-right">Outstanding</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90">
                  {clients.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <Link to={`/clients/${c._id}`} className="block group">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-black group-hover:underline transition-colors">
                            {c.clientName}
                          </p>
                          {c.contactPerson && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{c.contactPerson}</p>
                          )}
                        </Link>
                      </td>

                      <td className="py-4 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-800 font-mono font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{c.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.city}, {c.state}</span>
                        </div>
                        {c.gstin ? (
                          <span className="inline-block font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                            GST: {c.gstin}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Unregistered</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-slate-800 border border-slate-200/80">
                          {c.quotationCount || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-slate-700">
                          {c.invoiceCount || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(c.totalBilled || 0)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono">
                        <span
                          className={`font-black ${
                            (c.outstandingBalance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(c.outstandingBalance || 0)}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/clients/${c._id}`}
                            title="View History"
                            className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleEdit(c)}
                            title="Edit Client"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setClientToDelete(c)}
                            title="Delete or Archive"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        clientToEdit={clientToEdit}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchClients()}
      />

      {/* Delete / Archive Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!clientToDelete}
        title="Remove or Archive Client"
        message={`Are you sure you want to remove '${clientToDelete?.clientName}'? If this client has active project invoices, it will be safely archived to protect financial audit history.`}
        confirmLabel="Confirm"
        isDestructive={true}
        isLoading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onClose={() => setClientToDelete(null)}
      />
    </>
  );
};

