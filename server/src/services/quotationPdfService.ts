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

// Vector icons for crisp rendering
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
        info: {
          Title: `Quotation ${quotation.quotationNumber}`,
          Author: 'Royal Engineering & Construction',
          Subject: `Cost Estimate for ${quotation.projectName}`,
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
      const COLOR_BORDER = '#E2E8F0';
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
        '• Rates quoted are valid for 30 days from date of issue.\n• Taxes are estimated and applicable as per prevailing GST rules upon invoice generation.\n• Extra items or structural scope variations will be billed separately upon mutual consent.\n• Mobilization will commence upon acceptance & advance payment.';

      const termsList = termsSettingRaw
        .split('\n')
        .map((t) => t.trim().replace(/^[•\-\*]\s*/, ''))
        .filter((t) => t.length > 0);

      const signatoryCompany =
        settings?.invoiceSettings?.signatoryCompany ||
        (companySubtitle ? `For ${companyName} ${companySubtitle}` : `For ${companyName}`);

      const client = quotation.clientSnapshot;

      // ==========================================
      // 1. TOP HEADER SECTION
      // ==========================================
      const logoPath = getAssetPath('logo.png');
      const hasLogo = fs.existsSync(logoPath);
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
      doc.font(FONT_BOLD).fontSize(19).fillColor(COLOR_BLACK).text(companyName, 96, 38, { characterSpacing: 1 });
      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(companySubtitle, 96, 59, { characterSpacing: 1.4 });

      // Company Details
      let cY = 88;
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

      // Right Header: Quotation Number & Dates
      const rightX = 350;
      doc.font(FONT_BOLD).fontSize(22).fillColor(COLOR_BLACK).text('QUOTATION', rightX, 36, { align: 'right', width: 209 });

      // Clean Sub-Banner: "QUOTATION — NOT A TAX INVOICE"
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
        curMY += 14;
      });

      // Top Header Divider
      const headerBottomY = Math.max(cY, curMY) + 10;
      doc.save().strokeColor(COLOR_BORDER).lineWidth(1).moveTo(36, headerBottomY).lineTo(559, headerBottomY).stroke().restore();

      // ==========================================
      // 2. CLIENT & PROJECT ESTIMATE CARDS
      // ==========================================
      const cardsY = headerBottomY + 10;
      const cardW = 255;
      const cardH = 92;

      // Left: Client Details Card
      doc.roundedRect(36, cardsY, cardW, cardH, 6).strokeColor(COLOR_BORDER).lineWidth(1).stroke();
      doc.roundedRect(36, cardsY, cardW, 20, 6).fill(COLOR_LIGHT_BG);
      doc.rect(36, cardsY + 13, cardW, 7).fill(COLOR_LIGHT_BG);
      doc.moveTo(36, cardsY + 20).lineTo(36 + cardW, cardsY + 20).strokeColor(COLOR_BORDER).stroke();

      drawUserIcon(doc, 44, cardsY + 5.5);
      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('QUOTATION ISSUED TO', 56, cardsY + 6);

      let clientY = cardsY + 26;
      doc.font(FONT_BOLD).fontSize(9).fillColor(COLOR_BLACK).text(client.clientName, 44, clientY, { width: cardW - 20, ellipsis: true });
      clientY += 13;

      if (client.contactPerson) {
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(`Attn: ${client.contactPerson}`, 44, clientY);
        clientY += 11;
      }

      const clientFullAddr = `${client.billingAddress}, ${client.city}, ${client.state} - ${client.pincode}`;
      doc.font(FONT_REGULAR).fontSize(7.2).fillColor(COLOR_MUTED).text(clientFullAddr, 44, clientY, { width: cardW - 20, height: 20, ellipsis: true });
      clientY += 18;

      let contactLine = `Ph: ${client.phone}`;
      if (client.gstin) contactLine += `  |  GSTIN: ${client.gstin}`;
      doc.font(FONT_REGULAR).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text(contactLine, 44, clientY, { width: cardW - 20, ellipsis: true });

      // Right: Project Scope Card
      const rightCardX = 304;
      doc.roundedRect(rightCardX, cardsY, cardW, cardH, 6).strokeColor(COLOR_BORDER).lineWidth(1).stroke();
      doc.roundedRect(rightCardX, cardsY, cardW, 20, 6).fill(COLOR_LIGHT_BG);
      doc.rect(rightCardX, cardsY + 13, cardW, 7).fill(COLOR_LIGHT_BG);
      doc.moveTo(rightCardX, cardsY + 20).lineTo(rightCardX + cardW, cardsY + 20).strokeColor(COLOR_BORDER).stroke();

      drawDocIcon(doc, rightCardX + 8, cardsY + 5.5);
      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('PROJECT & ESTIMATE PARTICULARS', rightCardX + 20, cardsY + 6);

      let projY = cardsY + 26;
      doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLOR_BLACK).text(quotation.projectName, rightCardX + 8, projY, { width: cardW - 16, ellipsis: true });
      projY += 13;

      if (quotation.projectLocation) {
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(`Location: ${quotation.projectLocation}`, rightCardX + 8, projY, { width: cardW - 16, ellipsis: true });
        projY += 11;
      }

      if (quotation.projectDescription) {
        doc.font(FONT_REGULAR).fontSize(7.2).fillColor(COLOR_MUTED).text(quotation.projectDescription, rightCardX + 8, projY, { width: cardW - 16, height: 20, ellipsis: true });
        projY += 18;
      }

      doc.font(FONT_REGULAR).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text(`Payment: ${quotation.paymentTerms || 'As per stage milestones'}`, rightCardX + 8, projY, { width: cardW - 16, ellipsis: true });

      // ==========================================
      // 3. WORK ITEMS TABLE
      // ==========================================
      const tableY = cardsY + cardH + 12;
      const tableW = 523;
      const headerH = 22;

      // Table Header: Solid Pitch Black
      doc.rect(36, tableY, tableW, headerH).fill(COLOR_CHARCOAL);

      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_WHITE);
      doc.text('#', 44, tableY + 6.5, { width: 22, align: 'center' });
      doc.text('DESCRIPTION OF WORK / ESTIMATE ITEMS', 72, tableY + 6.5, { width: 228 });
      doc.text('QTY', 305, tableY + 6.5, { width: 40, align: 'center' });
      doc.text('UNIT', 350, tableY + 6.5, { width: 45, align: 'center' });
      doc.text('RATE (₹)', 400, tableY + 6.5, { width: 75, align: 'right' });
      doc.text('AMOUNT (₹)', 480, tableY + 6.5, { width: 73, align: 'right' });

      // Table Rows
      let rowY = tableY + headerH;
      const rowH = 22;

      quotation.items.forEach((item, index) => {
        const isZebra = index % 2 === 1;
        const rowBg = isZebra ? COLOR_LIGHT_BG : COLOR_WHITE;

        doc.rect(36, rowY, tableW, rowH).fill(rowBg);

        // Thin bottom border
        doc.moveTo(36, rowY + rowH).lineTo(36 + tableW, rowY + rowH).strokeColor('#E2E8F0').lineWidth(0.6).stroke();

        doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_DARK_GRAY);
        doc.text(String(index + 1), 44, rowY + 6, { width: 22, align: 'center' });

        doc.fillColor(COLOR_BLACK);
        doc.text(item.description, 72, rowY + 6, { width: 228, ellipsis: true });

        doc.fillColor(COLOR_DARK_GRAY);
        doc.text(String(item.quantity), 305, rowY + 6, { width: 40, align: 'center' });
        doc.text(item.unit || 'Job', 350, rowY + 6, { width: 45, align: 'center' });
        doc.text(formatINRValue(item.rate), 400, rowY + 6, { width: 75, align: 'right' });

        doc.font(FONT_BOLD).fillColor(COLOR_BLACK);
        doc.text(formatINRValue(item.amount), 480, rowY + 6, { width: 73, align: 'right' });

        rowY += rowH;
      });

      // ==========================================
      // 4. FINANCIAL SUMMARY TABLE
      // ==========================================
      const summaryW = 230;
      const summaryX = 36 + tableW - summaryW;
      let sumY = rowY + 8;
      const sumLineH = 14;

      // Subtotal
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('Subtotal', summaryX, sumY);
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(formatINR(quotation.subtotal), summaryX, sumY, { width: summaryW, align: 'right' });
      sumY += sumLineH;

      // Discount (if any)
      if (quotation.discount && quotation.discount.amount > 0) {
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('Discount', summaryX, sumY);
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(`- ${formatINR(quotation.discount.amount)}`, summaryX, sumY, { width: summaryW, align: 'right' });
        sumY += sumLineH;
      }

      // Estimated Taxable Value
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('Estimated Taxable Value', summaryX, sumY);
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(formatINR(quotation.taxableAmount), summaryX, sumY, { width: summaryW, align: 'right' });
      sumY += sumLineH;

      // Indicative Taxes
      const gst = quotation.estimatedGstDetails;
      if (gst && gst.isApplicable && gst.totalTax > 0) {
        if (gst.supplyType === 'Inter-State') {
          doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(`Indicative IGST (${gst.rate}%)`, summaryX, sumY);
          doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(formatINR(gst.igstAmount), summaryX, sumY, { width: summaryW, align: 'right' });
          sumY += sumLineH;
        } else {
          doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(`Indicative CGST (${gst.cgstRate}%)`, summaryX, sumY);
          doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(formatINR(gst.cgstAmount), summaryX, sumY, { width: summaryW, align: 'right' });
          sumY += sumLineH;

          doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(`Indicative SGST (${gst.sgstRate}%)`, summaryX, sumY);
          doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_BLACK).text(formatINR(gst.sgstAmount), summaryX, sumY, { width: summaryW, align: 'right' });
          sumY += sumLineH;
        }
      }

      // Grand Total Box
      const totalBoxH = 26;
      doc.roundedRect(summaryX, sumY, summaryW, totalBoxH, 4).fill(COLOR_CHARCOAL);

      doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLOR_WHITE).text('ESTIMATED GRAND TOTAL', summaryX + 8, sumY + 8);
      doc.font(FONT_BOLD).fontSize(10.5).fillColor(COLOR_WHITE).text(formatINR(quotation.estimatedGrandTotal), summaryX, sumY + 7, { width: summaryW - 10, align: 'right' });
      sumY += totalBoxH + 4;

      doc.font(FONT_REGULAR).fontSize(6.5).fillColor(COLOR_MUTED).text('* Subject to CA-approved final tax invoice upon acceptance.', summaryX, sumY, { width: summaryW, align: 'right' });

      // ==========================================
      // 5. TERMS & CONDITIONS CARD
      // ==========================================
      const bottomSectionY = Math.max(sumY + 16, 640);
      const termsW = 523;
      const termsH = 65;

      doc.roundedRect(36, bottomSectionY, termsW, termsH, 5).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
      doc.roundedRect(36, bottomSectionY, termsW, 17, 5).fill(COLOR_LIGHT_BG);
      doc.rect(36, bottomSectionY + 11, termsW, 6).fill(COLOR_LIGHT_BG);
      doc.moveTo(36, bottomSectionY + 17).lineTo(36 + termsW, bottomSectionY + 17).strokeColor(COLOR_BORDER).stroke();

      drawDocIcon(doc, 44, bottomSectionY + 4);
      doc.font(FONT_BOLD).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text('QUOTATION TERMS & CONDITIONS', 56, bottomSectionY + 5);

      let tY = bottomSectionY + 22;
      termsList.slice(0, 3).forEach((term) => {
        doc.font(FONT_REGULAR).fontSize(6.8).fillColor(COLOR_DARK_GRAY).text(`•  ${term}`, 44, tY, { width: termsW - 16 });
        tY += 12;
      });

      // ==========================================
      // 6. CLIENT ACCEPTANCE & SIGNATURE BLOCKS
      // ==========================================
      const footerY = bottomSectionY + termsH + 10;
      const sigCardW = 255;
      const sigCardH = 68;

      // Left: Client Acceptance Block
      doc.roundedRect(36, footerY, sigCardW, sigCardH, 5).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
      doc.font(FONT_BOLD).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text('CLIENT ACCEPTANCE & ENDORSEMENT', 46, footerY + 8);
      doc.font(FONT_REGULAR).fontSize(6.8).fillColor(COLOR_MUTED).text('I/We hereby accept the rates, terms & scope specified above.', 46, footerY + 19);

      doc.moveTo(46, footerY + 50).lineTo(46 + 130, footerY + 50).strokeColor(COLOR_BORDER).stroke();
      doc.font(FONT_REGULAR).fontSize(6.5).fillColor(COLOR_DARK_GRAY).text('Client Signature & Seal', 46, footerY + 53);

      doc.moveTo(190, footerY + 50).lineTo(190 + 90, footerY + 50).strokeColor(COLOR_BORDER).stroke();
      doc.font(FONT_REGULAR).fontSize(6.5).fillColor(COLOR_DARK_GRAY).text('Date', 190, footerY + 53);

      // Right: Company Signatory Block
      const rightSigX = 304;
      doc.roundedRect(rightSigX, footerY, sigCardW, sigCardH, 5).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
      doc.font(FONT_REGULAR).fontSize(7.2).fillColor(COLOR_DARK_GRAY).text(signatoryCompany, rightSigX, footerY + 8, { align: 'center', width: sigCardW });

      // Flowing digital signature line
      doc.save().strokeColor(COLOR_BLACK).lineWidth(1.2).lineCap('round').lineJoin('round');
      const sx = rightSigX + 85;
      const sy = footerY + 36;
      doc.moveTo(sx, sy)
        .bezierCurveTo(sx + 4, sy - 10, sx + 10, sy - 12, sx + 14, sy - 2)
        .bezierCurveTo(sx + 18, sy + 5, sx + 13, sy + 7, sx + 20, sy + 2)
        .bezierCurveTo(sx + 26, sy - 9, sx + 35, sy - 7, sx + 40, sy + 2)
        .bezierCurveTo(sx + 45, sy + 6, sx + 52, sy - 5, sx + 60, sy + 2)
        .bezierCurveTo(sx + 65, sy + 5, sx + 74, sy + 3, sx + 80, sy + 4)
        .stroke();
      doc.restore();

      doc.moveTo(rightSigX + 30, footerY + 49).lineTo(rightSigX + sigCardW - 30, footerY + 49).strokeColor(COLOR_BORDER).stroke();
      doc.font(FONT_BOLD).fontSize(6.8).fillColor(COLOR_BLACK).text('Authorized Signatory', rightSigX, footerY + 53, { align: 'center', width: sigCardW });

      // Bottom Bar Notice
      const bottomBarY = footerY + sigCardH + 6;
      doc.font(FONT_REGULAR).fontSize(6.5).fillColor(COLOR_MUTED).text(
        'This document is a formal commercial cost quotation and does not constitute a Tax Invoice under Section 31 of CGST Act. An official Tax Invoice will be issued upon client approval and project milestones.',
        36,
        bottomBarY,
        { width: 523, align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
