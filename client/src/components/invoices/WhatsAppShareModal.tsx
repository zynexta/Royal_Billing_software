import React, { useState, useEffect } from 'react';
import { X, Share2, FileText, Send, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { invoiceService } from '../../services/api';
import { getInvoiceWhatsAppUrl, openWhatsAppDirect } from '../../utils/whatsapp';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isSharingFile, setIsSharingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-load PDF in the background as soon as modal opens so file sharing is instant
  useEffect(() => {
    if (isOpen && invoice) {
      setErrorMsg(null);
      setIsLoadingPdf(true);
      const url = invoiceService.getPDFDownloadUrl(invoice._id);
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('Could not generate PDF');
          return res.blob();
        })
        .then((blob) => {
          setPdfBlob(blob);
          setIsLoadingPdf(false);
        })
        .catch((err) => {
          console.warn('PDF prefetch error:', err);
          setIsLoadingPdf(false);
        });
    } else {
      setPdfBlob(null);
      setIsLoadingPdf(false);
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const clientName = invoice.clientSnapshot?.clientName || 'Client';
  const clientPhone = invoice.clientSnapshot?.phone || 'No phone recorded';

  // 1. Share as real PDF Document File via Native OS Share (Supported on Android & iOS & Mac)
  const handleSharePdfDocument = async () => {
    try {
      setIsSharingFile(true);
      setErrorMsg(null);

      let blob = pdfBlob;
      if (!blob) {
        const res = await fetch(invoiceService.getPDFDownloadUrl(invoice._id));
        blob = await res.blob();
        setPdfBlob(blob);
      }

      const file = new File([blob], `${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice ${invoice.invoiceNumber} for ${invoice.projectName} from Royal Engineering & Construction.`,
          files: [file],
        });
        onClose();
      } else {
        // Fallback for desktops without file sharing: Open WhatsApp chat + download PDF
        handleDownload();
        openWhatsAppDirect(invoice);
        onClose();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg('Could not share file directly. Opening WhatsApp chat with direct PDF link instead...');
        setTimeout(() => {
          openWhatsAppDirect(invoice);
          onClose();
        }, 800);
      }
    } finally {
      setIsSharingFile(false);
    }
  };

  // 2. Open WhatsApp Chat directly with pre-filled message + Direct PDF Download Link
  const handleOpenWhatsAppChat = () => {
    openWhatsAppDirect(invoice);
    onClose();
  };

  // 3. Download PDF file
  const handleDownload = () => {
    const url = invoiceService.getPDFDownloadUrl(invoice._id);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoice.invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const supportsFileShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/70">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Send Invoice via WhatsApp</h3>
              <p className="text-xs text-slate-500 font-medium">{invoice.invoiceNumber} • {formatCurrency(invoice.grandTotal)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Client summary pill */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">{clientName}</span>
              <span className="font-mono text-emerald-700 font-semibold">{clientPhone}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Project: {invoice.projectName}</span>
              <span>{formatDate(invoice.invoiceDate)}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action 1: Send PDF Document directly (Best on Mobile) */}
          <button
            onClick={handleSharePdfDocument}
            disabled={isSharingFile}
            className="w-full flex items-center justify-between p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98] group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 text-white shrink-0">
                {isSharingFile || isLoadingPdf ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">Send PDF File to WhatsApp</p>
                <p className="text-xs text-emerald-100 font-medium">
                  Attaches official PDF invoice as a document
                </p>
              </div>
            </div>
            <Send className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Action 2: Send WhatsApp Chat message with PDF link */}
          <button
            onClick={handleOpenWhatsAppChat}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-900 rounded-2xl shadow-soft transition-all active:scale-[0.98] group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                <Share2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 tracking-tight">Open WhatsApp Chat</p>
                <p className="text-xs text-slate-500 font-medium">Includes invoice details & direct PDF download link</p>
              </div>
            </div>
            <Send className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Action 3: Just Download PDF */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF to Device</span>
          </button>
        </div>
      </div>
    </div>
  );
};
