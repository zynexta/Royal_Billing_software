import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { IInvoice } from '../models/Invoice.js';
import { ICompanySettings } from '../models/CompanySettings.js';

function getAssetPath(subPath: string): string {
  const candidates = [
    path.resolve(process.cwd(), 'assets', subPath),
    path.resolve(process.cwd(), 'server', 'assets', subPath),
    path.resolve(__dirname, '../../assets', subPath),
    path.resolve(__dirname, '../assets', subPath),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export function formatINR(val: number): string {
  const safeVal = Number(val) || 0;
  return '₹' + safeVal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatINRValue(val: number): string {
  const safeVal = Number(val) || 0;
  return safeVal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Crisp Vector Icons for PDFKit (resolution-independent)
function drawPinIcon(doc: any, x: number, y: number) {
  doc.save();
  doc.fillColor('#64748B').circle(x + 3.5, y + 3.5, 3.2).fill();
  doc.polygon([x + 0.8, y + 4.5], [x + 6.2, y + 4.5], [x + 3.5, y + 9]).fill();
  doc.fillColor('#FFFFFF').circle(x + 3.5, y + 3.5, 1.2).fill();
  doc.restore();
}

function drawMailIcon(doc: any, x: number, y: number) {
  doc.save();
  doc.strokeColor('#64748B').lineWidth(0.8).rect(x, y + 1.2, 9, 6.5).stroke();
  doc.moveTo(x, y + 1.2).lineTo(x + 4.5, y + 4.8).lineTo(x + 9, y + 1.2).stroke();
  doc.restore();
}

function drawPhoneIcon(doc: any, x: number, y: number) {
  doc.save();
  doc.strokeColor('#64748B').lineWidth(0.8).rect(x + 1, y, 6.5, 9).stroke();
  doc.moveTo(x + 2.5, y + 1.5).lineTo(x + 6, y + 1.5).stroke();
  doc.circle(x + 4.25, y + 7.5, 0.6).fill('#64748B');
  doc.restore();
}

function drawCardIcon(doc: any, x: number, y: number) {
  doc.save();
  doc.strokeColor('#64748B').lineWidth(0.8).rect(x, y + 1, 9, 6.5).stroke();
  doc.moveTo(x, y + 3).lineTo(x + 9, y + 3).stroke();
  doc.restore();
}

function drawUserIcon(doc: any, x: number, y: number) {
  doc.save();
  doc.fillColor('#475569').circle(x + 4, y + 3.5, 2.4).fill();
  doc.moveTo(x + 0.8, y + 9).bezierCurveTo(x + 0.8, y + 6.6, x + 7.2, y + 6.6, x + 7.2, y + 9).fill();
  doc.restore();
}

function drawDocIcon(doc: any, x: number, y: number) {
  doc.save();
  doc.strokeColor('#475569').lineWidth(0.8).rect(x + 1, y, 6.8, 9).stroke();
  doc.moveTo(x + 2.6, y + 3).lineTo(x + 6.2, y + 3).stroke();
  doc.moveTo(x + 2.6, y + 5).lineTo(x + 6.2, y + 5).stroke();
  doc.restore();
}

function drawBankIcon(doc: any, x: number, y: number) {
  doc.save();
  doc.fillColor('#475569');
  doc.polygon([x, y + 3], [x + 5, y], [x + 10, y + 3]).fill();
  doc.rect(x + 1.2, y + 3.8, 1.3, 4.2).fill();
  doc.rect(x + 4.4, y + 3.8, 1.3, 4.2).fill();
  doc.rect(x + 7.5, y + 3.8, 1.3, 4.2).fill();
  doc.rect(x, y + 8, 10, 1.2).fill();
  doc.restore();
}

export function generateInvoicePDF(
  invoice: IInvoice,
  settings: ICompanySettings | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 in
        info: {
          Title: `Tax Invoice ${invoice.invoiceNumber}`,
          Author: 'Royal Engineering & Construction',
          Subject: `Tax Invoice for ${invoice.projectName}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Fonts setup with Rupee support
      const regularFontPath = getAssetPath('fonts/Font-Regular.ttf');
      const boldFontPath = getAssetPath('fonts/Font-Bold.ttf');
      const hasCustomFonts = fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath);

      if (hasCustomFonts) {
        doc.registerFont('AppFont', regularFontPath);
        doc.registerFont('AppFont-Bold', boldFontPath);
      }

      const FONT_REGULAR = hasCustomFonts ? 'AppFont' : 'Helvetica';
      const FONT_BOLD = hasCustomFonts ? 'AppFont-Bold' : 'Helvetica-Bold';

      // Colors - Minimalist Luxury Black & White Palette
      const COLOR_BLACK = '#0F172A';
      const COLOR_CHARCOAL = '#18181B';
      const COLOR_DARK_GRAY = '#334155';
      const COLOR_MUTED = '#64748B';
      const COLOR_BORDER = '#E2E8F0';
      const COLOR_LIGHT_BG = '#F8FAFC';
      const COLOR_WHITE = '#FFFFFF';

      // Resolve Company Details
      const profile = settings?.companyProfile;
      const snapshot = invoice.companySnapshot;

      let companyName = profile?.companyName || snapshot?.companyName || 'ROYAL';
      let companySubtitle = profile?.subtitle || 'ENGINEERING & CONSTRUCTION';

      // If user entered full name like "Royal Engineering & Construction" and didn't set a custom subtitle
      if (companyName.toUpperCase().includes('ENGINEERING & CONSTRUCTION') && !profile?.subtitle) {
        companyName = 'ROYAL';
        companySubtitle = 'ENGINEERING & CONSTRUCTION';
      }

      const address = profile?.address || snapshot?.address || 'Tuvvur';
      const city = profile?.city || snapshot?.city || 'Malappuram Dt.';
      const state = profile?.state || snapshot?.state || 'Kerala';
      const pincode = profile?.pincode || snapshot?.pincode || '679 327';

      let phone = profile?.phone || snapshot?.phone || '+91 9544976383 | +91 9447676223';
      if (profile?.phone2 && !phone.includes(profile.phone2)) {
        phone = `${phone} | ${profile.phone2}`;
      }

      const email = profile?.email || snapshot?.email || 'royalengandconstruction@gmail.com';
      const gstin = profile?.gstin || snapshot?.gstin || '32GCDPP0980D1ZT';

      // Resolve Bank Details
      const bank = settings?.bankDetails || snapshot?.bankDetails || {
        bankName: 'HDFC Bank Ltd.',
        accountHolderName: 'Royal Engineering & Construction',
        accountNumber: '50200012345678',
        ifscCode: 'HDFC0001234',
        upiId: 'royalengandconstruction@hdfcbank',
      };

      // Resolve Terms & Conditions
      const termsSettingRaw = settings?.invoiceSettings?.termsAndConditions ||
        'Thank you for partnering with Royal Engineering & Construction.\nPayment to be made as per agreed terms.\nAny discrepancies should be reported within 7 days of invoice date.\nThis is a computer-generated tax invoice and does not require a physical signature.';

      const termsList = termsSettingRaw
        .split('\n')
        .map((t) => t.trim().replace(/^[•\-\*]\s*/, ''))
        .filter((t) => t.length > 0);

      // Resolve Signatory
      const signatoryCompany = settings?.invoiceSettings?.signatoryCompany ||
        (companySubtitle ? `For ${companyName} ${companySubtitle}` : `For ${companyName}`);
      const signatoryTitle = settings?.invoiceSettings?.signatoryTitle || 'Authorized Signatory';
      const signatureImage = settings?.invoiceSettings?.signatureImage;

      // Resolve Client
      const client = invoice.clientSnapshot;

      // ==========================================
      // 1. TOP HEADER SECTION
      // ==========================================

      // Left: Logo & Company Typography
      const logoPath = getAssetPath('logo.png');
      const hasLogo = fs.existsSync(logoPath);

      if (hasLogo) {
        try {
          doc.image(logoPath, 36, 36, { width: 44, height: 44 });
        } catch (e) {
          console.warn('Failed to embed logo image', e);
        }
      }

      // Vertical separator next to logo
      doc.save()
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .moveTo(88, 36)
        .lineTo(88, 80)
        .stroke()
        .restore();

      // Brand Typography
      doc.font(FONT_BOLD).fontSize(19).fillColor(COLOR_BLACK)
        .text(companyName, 96, 38, { characterSpacing: 1 });
      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY)
        .text(companySubtitle, 96, 59, { characterSpacing: 1.4 });

      // Company Address & Contact Metadata
      const metaY = 88;
      const fullAddress = `${address}, ${city}, ${state} - ${pincode}`;

      drawPinIcon(doc, 36, metaY);
      doc.font(FONT_REGULAR).fontSize(7.8).fillColor(COLOR_DARK_GRAY)
        .text(fullAddress, 50, metaY + 0.5);

      drawMailIcon(doc, 36, metaY + 13);
      doc.font(FONT_REGULAR).fontSize(7.8).fillColor(COLOR_DARK_GRAY)
        .text(email, 50, metaY + 13.5);

      drawPhoneIcon(doc, 36, metaY + 26);
      doc.font(FONT_REGULAR).fontSize(7.8).fillColor(COLOR_DARK_GRAY)
        .text(phone, 50, metaY + 26.5);

      drawCardIcon(doc, 36, metaY + 39);
      doc.font(FONT_REGULAR).fontSize(7.8).fillColor(COLOR_DARK_GRAY)
        .text(`GSTIN: ${gstin}`, 50, metaY + 39.5);

      // Right: TAX INVOICE Title & Meta Card
      doc.font(FONT_BOLD).fontSize(20).fillColor(COLOR_BLACK)
        .text('TAX INVOICE', 320, 39, { align: 'right', width: 239, characterSpacing: 0.5 });

      // Clean underline accent bar below TAX INVOICE
      doc.rect(474, 62, 85, 2.5).fill(COLOR_BLACK);

      // Meta Box (Invoice No. & Date)
      const metaBoxX = 339;
      const metaBoxY = 74;
      const metaBoxW = 220;
      const metaBoxH = 46;

      doc.roundedRect(metaBoxX, metaBoxY, metaBoxW, metaBoxH, 6)
        .fillAndStroke(COLOR_LIGHT_BG, COLOR_BORDER);

      // Vertical divider in meta box
      doc.moveTo(metaBoxX + 110, metaBoxY)
        .lineTo(metaBoxX + 110, metaBoxY + metaBoxH)
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .stroke();

      // Left Column: Invoice No.
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_MUTED)
        .text('Invoice No.', metaBoxX, metaBoxY + 8, { width: 110, align: 'center' });
      doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_BLACK)
        .text(invoice.invoiceNumber, metaBoxX, metaBoxY + 22, { width: 110, align: 'center' });

      // Right Column: Invoice Date
      const invoiceDateStr = new Date(invoice.invoiceDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_MUTED)
        .text('Invoice Date', metaBoxX + 110, metaBoxY + 8, { width: 110, align: 'center' });
      doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_BLACK)
        .text(invoiceDateStr, metaBoxX + 110, metaBoxY + 22, { width: 110, align: 'center' });

      // ==========================================
      // 2. BILLED TO & PROJECT DETAILS CARDS
      // ==========================================
      const cardsY = 148;
      const cardW = 256;
      const cardH = 114;
      const cardR = 6;

      // --- Left Card: Billed To ---
      doc.roundedRect(36, cardsY, cardW, cardH, cardR)
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .stroke();

      // Card Header Banner
      doc.roundedRect(36, cardsY, cardW, 23, cardR).fill(COLOR_LIGHT_BG);
      doc.rect(36, cardsY + 16, cardW, 7).fill(COLOR_LIGHT_BG); // square off bottom corners of header
      doc.moveTo(36, cardsY + 23).lineTo(36 + cardW, cardsY + 23).strokeColor(COLOR_BORDER).stroke();

      drawUserIcon(doc, 48, cardsY + 7);
      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY)
        .text('BILLED TO (CLIENT DETAILS)', 62, cardsY + 7.5);

      // Left Card Body
      doc.font(FONT_BOLD).fontSize(10.5).fillColor(COLOR_BLACK)
        .text(client.clientName, 46, cardsY + 31, { width: 236 });

      doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_DARK_GRAY);
      let curCY = cardsY + 46;

      if (client.contactPerson) {
        doc.text(`Contact: ${client.contactPerson}`, 46, curCY);
        curCY += 13;
      }

      drawPinIcon(doc, 46, curCY + 1);
      const clientAddressStr = `${client.billingAddress}, ${client.city}, ${client.state} - ${client.pincode}`;
      doc.text(clientAddressStr, 58, curCY, { width: 224 });
      curCY += 18;

      drawPhoneIcon(doc, 46, curCY + 1);
      const phoneGst = client.gstin
        ? `${client.phone}  |  GSTIN: ${client.gstin}`
        : `${client.phone}`;
      doc.text(phoneGst, 58, curCY, { width: 224 });

      // --- Right Card: Project & Invoice Details ---
      doc.roundedRect(303, cardsY, cardW, cardH, cardR)
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .stroke();

      // Card Header Banner
      doc.roundedRect(303, cardsY, cardW, 23, cardR).fill(COLOR_LIGHT_BG);
      doc.rect(303, cardsY + 16, cardW, 7).fill(COLOR_LIGHT_BG);
      doc.moveTo(303, cardsY + 23).lineTo(303 + cardW, cardsY + 23).strokeColor(COLOR_BORDER).stroke();

      drawDocIcon(doc, 315, cardsY + 7);
      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY)
        .text('PROJECT & INVOICE DETAILS', 329, cardsY + 7.5);

      // Right Card Body: Key-Value Lines
      const projRows = [
        { label: 'Project', value: invoice.projectName },
        { label: 'Location', value: invoice.projectLocation || invoice.projectName },
        {
          label: 'Due Date',
          value: new Date(invoice.dueDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        },
        { label: 'Payment Status', value: invoice.status.toUpperCase(), isBadge: true },
        { label: 'Terms', value: invoice.paymentTerms || 'Payment due within 15 days of invoice date.' },
      ];

      let curPY = cardsY + 31;
      projRows.forEach((r) => {
        doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_DARK_GRAY)
          .text(r.label, 315, curPY);
        doc.text(':', 382, curPY);

        if (r.isBadge) {
          // Pill badge for status
          const badgeText = r.value;
          const badgeW = doc.widthOfString(badgeText) + 12;
          doc.roundedRect(392, curPY - 1.5, badgeW, 13, 3)
            .fillAndStroke(COLOR_LIGHT_BG, '#CBD5E1');
          doc.font(FONT_BOLD).fontSize(7).fillColor(COLOR_BLACK)
            .text(badgeText, 392, curPY + 1, { width: badgeW, align: 'center' });
        } else {
          doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_BLACK)
            .text(r.value, 392, curPY, { width: 160 });
        }

        curPY += 15;
      });

      // ==========================================
      // 3. WORK ITEMS TABLE
      // ==========================================
      const tableY = 274;
      const tableW = 523;
      const headerH = 23;

      // Table Header: Solid Charcoal/Black
      doc.rect(36, tableY, tableW, headerH).fill(COLOR_CHARCOAL);

      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_WHITE);
      doc.text('#', 44, tableY + 7, { width: 22, align: 'center' });
      doc.text('DESCRIPTION OF WORK', 72, tableY + 7, { width: 228 });
      doc.text('QTY', 305, tableY + 7, { width: 40, align: 'center' });
      doc.text('UNIT', 350, tableY + 7, { width: 45, align: 'center' });
      doc.text('RATE (₹)', 400, tableY + 7, { width: 75, align: 'right' });
      doc.text('AMOUNT (₹)', 480, tableY + 7, { width: 73, align: 'right' });

      // Table Rows
      let rowY = tableY + headerH;
      const rowH = 22;

      invoice.items.forEach((item, index) => {
        const isZebra = index % 2 === 1;
        const rowBg = isZebra ? COLOR_LIGHT_BG : COLOR_WHITE;

        doc.rect(36, rowY, tableW, rowH).fill(rowBg);

        // Thin bottom border
        doc.moveTo(36, rowY + rowH)
          .lineTo(36 + tableW, rowY + rowH)
          .strokeColor(COLOR_LIGHT_BG === rowBg ? '#EDF2F7' : '#F1F5F9')
          .lineWidth(0.8)
          .stroke();

        doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_DARK_GRAY);
        doc.text(String(index + 1), 44, rowY + 6, { width: 22, align: 'center' });

        doc.fillColor(COLOR_BLACK);
        doc.text(item.description, 72, rowY + 6, { width: 228, ellipsis: true });

        doc.fillColor(COLOR_DARK_GRAY);
        doc.text(String(item.quantity), 305, rowY + 6, { width: 40, align: 'center' });
        doc.text(item.unit, 350, rowY + 6, { width: 45, align: 'center' });

        doc.fillColor(COLOR_BLACK);
        doc.text(formatINRValue(item.rate), 400, rowY + 6, { width: 75, align: 'right' });
        doc.text(formatINRValue(item.amount), 480, rowY + 6, { width: 73, align: 'right' });

        rowY += rowH;
      });

      // Bottom border for entire table
      doc.moveTo(36, rowY).lineTo(36 + tableW, rowY).strokeColor(COLOR_BORDER).lineWidth(1).stroke();

      // ==========================================
      // 4. BANK DETAILS & FINANCIAL SUMMARY
      // ==========================================
      const summaryTop = rowY + 14;

      // Left Box: Bank Details Card
      const bankCardW = 256;
      const bankCardH = 136;
      doc.roundedRect(36, summaryTop, bankCardW, bankCardH, 6)
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .stroke();

      // Header Banner
      doc.roundedRect(36, summaryTop, bankCardW, 23, 6).fill(COLOR_LIGHT_BG);
      doc.rect(36, summaryTop + 16, bankCardW, 7).fill(COLOR_LIGHT_BG);
      doc.moveTo(36, summaryTop + 23).lineTo(36 + bankCardW, summaryTop + 23).strokeColor(COLOR_BORDER).stroke();

      drawBankIcon(doc, 48, summaryTop + 7);
      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY)
        .text('BANK DETAILS & PAYMENT MODE', 64, summaryTop + 7.5);

      // Bank Details Table
      const bankRows = [
        { label: 'Bank Name', value: bank.bankName },
        { label: 'Account Holder', value: bank.accountHolderName },
        { label: 'Account No.', value: bank.accountNumber },
        { label: 'IFSC Code', value: bank.ifscCode },
        { label: 'UPI ID', value: bank.upiId || 'royalengandconstruction@hdfcbank' },
      ];

      let curBY = summaryTop + 33;
      bankRows.forEach((r) => {
        doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_DARK_GRAY)
          .text(r.label, 46, curBY);
        doc.text(':', 125, curBY);
        doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_BLACK)
          .text(r.value, 135, curBY, { width: 150 });
        curBY += 16;
      });

      // Note prompt at bottom of bank card
      doc.font(FONT_REGULAR).fontSize(7).fillColor(COLOR_MUTED)
        .text('Please quote invoice number while transferring funds.', 46, summaryTop + 118, { width: 236 });

      // Right Box: Financial Breakdown
      const rightX = 303;
      const rightW = 256;
      let fY = summaryTop;

      const addSummaryRow = (label: string, value: string, isBold: boolean = false) => {
        doc.font(isBold ? FONT_BOLD : FONT_REGULAR).fontSize(8.5).fillColor(COLOR_DARK_GRAY);
        doc.text(label, rightX + 8, fY + 2);
        doc.font(isBold ? FONT_BOLD : FONT_REGULAR).fontSize(8.5).fillColor(COLOR_BLACK);
        doc.text(value, rightX, fY + 2, { align: 'right', width: rightW - 8 });
        fY += 17;
      };

      addSummaryRow('Subtotal', formatINR(invoice.subtotal));

      if (invoice.discount && invoice.discount.amount > 0) {
        addSummaryRow(
          `Discount (${invoice.discount.type === 'Percentage' ? `${invoice.discount.value}%` : 'Fixed'})`,
          `- ${formatINR(invoice.discount.amount)}`
        );
      }

      if (invoice.additionalCharges && invoice.additionalCharges > 0) {
        addSummaryRow('Additional Charges', `+ ${formatINR(invoice.additionalCharges)}`);
      }

      addSummaryRow('Taxable Value', formatINR(invoice.taxableAmount), true);

      // GST Breakdown
      if (invoice.gstDetails?.isApplicable) {
        if (invoice.gstDetails.supplyType === 'Inter-State') {
          addSummaryRow(`IGST (${invoice.gstDetails.igstRate}%)`, formatINR(invoice.gstDetails.igstAmount));
        } else {
          addSummaryRow(`CGST (${invoice.gstDetails.cgstRate}%)`, formatINR(invoice.gstDetails.cgstAmount));
          addSummaryRow(`SGST (${invoice.gstDetails.sgstRate}%)`, formatINR(invoice.gstDetails.sgstAmount));
        }
      } else {
        addSummaryRow('GST (Exempted / Nil)', '₹0.00');
      }

      // Grand Total Solid Black Bar
      fY += 2;
      doc.rect(rightX, fY, rightW, 25).fill(COLOR_CHARCOAL);
      doc.font(FONT_BOLD).fontSize(9.5).fillColor(COLOR_WHITE);
      doc.text('GRAND TOTAL', rightX + 10, fY + 7);
      doc.text(formatINR(invoice.grandTotal), rightX, fY + 7, { align: 'right', width: rightW - 10 });
      fY += 31;

      // Amount Received & Balance Due
      addSummaryRow('Amount Received', formatINR(invoice.amountReceivedSnapshot || 0));

      const balanceDue = invoice.balanceDueSnapshot ?? (invoice.grandTotal - (invoice.amountReceivedSnapshot || 0));
      doc.font(FONT_BOLD).fontSize(9.5).fillColor(COLOR_BLACK);
      doc.text('Balance Due', rightX + 8, fY + 2);
      doc.text(formatINR(balanceDue), rightX, fY + 2, { align: 'right', width: rightW - 8 });
      fY += 20;

      // ==========================================
      // 5. FOOTER: TERMS & CONDITIONS & SIGNATURE
      // ==========================================
      const footerY = Math.max(summaryTop + bankCardH + 14, fY + 8);

      // Left Card: Terms & Conditions
      const termsW = 330;
      const termsH = 80;
      doc.roundedRect(36, footerY, termsW, termsH, 6)
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .stroke();

      // Terms Header
      doc.roundedRect(36, footerY, termsW, 21, 6).fill(COLOR_LIGHT_BG);
      doc.rect(36, footerY + 14, termsW, 7).fill(COLOR_LIGHT_BG);
      doc.moveTo(36, footerY + 21).lineTo(36 + termsW, footerY + 21).strokeColor(COLOR_BORDER).stroke();

      drawDocIcon(doc, 46, footerY + 6);
      doc.font(FONT_BOLD).fontSize(7.2).fillColor(COLOR_DARK_GRAY)
        .text('TERMS & CONDITIONS', 58, footerY + 6.5);

      let tY = footerY + 27;
      termsList.forEach((t) => {
        doc.font(FONT_REGULAR).fontSize(6.8).fillColor(COLOR_DARK_GRAY)
          .text(`•  ${t}`, 46, tY, { width: termsW - 20 });
        tY += 12;
      });

      // Right Card: Authorized Signatory
      const signW = 183;
      const signH = 80;
      const signX = 376;
      doc.roundedRect(signX, footerY, signW, signH, 6)
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .stroke();

      doc.font(FONT_REGULAR).fontSize(7.2).fillColor(COLOR_DARK_GRAY)
        .text(signatoryCompany, signX, footerY + 7, { align: 'center', width: signW });

      // Embed custom signature image or Draw Flowing Executive Digital Signature
      if (signatureImage && signatureImage.startsWith('data:image')) {
        try {
          const base64Data = signatureImage.split(',')[1];
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, signX + 25, footerY + 20, {
            fit: [133, 34],
            align: 'center',
            valign: 'center',
          });
        } catch (e) {
          // Fallback to vector signature
          drawVectorSig(doc, signX, footerY);
        }
      } else {
        drawVectorSig(doc, signX, footerY);
      }

      function drawVectorSig(d: any, sx: number, fy: number) {
        d.save()
          .strokeColor(COLOR_BLACK)
          .lineWidth(1.3)
          .lineCap('round')
          .lineJoin('round');

        const sX = sx + 46;
        const sY = fy + 39;

        d.moveTo(sX, sY)
          .bezierCurveTo(sX + 4, sY - 14, sX + 10, sY - 16, sX + 16, sY - 2)
          .bezierCurveTo(sX + 20, sY + 7, sX + 13, sY + 9, sX + 22, sY + 3)
          .bezierCurveTo(sX + 29, sY - 11, sX + 39, sY - 9, sX + 45, sY + 3)
          .bezierCurveTo(sX + 51, sY + 8, sX + 59, sY - 7, sX + 67, sY + 2)
          .bezierCurveTo(sX + 72, sY + 6, sX + 82, sY + 4, sX + 90, sY + 5)
          .stroke();
        d.restore();
      }

      // Divider line under signature
      doc.moveTo(signX + 24, footerY + 57)
        .lineTo(signX + signW - 24, footerY + 57)
        .strokeColor(COLOR_BORDER)
        .lineWidth(0.8)
        .stroke();

      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_BLACK)
        .text(signatoryTitle, signX, footerY + 63, { align: 'center', width: signW });

      // Bottom Legal Watermark Note
      const noteY = footerY + signH + 10;
      doc.font(FONT_REGULAR).fontSize(6.8).fillColor('#94A3B8')
        .text(
          'This is a computer-generated tax invoice. Generated via Royal Engineering & Construction Billing Suite.',
          36,
          noteY,
          { align: 'center', width: 523 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
