import React, { useState, useEffect } from 'react';
import { X, Share2, FileText, Send, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Quotation } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { quotationService } from '../../services/api';
import { getQuotationWhatsAppUrl, openQuotationWhatsAppDirect } from '../../utils/whatsapp';

interface QuotationWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onStatusChanged?: (updatedQuotation: Quotation) => void;
}

export const QuotationWhatsAppModal: React.FC<QuotationWhatsAppModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onStatusChanged,
}) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isSharingFile, setIsSharingFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-fetch PDF in background when modal opens
  useEffect(() => {
    if (isOpen && quotation) {
      setErrorMsg(null);
      setIsLoadingPdf(true);
      const url = quotationService.getPDFDownloadUrl(quotation._id);
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
          console.warn('PDF prefetch warning:', err);
          setIsLoadingPdf(false);
        });
    } else {
      setPdfBlob(null);
      setIsLoadingPdf(false);
    }
  }, [isOpen, quotation]);

  if (!isOpen || !quotation) return null;

  const clientName = quotation.clientSnapshot?.clientName || 'Client';
  const clientPhone = quotation.clientSnapshot?.phone || 'No phone recorded';

  // 1. Share real PDF document via native OS share (Android / iOS / Mac)
  const handleSharePdfDocument = async () => {
    try {
      setIsSharingFile(true);
      setErrorMsg(null);

      // Record send action if quotation is still in draft
      if (quotation.status === 'Draft') {
        quotationService.sendQuotation(quotation._id).then((res) => {
          if (res.data?.data && onStatusChanged) {
            onStatusChanged(res.data.data);
          }
        }).catch(() => {});
      }

      let blob = pdfBlob;
      if (!blob) {
        const res = await fetch(quotationService.getPDFDownloadUrl(quotation._id));
        blob = await res.blob();
        setPdfBlob(blob);
      }

      const file = new File([blob], `${quotation.quotationNumber}.pdf`, {
        type: 'application/pdf',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Quotation ${quotation.quotationNumber}`,
          text: `Quotation ${quotation.quotationNumber} for ${quotation.projectName} from Royal Engineering & Construction.`,
          files: [file],
        });
        onClose();
      } else {
        // Fallback for desktop: download PDF + open WhatsApp
        handleDownload();
        openQuotationWhatsAppDirect(quotation);
        onClose();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg('Could not launch direct file share. Opening WhatsApp chat with direct PDF link instead...');
        setTimeout(() => {
          openQuotationWhatsAppDirect(quotation);
          onClose();
        }, 800);
      }
    } finally {
      setIsSharingFile(false);
    }
  };

  // 2. Open WhatsApp chat directly
  const handleOpenWhatsAppChat = () => {
    if (quotation.status === 'Draft') {
      quotationService.sendQuotation(quotation._id).then((res) => {
        if (res.data?.data && onStatusChanged) {
          onStatusChanged(res.data.data);
        }
      }).catch(() => {});
    }
    openQuotationWhatsAppDirect(quotation);
    onClose();
  };

  // 3. Download PDF file
  const handleDownload = () => {
    const url = quotationService.getPDFDownloadUrl(quotation._id);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quotation.quotationNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Copy summary text
  const handleCopy = () => {
    const text =
      `*ROYAL ENGINEERING & CONSTRUCTION — QUOTATION*\n` +
      `Quotation No: ${quotation.quotationNumber}\n` +
      `Project: ${quotation.projectName}\n` +
      `Client: ${clientName}\n` +
      `Estimated Amount: ${formatCurrency(quotation.estimatedGrandTotal)}\n` +
      `Valid Until: ${formatDate(quotation.validUntil)}\n` +
      `Direct PDF: ${quotationService.getPDFDownloadUrl(quotation._id)}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-premium border border-slate-200/90 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-700">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">
                Share Quotation
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {quotation.quotationNumber} • {quotation.projectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-black rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quotation Snapshot Card */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Client</span>
              <span className="font-bold text-slate-900">{clientName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Contact Phone</span>
              <span className="font-mono font-medium text-slate-900">{clientPhone}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Estimated Total</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {formatCurrency(quotation.estimatedGrandTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Valid Until</span>
              <span className="font-medium text-slate-900">{formatDate(quotation.validUntil)}</span>
            </div>
          </div>

          {/* Share Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {/* 1. Direct PDF File Share (Supported on Mobile/Native) */}
            <button
              onClick={handleSharePdfDocument}
              disabled={isSharingFile}
              className="w-full flex items-center justify-between px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-soft transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {isSharingFile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <div className="text-left">
                  <div>Share PDF File Directly</div>
                  <div className="text-[10px] font-normal text-emerald-100">
                    Sends actual PDF document to WhatsApp / OS
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-800/40 px-2 py-0.5 rounded-full font-mono uppercase">
                Direct
              </span>
            </button>

            {/* 2. Open WhatsApp Chat with Direct PDF Download Link */}
            <button
              onClick={handleOpenWhatsAppChat}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 hover:border-black text-slate-800 hover:text-black rounded-2xl font-bold text-xs shadow-soft transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Send className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <div>Send WhatsApp Message + Link</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    Pre-filled message with direct PDF link
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-mono text-slate-600">
                Chat Link
              </span>
            </button>

            {/* 3. Download PDF */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

