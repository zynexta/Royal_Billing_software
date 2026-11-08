import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { IQuotation } from '../models/Quotation.js';
import { ICompanySettings } from '../models/CompanySettings.js';

function getAssetPath(subPath: string): string {
  const candidates = [
    path.resolve(process.cwd(), 'assets', subPath),
    path.resolve(process.cwd(), 'server', 'assets', subPath),
    path.resolve(process.cwd(), '..', 'assets', subPath),
    path.resolve(process.cwd(), 'dist', 'assets', subPath),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export function formatINR(val: number): string {
  const safeVal = Number(val) || 0;
  return (
    '₹' +
    safeVal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
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

export function generateQuotationPDF(
  quotation: IQuotation,
  settings: ICompanySettings | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 in
        bufferPages: true,
        info: {
          Title: `Quotation ${quotation.quotationNumber}`,
          Author: 'Royal Engineering & Construction',
          Subject: `Commercial Cost Estimate for ${quotation.projectName}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Fonts setup
      const regularFontPath = getAssetPath('fonts/Font-Regular.ttf');
      const boldFontPath = getAssetPath('fonts/Font-Bold.ttf');
      const hasCustomFonts = fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath);

      if (hasCustomFonts) {
        doc.registerFont('AppFont', regularFontPath);
        doc.registerFont('AppFont-Bold', boldFontPath);
      }

      const FONT_REGULAR = hasCustomFonts ? 'AppFont' : 'Helvetica';
      const FONT_BOLD = hasCustomFonts ? 'AppFont-Bold' : 'Helvetica-Bold';

      // Monochrome luxury colors
      const COLOR_BLACK = '#0F172A';
      const COLOR_CHARCOAL = '#18181B';
      const COLOR_DARK_GRAY = '#334155';
      const COLOR_MUTED = '#64748B';
      const COLOR_BORDER = '#CBD5E1';
      const COLOR_LIGHT_BG = '#F8FAFC';
      const COLOR_WHITE = '#FFFFFF';

      // Company Info
      const profile = settings?.companyProfile;
      const snapshot = quotation.companySnapshot;

      let companyName = profile?.companyName || snapshot?.companyName || 'ROYAL';
      let companySubtitle = profile?.subtitle || 'ENGINEERING & CONSTRUCTION';
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

      // Terms
      const termsSettingRaw =
        quotation.termsAndConditions ||
        settings?.quotationSettings?.termsAndConditions ||
        '• Rates quoted are valid for 30 days from date of issue.\n• Taxes are estimated and applicable as per prevailing GST rules upon tax invoice generation.\n• Extra items or structural scope variations will be billed separately upon mutual consent.\n• Mobilization will commence upon formal acceptance & agreed advance.';

      const termsList = termsSettingRaw
        .split('\n')
        .map((t) => t.trim().replace(/^[•\-\*]\s*/, ''))
        .filter((t) => t.length > 0);

      const signatoryCompany =
        settings?.invoiceSettings?.signatoryCompany ||
        (companySubtitle ? `For ${companyName} ${companySubtitle}` : `For ${companyName}`);

      const client = quotation.clientSnapshot;
      const logoPath = getAssetPath('logo.png');
      const hasLogo = fs.existsSync(logoPath);

      const tableW = 523;
      const rowH = 20;
      const headerH = 22;

      // ==========================================
      // HELPER: DRAW PAGE 1 TOP HEADER & PARTICULARS
      // ==========================================
      const drawFirstPageHeader = (): number => {
        // Logo
        if (hasLogo) {
          try {
            doc.image(logoPath, 36, 36, { width: 44, height: 44 });
          } catch (e) {
            console.warn('Failed to embed logo image', e);
          }
        }

        // Separator
        doc.save().strokeColor(COLOR_BORDER).lineWidth(1).moveTo(88, 36).lineTo(88, 80).stroke().restore();

        // Brand Typography
        doc.font(FONT_BOLD).fontSize(19).fillColor(COLOR_BLACK).text(companyName, 96, 37, { characterSpacing: 1 });
        doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(companySubtitle, 96, 58, { characterSpacing: 1.4 });

        // Company Details
        let cY = 86;
        const lh = 12;

        drawPinIcon(doc, 36, cY);
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(`${address}, ${city}, ${state} - ${pincode}`, 48, cY);

        cY += lh;
        drawMailIcon(doc, 36, cY);
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(email, 48, cY);

        cY += lh;
        drawPhoneIcon(doc, 36, cY);
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(phone, 48, cY);

        if (gstin) {
          cY += lh;
          drawCardIcon(doc, 36, cY);
          doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_BLACK).text('GSTIN: ', 48, cY, { continued: true });
          doc.font(FONT_REGULAR).text(gstin);
        }

        // Right Header: Quotation Title & Sub-Banner
        const rightX = 350;
        doc.font(FONT_BOLD).fontSize(22).fillColor(COLOR_BLACK).text('QUOTATION', rightX, 36, { align: 'right', width: 209 });

        // Pill Sub-Banner: "QUOTATION — NOT A TAX INVOICE"
        doc.roundedRect(365, 62, 194, 15, 3).fillAndStroke(COLOR_LIGHT_BG, '#CBD5E1');
        doc.font(FONT_BOLD).fontSize(7).fillColor(COLOR_DARK_GRAY).text('QUOTATION — NOT A TAX INVOICE', 365, 66, { align: 'center', width: 194, characterSpacing: 0.8 });

        // Metadata Table Right
        const metaY = 84;
        const metaRows = [
          { label: 'Quotation No', value: quotation.quotationNumber, isBold: true },
          {
            label: 'Quotation Date',
            value: new Date(quotation.quotationDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
          },
          {
            label: 'Valid Until',
            value: new Date(quotation.validUntil).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            isBold: true,
          },
          { label: 'Status', value: quotation.status.toUpperCase(), isBadge: true },
        ];

        let curMY = metaY;
        metaRows.forEach((r) => {
          doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_DARK_GRAY).text(r.label, 370, curMY);
          doc.text(':', 445, curMY);

          if (r.isBadge) {
            const badgeW = doc.widthOfString(r.value) + 12;
            doc.roundedRect(455, curMY - 1, badgeW, 12, 3).fillAndStroke(COLOR_LIGHT_BG, '#CBD5E1');
            doc.font(FONT_BOLD).fontSize(6.8).fillColor(COLOR_BLACK).text(r.value, 455, curMY + 1.5, { width: badgeW, align: 'center' });
          } else {
            doc.font(r.isBold ? FONT_BOLD : FONT_REGULAR).fontSize(8).fillColor(COLOR_BLACK).text(r.value, 455, curMY);
          }
          curMY += 13.5;
        });

        // Top Header Divider
        const headerBottomY = Math.max(cY, curMY) + 8;
        doc.save().strokeColor(COLOR_BORDER).lineWidth(0.8).moveTo(36, headerBottomY).lineTo(559, headerBottomY).stroke().restore();

        // Client & Project Estimate Cards
        const cardsY = headerBottomY + 8;
        const cardW = 255;
        const cardH = 84;

        // Left Card: Client Details
        doc.roundedRect(36, cardsY, cardW, cardH, 5).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
        doc.roundedRect(36, cardsY, cardW, 19, 5).fill(COLOR_LIGHT_BG);
        doc.rect(36, cardsY + 13, cardW, 6).fill(COLOR_LIGHT_BG);
        doc.moveTo(36, cardsY + 19).lineTo(36 + cardW, cardsY + 19).strokeColor(COLOR_BORDER).stroke();

        drawUserIcon(doc, 44, cardsY + 5);
        doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('QUOTATION ISSUED TO', 56, cardsY + 5.5);

        let clientY = cardsY + 24;
        doc.font(FONT_BOLD).fontSize(9).fillColor(COLOR_BLACK).text(client.clientName, 44, clientY, { width: cardW - 20, ellipsis: true });
        clientY += 12;

        if (client.contactPerson) {
          doc.font(FONT_REGULAR).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text(`Attn: ${client.contactPerson}`, 44, clientY);
          clientY += 10;
        }

        const clientFullAddr = `${client.billingAddress}, ${client.city}, ${client.state} - ${client.pincode}`;
        doc.font(FONT_REGULAR).fontSize(7).fillColor(COLOR_MUTED).text(clientFullAddr, 44, clientY, { width: cardW - 20, height: 18, ellipsis: true });
        clientY += 17;

        let contactLine = `Ph: ${client.phone}`;
        if (client.gstin) contactLine += `  |  GSTIN: ${client.gstin}`;
        doc.font(FONT_REGULAR).fontSize(7).fillColor(COLOR_DARK_GRAY).text(contactLine, 44, clientY, { width: cardW - 20, ellipsis: true });

        // Right Card: Project Scope & Particulars
        const rightCardX = 304;
        doc.roundedRect(rightCardX, cardsY, cardW, cardH, 5).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
        doc.roundedRect(rightCardX, cardsY, cardW, 19, 5).fill(COLOR_LIGHT_BG);
        doc.rect(rightCardX, cardsY + 13, cardW, 6).fill(COLOR_LIGHT_BG);
        doc.moveTo(rightCardX, cardsY + 19).lineTo(rightCardX + cardW, cardsY + 19).strokeColor(COLOR_BORDER).stroke();

        drawDocIcon(doc, rightCardX + 8, cardsY + 5);
        doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('PROJECT & ESTIMATE PARTICULARS', rightCardX + 20, cardsY + 5.5);

        let projY = cardsY + 24;
        doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLOR_BLACK).text(quotation.projectName, rightCardX + 8, projY, { width: cardW - 16, ellipsis: true });
        projY += 12;

        if (quotation.projectLocation) {
          doc.font(FONT_REGULAR).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text(`Location: ${quotation.projectLocation}`, rightCardX + 8, projY, { width: cardW - 16, ellipsis: true });
          projY += 10;
        }

        if (quotation.projectDescription) {
          doc.font(FONT_REGULAR).fontSize(7).fillColor(COLOR_MUTED).text(quotation.projectDescription, rightCardX + 8, projY, { width: cardW - 16, height: 18, ellipsis: true });
          projY += 17;
        }

        doc.font(FONT_REGULAR).fontSize(7).fillColor(COLOR_DARK_GRAY).text(`Payment: ${quotation.paymentTerms || 'As per stage milestones'}`, rightCardX + 8, projY, { width: cardW - 16, ellipsis: true });

        return cardsY + cardH + 10;
      };

      // ==========================================
      // HELPER: DRAW SUBSEQUENT PAGE HEADER
      // ==========================================
      const drawContinuationHeader = (pageNumber: number): number => {
        if (hasLogo) {
          try {
            doc.image(logoPath, 36, 36, { width: 28, height: 28 });
          } catch (e) {
            console.warn('Continuation logo error', e);
          }
        }

        doc.font(FONT_BOLD).fontSize(11).fillColor(COLOR_BLACK).text(`${companyName} ${companySubtitle}`, 72, 36);
        doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(
          `Quotation No: ${quotation.quotationNumber}  •  Project: ${quotation.projectName}  (Continued)`,
          72,
          50
        );

        // Sub-Banner Pill
        doc.roundedRect(390, 36, 169, 14, 3).fillAndStroke(COLOR_LIGHT_BG, '#CBD5E1');
        doc.font(FONT_BOLD).fontSize(6.8).fillColor(COLOR_DARK_GRAY).text('QUOTATION — NOT A TAX INVOICE', 390, 39.5, {
          align: 'center',
          width: 169,
        });

        const dividerY = 68;
        doc.save().strokeColor(COLOR_BORDER).lineWidth(0.8).moveTo(36, dividerY).lineTo(559, dividerY).stroke().restore();

        return dividerY + 10;
      };

      // ==========================================
      // HELPER: DRAW TABLE HEADER BAR
      // ==========================================
      const drawTableHeader = (y: number): number => {
        doc.rect(36, y, tableW, headerH).fill(COLOR_CHARCOAL);

        doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_WHITE);
        doc.text('#', 38, y + 6.5, { width: 24, align: 'center' });
        doc.text('DESCRIPTION OF WORK / ESTIMATE ITEMS', 66, y + 6.5, { width: 236 });
        doc.text('QTY', 308, y + 6.5, { width: 42, align: 'center' });
        doc.text('UNIT', 354, y + 6.5, { width: 44, align: 'center' });
        doc.text('RATE (₹)', 402, y + 6.5, { width: 75, align: 'right' });
        doc.text('AMOUNT (₹)', 480, y + 6.5, { width: 75, align: 'right' });

        return y + headerH;
      };

      // ==========================================
      // HELPER: DRAW SINGLE TABLE ROW
      // ==========================================
      const drawTableRow = (item: any, index: number, y: number): number => {
        const isZebra = index % 2 === 1;
        const rowBg = isZebra ? COLOR_LIGHT_BG : COLOR_WHITE;

        doc.rect(36, y, tableW, rowH).fill(rowBg);

        // Thin bottom border
        doc.moveTo(36, y + rowH).lineTo(36 + tableW, y + rowH).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();

        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY);
        doc.text(String(index + 1), 38, y + 5.5, { width: 24, align: 'center' });

        doc.fillColor(COLOR_BLACK);
        doc.text(item.description, 66, y + 5.5, { width: 236, ellipsis: true });

        doc.fillColor(COLOR_DARK_GRAY);
        doc.text(String(item.quantity), 308, y + 5.5, { width: 42, align: 'center' });
        doc.text(item.unit || 'Job', 354, y + 5.5, { width: 44, align: 'center' });

        doc.fillColor(COLOR_BLACK);
        doc.text(formatINRValue(item.rate), 402, y + 5.5, { width: 75, align: 'right' });

        doc.font(FONT_BOLD).fillColor(COLOR_BLACK);
        doc.text(formatINRValue(item.amount), 480, y + 5.5, { width: 75, align: 'right' });

        return y + rowH;
      };

      // ==========================================
      // HELPER: DRAW SUMMARY, TERMS, SIGNATURES & DISCLAIMER
      // ==========================================
      const drawBottomSections = (startY: number) => {
        const cardW = 255;
        const summaryCardH = 106;

        // --- Left: Quotation Terms & Conditions ---
        doc.roundedRect(36, startY, cardW, summaryCardH, 5).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
        doc.roundedRect(36, startY, cardW, 19, 5).fill(COLOR_LIGHT_BG);
        doc.rect(36, startY + 13, cardW, 6).fill(COLOR_LIGHT_BG);
        doc.moveTo(36, startY + 19).lineTo(36 + cardW, startY + 19).strokeColor(COLOR_BORDER).stroke();

        drawDocIcon(doc, 44, startY + 5);
        doc.font(FONT_BOLD).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text('QUOTATION TERMS & CONDITIONS', 56, startY + 5.5);

        let tY = startY + 24;
        termsList.slice(0, 4).forEach((term) => {
          doc.font(FONT_REGULAR).fontSize(6.7).fillColor(COLOR_DARK_GRAY).text(`•  ${term}`, 44, tY, { width: cardW - 16 });
          tY += 12;
        });

        // --- Right: Financial Estimate Summary ---
        const rightSummaryX = 304;
        doc.roundedRect(rightSummaryX, startY, cardW, summaryCardH, 5).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
        doc.roundedRect(rightSummaryX, startY, cardW, 19, 5).fill(COLOR_LIGHT_BG);
        doc.rect(rightSummaryX, startY + 13, cardW, 6).fill(COLOR_LIGHT_BG);
        doc.moveTo(rightSummaryX, startY + 19).lineTo(rightSummaryX + cardW, startY + 19).strokeColor(COLOR_BORDER).stroke();

        drawCardIcon(doc, rightSummaryX + 8, startY + 5);
        doc.font(FONT_BOLD).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text('FINANCIAL ESTIMATE SUMMARY', rightSummaryX + 22, startY + 5.5);

        let sY = startY + 24;
        const lineH = 12.5;

        // Subtotal
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('Subtotal', rightSummaryX + 10, sY);
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(formatINR(quotation.subtotal), rightSummaryX + 10, sY, { width: cardW - 20, align: 'right' });
        sY += lineH;

        // Discount (if any)
        if (quotation.discount && quotation.discount.amount > 0) {
          doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('Discount', rightSummaryX + 10, sY);
          doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(`- ${formatINR(quotation.discount.amount)}`, rightSummaryX + 10, sY, { width: cardW - 20, align: 'right' });
          sY += lineH;
        }

        // Estimated Taxable Value
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('Estimated Taxable Value', rightSummaryX + 10, sY);
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(formatINR(quotation.taxableAmount), rightSummaryX + 10, sY, { width: cardW - 20, align: 'right' });
        sY += lineH;

        // Indicative Taxes
        const gst = quotation.estimatedGstDetails;
        if (gst && gst.isApplicable && gst.totalTax > 0) {
          if (gst.supplyType === 'Inter-State') {
            doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(`Indicative IGST (${gst.rate}%)`, rightSummaryX + 10, sY);
            doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(formatINR(gst.igstAmount), rightSummaryX + 10, sY, { width: cardW - 20, align: 'right' });
            sY += lineH;
          } else {
            doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(`Indicative GST (${gst.rate}%)`, rightSummaryX + 10, sY);
            doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(formatINR(gst.totalTax), rightSummaryX + 10, sY, { width: cardW - 20, align: 'right' });
            sY += lineH;
          }
        }

        // Grand Total Solid Black Bar
        const grandTotalBarH = 22;
        doc.roundedRect(rightSummaryX + 6, sY, cardW - 12, grandTotalBarH, 4).fill(COLOR_CHARCOAL);

        doc.font(FONT_BOLD).fontSize(8).fillColor(COLOR_WHITE).text('ESTIMATED GRAND TOTAL', rightSummaryX + 12, sY + 6.5);
        doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_WHITE).text(formatINR(quotation.estimatedGrandTotal), rightSummaryX + 10, sY + 5.5, { width: cardW - 24, align: 'right' });
        sY += grandTotalBarH + 3;

        doc.font(FONT_REGULAR).fontSize(6.2).fillColor(COLOR_MUTED).text('* Final tax liability confirmed upon formal Tax Invoice.', rightSummaryX + 10, sY, { width: cardW - 20, align: 'right' });

        // --- Dual Signatures Section ---
        const sigY = startY + summaryCardH + 8;
        const sigCardH = 64;

        // Left: Client Acceptance & Endorsement
        doc.roundedRect(36, sigY, cardW, sigCardH, 5).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
        doc.font(FONT_BOLD).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text('CLIENT ACCEPTANCE & ENDORSEMENT', 44, sigY + 8);
        doc.font(FONT_REGULAR).fontSize(6.8).fillColor(COLOR_MUTED).text('I/We hereby accept the rates, terms & scope specified above.', 44, sigY + 19);

        doc.moveTo(44, sigY + 46).lineTo(44 + 125, sigY + 46).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
        doc.font(FONT_REGULAR).fontSize(6.5).fillColor(COLOR_DARK_GRAY).text('Client Signature & Seal', 44, sigY + 49);

        doc.moveTo(182, sigY + 46).lineTo(182 + 95, sigY + 46).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
        doc.font(FONT_REGULAR).fontSize(6.5).fillColor(COLOR_DARK_GRAY).text('Date of Acceptance', 182, sigY + 49);

        // Right: Company Signatory Block
        doc.roundedRect(rightSummaryX, sigY, cardW, sigCardH, 5).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
        doc.font(FONT_REGULAR).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text(signatoryCompany, rightSummaryX, sigY + 8, { align: 'center', width: cardW });

        // Flowing executive signature
        doc.save().strokeColor(COLOR_BLACK).lineWidth(1.2).lineCap('round').lineJoin('round');
        const sx = rightSummaryX + 85;
        const sy = sigY + 33;
        doc.moveTo(sx, sy)
          .bezierCurveTo(sx + 4, sy - 10, sx + 10, sy - 12, sx + 14, sy - 2)
          .bezierCurveTo(sx + 18, sy + 5, sx + 13, sy + 7, sx + 20, sy + 2)
          .bezierCurveTo(sx + 26, sy - 9, sx + 35, sy - 7, sx + 40, sy + 2)
          .bezierCurveTo(sx + 45, sy + 6, sx + 52, sy - 5, sx + 60, sy + 2)
          .bezierCurveTo(sx + 65, sy + 5, sx + 74, sy + 3, sx + 80, sy + 4)
          .stroke();
        doc.restore();

        doc.moveTo(rightSummaryX + 30, sigY + 46).lineTo(rightSummaryX + cardW - 30, sigY + 46).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
        doc.font(FONT_BOLD).fontSize(6.8).fillColor(COLOR_BLACK).text('Authorized Signatory', rightSummaryX, sigY + 49, { align: 'center', width: cardW });

        // --- Bottom Legal Disclaimer ---
        const disclaimerY = sigY + sigCardH + 7;
        doc.font(FONT_REGULAR).fontSize(6.3).fillColor(COLOR_MUTED).text(
          'This document is a formal commercial cost quotation and does not constitute a Tax Invoice under Section 31 of CGST Act. An official Tax Invoice will be issued upon client approval and project milestones.',
          36,
          disclaimerY,
          { width: tableW, align: 'center' }
        );
      };

      // ==========================================
      // EXECUTION: PAGINATION & RENDERING ENGINE
      // ==========================================
      const bottomSectionsHeight = 106 + 8 + 64 + 7 + 14; // ~199 pt
      const pageBottomLimit = 780; // leaves clean margin for bottom footer/page numbers

      let currentY = drawFirstPageHeader();
      currentY = drawTableHeader(currentY);

      let curPage = 1;

      for (let i = 0; i < quotation.items.length; i++) {
        const item = quotation.items[i];
        const isLastItem = i === quotation.items.length - 1;

        if (!isLastItem) {
          if (currentY + rowH > pageBottomLimit) {
            // Close table on current page
            doc.moveTo(36, currentY).lineTo(36 + tableW, currentY).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
            // Add page
            doc.addPage();
            curPage++;
            currentY = drawContinuationHeader(curPage);
            currentY = drawTableHeader(currentY);
          }
          currentY = drawTableRow(item, i, currentY);
        } else {
          // Last item: check whether table row AND bottom sections fit on this page
          if (currentY + rowH + bottomSectionsHeight <= pageBottomLimit) {
            currentY = drawTableRow(item, i, currentY);
            doc.moveTo(36, currentY).lineTo(36 + tableW, currentY).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
            drawBottomSections(currentY + 10);
          } else {
            // Bottom sections do not fit
            if (currentY + rowH <= pageBottomLimit) {
              currentY = drawTableRow(item, i, currentY);
              doc.moveTo(36, currentY).lineTo(36 + tableW, currentY).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
              // Page break for summary + signatures
              doc.addPage();
              curPage++;
              currentY = drawContinuationHeader(curPage);
              drawBottomSections(currentY + 8);
            } else {
              // Even the row doesn't fit on current page
              doc.moveTo(36, currentY).lineTo(36 + tableW, currentY).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
              doc.addPage();
              curPage++;
              currentY = drawContinuationHeader(curPage);
              currentY = drawTableHeader(currentY);
              currentY = drawTableRow(item, i, currentY);
              doc.moveTo(36, currentY).lineTo(36 + tableW, currentY).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
              drawBottomSections(currentY + 10);
            }
          }
        }
      }

      // ==========================================
      // WRITE PAGE NUMBERS ON ALL BUFFERED PAGES
      // ==========================================
      const range = doc.bufferedPageRange();
      for (let p = range.start; p < range.start + range.count; p++) {
        doc.switchToPage(p);
        doc.page.margins.bottom = 0; // prevent auto-page break
        doc.font(FONT_REGULAR).fontSize(6.5).fillColor(COLOR_MUTED).text(
          `Page ${p + 1} of ${range.count}`,
          36,
          804,
          { align: 'right', width: tableW, lineBreak: false }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
