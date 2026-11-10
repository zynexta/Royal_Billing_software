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

export function amountToWordsIndian(amount: number): string {
  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Zero Rupees Only';

  function convertNumber(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? convertNumber(n % 100) : '')
      );
    return '';
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  if (crore > 0) words += convertNumber(crore) + 'Crore ';
  if (lakh > 0) words += convertNumber(lakh) + 'Lakh ';
  if (thousand > 0) words += convertNumber(thousand) + 'Thousand ';
  if (remainder > 0) words += convertNumber(remainder);

  return words.trim() + ' Rupees Only';
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
          Subject: `Commercial Construction Work Quotation for ${quotation.projectName}`,
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

      // Design System Palette (Luxury Monochrome)
      const COLOR_BLACK = '#0F172A';
      const COLOR_CHARCOAL = '#18181B';
      const COLOR_BANNER_BG = '#111111';
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

      // Resolve Signatory Details
      const signatoryCompany =
        settings?.invoiceSettings?.signatoryCompany ||
        (companySubtitle
          ? `FOR ${companyName} ${companySubtitle}`.toUpperCase()
          : `FOR ${companyName}`.toUpperCase());
      const signatoryTitle =
        settings?.invoiceSettings?.signatoryTitle || 'Authorized Company Signatory';
      const signatureImage = settings?.invoiceSettings?.signatureImage;

      const client = quotation.clientSnapshot;
      const logoPath = getAssetPath('logo.png');
      const hasLogo = fs.existsSync(logoPath);

      const tableW = 523; // Printable width (595 - 72)
      const pageBottomLimit = 750;

      // ==========================================
      // SECTION A: DRAW FIRST PAGE TOP BANNER
      // ==========================================
      const drawFirstPageHeader = (): number => {
        // Dark Corporate Top Banner
        const bannerH = 58;
        doc
          .save()
          .roundedRect(36, 36, tableW, bannerH, 4)
          .fill(COLOR_BANNER_BG);

        // Logo inside a clean white badge
        doc.roundedRect(44, 42, 46, 46, 4).fill(COLOR_WHITE);
        if (hasLogo) {
          try {
            doc.image(logoPath, 46, 44, { width: 42, height: 42 });
          } catch (e) {
            console.warn('Failed to embed logo', e);
          }
        }

        // Company Brand Name & Subtitle
        doc
          .font(FONT_BOLD)
          .fontSize(16)
          .fillColor(COLOR_WHITE)
          .text(companyName, 98, 44, { characterSpacing: 1 });
        doc
          .font(FONT_BOLD)
          .fontSize(7)
          .fillColor('#CBD5E1')
          .text(companySubtitle, 98, 63, { characterSpacing: 1.4 });

        // Right Header: Address, Contacts & GSTIN
        const rightTextW = 280;
        const rightX = 36 + tableW - rightTextW - 12;
        doc
          .font(FONT_REGULAR)
          .fontSize(7)
          .fillColor('#E2E8F0')
          .text(`${address}, ${city}, ${state} - ${pincode}`, rightX, 43, {
            width: rightTextW,
            align: 'right',
          });
        doc
          .font(FONT_REGULAR)
          .fontSize(7)
          .fillColor('#E2E8F0')
          .text(`Ph: ${phone}`, rightX, 53, {
            width: rightTextW,
            align: 'right',
          });
        doc
          .font(FONT_REGULAR)
          .fontSize(7)
          .fillColor('#CBD5E1')
          .text(`${email}  |  GSTIN: ${gstin}`, rightX, 63, {
            width: rightTextW,
            align: 'right',
          });

        doc.restore();

        // ==========================================
        // SECTION B & C: QUOTATION TITLE + CUSTOMER DETAILS
        // (Inspired directly by client reference document)
        // ==========================================
        const metaY = 104;

        // Left Side: Prominent Quotation Title & Reference Meta
        doc
          .font(FONT_BOLD)
          .fontSize(22)
          .fillColor(COLOR_BLACK)
          .text('Quotation', 36, metaY, { characterSpacing: 0.5 });

        // Pill Sub-Banner: "QUOTATION — NOT A TAX INVOICE"
        doc
          .save()
          .roundedRect(36, metaY + 26, 184, 14, 3)
          .fillAndStroke(COLOR_LIGHT_BG, '#CBD5E1');
        doc
          .font(FONT_BOLD)
          .fontSize(6.5)
          .fillColor(COLOR_DARK_GRAY)
          .text('COMMERCIAL PROPOSAL — NOT A TAX INVOICE', 36, metaY + 30, {
            align: 'center',
            width: 184,
            characterSpacing: 0.5,
          });
        doc.restore();

        // Quotation Number & Dates
        const dateFormatted = new Date(quotation.quotationDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const validUntilFormatted = new Date(quotation.validUntil).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        let curQY = metaY + 46;
        doc.font(FONT_BOLD).fontSize(9.5).fillColor(COLOR_BLACK).text('No: ', 36, curQY, { continued: true });
        doc.font(FONT_BOLD).text(quotation.quotationNumber);

        curQY += 13;
        doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_DARK_GRAY).text('Date: ', 36, curQY, { continued: true });
        doc.font(FONT_BOLD).text(dateFormatted);

        curQY += 12;
        doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_MUTED).text('Valid Until: ', 36, curQY, { continued: true });
        doc.font(FONT_BOLD).fillColor(COLOR_BLACK).text(validUntilFormatted);

        // Right Side: Customer Details (Client Reference format: "Costumer details")
        const custBoxX = 270;
        const custBoxW = tableW - (custBoxX - 36);
        const custBoxH = 80;

        doc
          .save()
          .roundedRect(custBoxX, metaY, custBoxW, custBoxH, 4)
          .fillAndStroke(COLOR_LIGHT_BG, '#E2E8F0');
        doc.restore();

        doc
          .font(FONT_BOLD)
          .fontSize(7.5)
          .fillColor(COLOR_MUTED)
          .text('CUSTOMER DETAILS', custBoxX + 10, metaY + 8, {
            characterSpacing: 0.8,
          });

        const clientDisplayName = (client?.clientName || (client as any)?.name || 'VALUED CLIENT').toUpperCase();
        doc
          .font(FONT_BOLD)
          .fontSize(9.5)
          .fillColor(COLOR_BLACK)
          .text(clientDisplayName, custBoxX + 10, metaY + 20, {
            width: custBoxW - 20,
          });

        let custLineY = metaY + 33;
        if (client.contactPerson) {
          doc
            .font(FONT_REGULAR)
            .fontSize(7.5)
            .fillColor(COLOR_DARK_GRAY)
            .text(`Attn: ${client.contactPerson}`, custBoxX + 10, custLineY);
          custLineY += 10;
        }

        const fullAddr = `${client.billingAddress}, ${client.city}, ${client.state} - ${client.pincode}`;
        doc
          .font(FONT_REGULAR)
          .fontSize(7)
          .fillColor(COLOR_MUTED)
          .text(fullAddr, custBoxX + 10, custLineY, {
            width: custBoxW - 20,
            lineGap: 1,
          });

        const phoneGstin = `Ph: ${client.phone}  |  GSTIN: ${client.gstin || 'Unregistered'}`;
        doc
          .font(FONT_REGULAR)
          .fontSize(7)
          .fillColor(COLOR_DARK_GRAY)
          .text(phoneGstin, custBoxX + 10, metaY + custBoxH - 14, {
            width: custBoxW - 20,
          });

        // ==========================================
        // SECTION D: PROJECT DETAILS STRIP
        // ==========================================
        const projY = metaY + custBoxH + 8;
        const projH = 26;

        doc
          .save()
          .roundedRect(36, projY, tableW, projH, 3)
          .fillAndStroke('#F1F5F9', '#CBD5E1');
        doc.restore();

        // Project Name
        doc
          .font(FONT_BOLD)
          .fontSize(8)
          .fillColor(COLOR_BLACK)
          .text('Project: ', 44, projY + 8, { continued: true });
        doc.font(FONT_REGULAR).text(quotation.projectName, { continued: true });

        // Project Location
        if (quotation.projectLocation) {
          doc.font(FONT_BOLD).text('   |   Location: ', { continued: true });
          doc.font(FONT_REGULAR).text(quotation.projectLocation, { continued: true });
        }

        // Work Category / Scope
        const scopeDesc = quotation.workCategory || quotation.projectDescription;
        if (scopeDesc) {
          doc.font(FONT_BOLD).text('   |   Scope: ', { continued: true });
          doc.font(FONT_REGULAR).text(
            scopeDesc.length > 50 ? scopeDesc.slice(0, 47) + '...' : scopeDesc
          );
        }

        return projY + projH + 12; // Start Y for work table
      };

      // Continuation Header for Subsequent Pages
      const drawContinuationHeader = (): number => {
        doc.save().roundedRect(36, 36, tableW, 26, 3).fill(COLOR_BANNER_BG);

        doc
          .font(FONT_BOLD)
          .fontSize(9)
          .fillColor(COLOR_WHITE)
          .text(
            `${companyName} ${companySubtitle} — Quotation ${quotation.quotationNumber} (Continued)`,
            46,
            44
          );

        const dateStr = new Date(quotation.quotationDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        doc
          .font(FONT_REGULAR)
          .fontSize(8)
          .fillColor('#CBD5E1')
          .text(`Date: ${dateStr}`, tableW - 80, 44, { align: 'right' });

        doc.restore();
        return 72; // Start Y after continuation header
      };

      // ==========================================
      // SECTION E: DETAILED WORK DESCRIPTION TABLE
      // (Inspired directly by client reference: SL | Area | Description | Amount)
      // ==========================================
      const colW_SL = 28;
      const colW_Area = 125;
      const colW_Desc = 276;
      const colW_Amount = 94;

      const colX_SL = 36;
      const colX_Area = colX_SL + colW_SL; // 64
      const colX_Desc = colX_Area + colW_Area; // 189
      const colX_Amount = colX_Desc + colW_Desc; // 465

      const drawTableHeader = (startY: number): number => {
        const hH = 20;
        doc.save().roundedRect(36, startY, tableW, hH, 2).fill(COLOR_CHARCOAL);

        doc.font(FONT_BOLD).fontSize(8).fillColor(COLOR_WHITE);
        doc.text('SL', colX_SL, startY + 6, { width: colW_SL, align: 'center' });
        doc.text('Area / Work', colX_Area + 6, startY + 6, { width: colW_Area - 10 });
        doc.text('Description of Work / Scope', colX_Desc + 6, startY + 6, { width: colW_Desc - 10 });
        doc.text('Amount (₹)', colX_Amount - 6, startY + 6, {
          width: colW_Amount,
          align: 'right',
        });

        doc.restore();
        return startY + hH + 4;
      };

      let currentY = drawFirstPageHeader();
      currentY = drawTableHeader(currentY);

      // Render Work Items with dynamic heights and borders
      quotation.items.forEach((item, idx) => {
        const areaText = (item as any).area || (item.description.includes('-') ? item.description.split('-')[0].trim() : 'Construction Work');
        const descText = item.description;

        // If quantity/rate exist and are significant, add a neat subtitle
        let fullDesc = descText;
        if (item.quantity > 1 || item.rate > 0) {
          const qtyRateNote = `[Quantity: ${item.quantity} ${item.unit} @ ₹${formatINRValue(item.rate)} / ${item.unit}]`;
          if (!descText.includes(qtyRateNote)) {
            fullDesc += `\n${qtyRateNote}`;
          }
        }

        // Calculate text heights
        doc.font(FONT_BOLD).fontSize(8);
        const areaH = doc.heightOfString(areaText, {
          width: colW_Area - 12,
        });

        doc.font(FONT_REGULAR).fontSize(7.5);
        const descH = doc.heightOfString(fullDesc, {
          width: colW_Desc - 14,
          lineGap: 2,
        });

        const rowH = Math.max(areaH, descH, 22) + 12;

        // Check if page break is needed
        if (currentY + rowH > pageBottomLimit) {
          doc.addPage();
          currentY = drawContinuationHeader();
          currentY = drawTableHeader(currentY);
        }

        // Draw Row Border Box (inspired by client reference)
        doc
          .save()
          .rect(36, currentY, tableW, rowH)
          .strokeColor(COLOR_BORDER)
          .lineWidth(0.75)
          .stroke();

        // Draw column divider lines
        doc
          .moveTo(colX_Area, currentY)
          .lineTo(colX_Area, currentY + rowH)
          .stroke();
        doc
          .moveTo(colX_Desc, currentY)
          .lineTo(colX_Desc, currentY + rowH)
          .stroke();
        doc
          .moveTo(colX_Amount, currentY)
          .lineTo(colX_Amount, currentY + rowH)
          .stroke();

        // 1. SL Number
        doc
          .font(FONT_BOLD)
          .fontSize(8)
          .fillColor(COLOR_BLACK)
          .text(String(idx + 1), colX_SL, currentY + 6, {
            width: colW_SL,
            align: 'center',
          });

        // 2. Area (in bold / prominent font as per client reference)
        doc
          .font(FONT_BOLD)
          .fontSize(8)
          .fillColor(COLOR_BLACK)
          .text(areaText, colX_Area + 6, currentY + 6, {
            width: colW_Area - 12,
            lineGap: 1.5,
          });

        // 3. Description of Work (with bullet indentation if lines start with -)
        doc
          .font(FONT_REGULAR)
          .fontSize(7.5)
          .fillColor(COLOR_DARK_GRAY)
          .text(fullDesc, colX_Desc + 6, currentY + 6, {
            width: colW_Desc - 14,
            lineGap: 2,
          });

        // 4. Amount
        doc
          .font(FONT_BOLD)
          .fontSize(8.5)
          .fillColor(COLOR_BLACK)
          .text(formatINR(item.amount), colX_Amount - 6, currentY + 6, {
            width: colW_Amount,
            align: 'right',
          });

        doc.restore();

        currentY += rowH + 2;
      });

      // ==========================================
      // SECTION F: REMARKS & DECLARATION
      // (Directly modeled after the client's reference box)
      // ==========================================
      currentY += 4;

      const defaultRemarks =
        quotation.remarks ||
        quotation.notes ||
        "All works shall comply with the manufacturer's recommendations and warranty requirements. Site inspections by the manufacturer's technical team shall be arranged as required to ensure warranty compliance.";

      const defaultDeclaration =
        quotation.declaration ||
        `We hereby declare that the total estimated quotation amount of ${formatINR(
          quotation.estimatedGrandTotal
        )} includes all materials, labour, tools, and accessories required to complete the work to the highest standards, ensuring quality and meeting your expectations.`;

      let remarksBlockText = `Remark: ${defaultRemarks}`;

      if (quotation.materialInclusions) {
        remarksBlockText += `\nMaterial Inclusions: ${quotation.materialInclusions}`;
      }
      if (quotation.labourInclusions) {
        remarksBlockText += `\nLabour Inclusions: ${quotation.labourInclusions}`;
      }
      if (quotation.exclusions) {
        remarksBlockText += `\nExclusions: ${quotation.exclusions}`;
      }

      remarksBlockText += `\nDeclaration: ${defaultDeclaration}`;

      doc.font(FONT_REGULAR).fontSize(7.5);
      const remarksBoxH =
        doc.heightOfString(remarksBlockText, {
          width: tableW - 20,
          lineGap: 2.5,
        }) + 16;

      if (currentY + remarksBoxH > pageBottomLimit) {
        doc.addPage();
        currentY = drawContinuationHeader();
      }

      // Draw Remark & Declaration Box
      doc
        .save()
        .roundedRect(36, currentY, tableW, remarksBoxH, 3)
        .fillAndStroke(COLOR_LIGHT_BG, COLOR_BORDER);
      doc.restore();

      let boxTextY = currentY + 8;

      // Remark Line
      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_BLACK).text('Remark: ', 46, boxTextY, { continued: true });
      doc
        .font(FONT_REGULAR)
        .fillColor(COLOR_DARK_GRAY)
        .text(defaultRemarks, {
          width: tableW - 20,
          lineGap: 2,
        });

      boxTextY = doc.y + 4;

      // Inclusions / Exclusions if present
      if (quotation.materialInclusions || quotation.labourInclusions || quotation.exclusions) {
        if (quotation.materialInclusions) {
          doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_BLACK).text('Material Inclusions: ', 46, boxTextY, { continued: true });
          doc.font(FONT_REGULAR).fillColor(COLOR_DARK_GRAY).text(quotation.materialInclusions, { width: tableW - 20 });
          boxTextY = doc.y + 3;
        }
        if (quotation.labourInclusions) {
          doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_BLACK).text('Labour Inclusions: ', 46, boxTextY, { continued: true });
          doc.font(FONT_REGULAR).fillColor(COLOR_DARK_GRAY).text(quotation.labourInclusions, { width: tableW - 20 });
          boxTextY = doc.y + 3;
        }
        if (quotation.exclusions) {
          doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_BLACK).text('Exclusions: ', 46, boxTextY, { continued: true });
          doc.font(FONT_REGULAR).fillColor(COLOR_DARK_GRAY).text(quotation.exclusions, { width: tableW - 20 });
          boxTextY = doc.y + 3;
        }
      }

      // Declaration Line
      doc.font(FONT_BOLD).fontSize(7.5).fillColor(COLOR_BLACK).text('Declaration: ', 46, boxTextY, { continued: true });
      doc
        .font(FONT_REGULAR)
        .fillColor(COLOR_DARK_GRAY)
        .text(defaultDeclaration, {
          width: tableW - 20,
          lineGap: 2,
        });

      currentY += remarksBoxH + 8;

      // ==========================================
      // SECTION G & H: COMMERCIAL FINANCIAL SUMMARY & PAYMENT TERMS
      // (Commercial style, NOT a Tax Invoice)
      // ==========================================
      const summaryBlockH = 92;

      if (currentY + summaryBlockH > pageBottomLimit) {
        doc.addPage();
        currentY = drawContinuationHeader();
      }

      const sumLeftW = 265;
      const sumRightW = tableW - sumLeftW - 10;
      const sumRightX = 36 + sumLeftW + 10;

      // Left: Payment Milestones & Validity
      doc
        .save()
        .roundedRect(36, currentY, sumLeftW, summaryBlockH, 3)
        .fillAndStroke(COLOR_LIGHT_BG, '#E2E8F0');
      doc.restore();

      doc
        .font(FONT_BOLD)
        .fontSize(7.5)
        .fillColor(COLOR_MUTED)
        .text('PAYMENT TERMS & SCHEDULE', 44, currentY + 8, { characterSpacing: 0.8 });

      const termsText =
        quotation.paymentSchedule ||
        quotation.paymentTerms ||
        'Mobilization Advance: 30% | Running Work: 60% | Final Handover: 10%';

      doc
        .font(FONT_REGULAR)
        .fontSize(7.5)
        .fillColor(COLOR_DARK_GRAY)
        .text(`• ${termsText.replace(/\|/g, '\n• ')}`, 44, currentY + 22, {
          width: sumLeftW - 16,
          lineGap: 3,
        });

      const validDateStr = new Date(quotation.validUntil).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      doc
        .font(FONT_BOLD)
        .fontSize(7)
        .fillColor(COLOR_MUTED)
        .text(`• Commercial validity: ${validDateStr}`, 44, currentY + summaryBlockH - 14);

      // Right: Commercial Financial Summary
      doc
        .save()
        .roundedRect(sumRightX, currentY, sumRightW, summaryBlockH, 3)
        .strokeColor(COLOR_BORDER)
        .stroke();
      doc.restore();

      let fY = currentY + 8;

      // Subtotal
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('Subtotal', sumRightX + 10, fY);
      doc
        .font(FONT_BOLD)
        .fontSize(7.5)
        .fillColor(COLOR_BLACK)
        .text(formatINR(quotation.subtotal), sumRightX + sumRightW - 100, fY, {
          width: 90,
          align: 'right',
        });

      // Discount if any
      if (quotation.discount && quotation.discount.amount > 0) {
        fY += 12;
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text('Discount', sumRightX + 10, fY);
        doc
          .font(FONT_BOLD)
          .fontSize(7.5)
          .fillColor('#E11D48')
          .text(`- ${formatINR(quotation.discount.amount)}`, sumRightX + sumRightW - 100, fY, {
            width: 90,
            align: 'right',
          });
      }

      // Estimated GST if applicable
      if (quotation.estimatedGstDetails?.isApplicable && quotation.estimatedGstDetails.totalTax > 0) {
        fY += 12;
        const gstLabel =
          quotation.estimatedGstDetails.supplyType === 'Inter-State'
            ? `Indicative IGST (${quotation.estimatedGstDetails.rate}%)`
            : `Indicative GST (${quotation.estimatedGstDetails.rate}%)`;
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_DARK_GRAY).text(gstLabel, sumRightX + 10, fY);
        doc
          .font(FONT_REGULAR)
          .fontSize(7.5)
          .fillColor(COLOR_BLACK)
          .text(formatINR(quotation.estimatedGstDetails.totalTax), sumRightX + sumRightW - 100, fY, {
            width: 90,
            align: 'right',
          });
      }

      // Prominent Estimated Grand Total Box
      const grandTotalBoxY = currentY + summaryBlockH - 28;
      doc
        .save()
        .roundedRect(sumRightX + 1, grandTotalBoxY, sumRightW - 2, 26, 2)
        .fill(COLOR_BANNER_BG);

      doc
        .font(FONT_BOLD)
        .fontSize(8)
        .fillColor(COLOR_WHITE)
        .text('ESTIMATED GRAND TOTAL', sumRightX + 10, grandTotalBoxY + 8);
      doc
        .font(FONT_BOLD)
        .fontSize(10)
        .fillColor(COLOR_WHITE)
        .text(formatINR(quotation.estimatedGrandTotal), sumRightX + sumRightW - 110, grandTotalBoxY + 7, {
          width: 100,
          align: 'right',
        });
      doc.restore();

      currentY += summaryBlockH + 10;

      // Amount in words
      const wordsText = `Amount in words: ${amountToWordsIndian(quotation.estimatedGrandTotal)}`;
      doc
        .font(FONT_REGULAR)
        .fontSize(7)
        .fillColor(COLOR_MUTED)
        .text(wordsText, 36, currentY, { width: tableW, align: 'right' });

      currentY += 12;

      // ==========================================
      // SECTION I: CLIENT ACCEPTANCE & AUTHORIZED SIGNATURE
      // ==========================================
      const sigH = 68;
      if (currentY + sigH > pageBottomLimit) {
        doc.addPage();
        currentY = drawContinuationHeader();
      }

      const sigBoxW = (tableW - 20) / 2;

      // Left: Client Acceptance Box
      doc
        .save()
        .roundedRect(36, currentY, sigBoxW, sigH, 3)
        .strokeColor(COLOR_BORDER)
        .lineWidth(0.75)
        .stroke();
      doc.restore();

      doc
        .font(FONT_BOLD)
        .fontSize(7.2)
        .fillColor(COLOR_DARK_GRAY)
        .text('CLIENT ACCEPTANCE & APPROVAL', 44, currentY + 7);

      if (quotation.status === 'Accepted' && quotation.approvalDetails) {
        doc
          .font(FONT_BOLD)
          .fontSize(7.8)
          .fillColor('#059669')
          .text(`✓ APPROVED BY: ${quotation.approvalDetails.approvedBy}`, 44, currentY + 21);
        const appDateStr = new Date(quotation.approvalDetails.approvalDate).toLocaleDateString(
          'en-IN',
          { day: '2-digit', month: 'short', year: 'numeric' }
        );
        doc
          .font(FONT_REGULAR)
          .fontSize(6.8)
          .fillColor(COLOR_DARK_GRAY)
          .text(`Date: ${appDateStr}  |  Via: ${quotation.approvalDetails.approvalMethod}`, 44, currentY + 33);
      } else {
        doc
          .font(FONT_REGULAR)
          .fontSize(7)
          .fillColor(COLOR_MUTED)
          .text('Signature: .....................................................', 44, currentY + 23);
        doc
          .font(FONT_REGULAR)
          .fontSize(7)
          .fillColor(COLOR_MUTED)
          .text('Client Name: .................................................', 44, currentY + 35);
      }

      // Divider line under client area
      doc
        .moveTo(44, currentY + 49)
        .lineTo(36 + sigBoxW - 14, currentY + 49)
        .strokeColor(COLOR_BORDER)
        .lineWidth(0.6)
        .stroke();

      doc
        .font(FONT_REGULAR)
        .fontSize(6.8)
        .fillColor(COLOR_MUTED)
        .text('Authorized Client Signatory', 44, currentY + 54);

      // Right: Company Signatory Box
      const compSigX = 36 + sigBoxW + 20;
      doc
        .save()
        .roundedRect(compSigX, currentY, sigBoxW, sigH, 3)
        .strokeColor(COLOR_BORDER)
        .lineWidth(0.75)
        .stroke();
      doc.restore();

      doc
        .font(FONT_BOLD)
        .fontSize(7.2)
        .fillColor(COLOR_DARK_GRAY)
        .text(signatoryCompany, compSigX, currentY + 7, { align: 'center', width: sigBoxW });

      // Embed custom signature image or Draw Flowing Executive Digital Signature
      if (signatureImage && signatureImage.startsWith('data:image')) {
        try {
          const base64Data = signatureImage.split(',')[1];
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, compSigX + (sigBoxW - 120) / 2, currentY + 17, {
            fit: [120, 28],
            align: 'center',
            valign: 'center',
          });
        } catch (e) {
          drawVectorSig(doc, compSigX, currentY, sigBoxW);
        }
      } else {
        drawVectorSig(doc, compSigX, currentY, sigBoxW);
      }

      function drawVectorSig(d: any, sx: number, fy: number, boxWidth: number) {
        d.save()
          .strokeColor(COLOR_BLACK)
          .lineWidth(1.3)
          .lineCap('round')
          .lineJoin('round');

        const sigSpan = 90;
        const sX = sx + Math.max(10, Math.round((boxWidth - sigSpan) / 2));
        const sY = fy + 33;

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
      doc
        .moveTo(compSigX + 24, currentY + 49)
        .lineTo(compSigX + sigBoxW - 24, currentY + 49)
        .strokeColor(COLOR_BORDER)
        .lineWidth(0.6)
        .stroke();

      doc
        .font(FONT_BOLD)
        .fontSize(7.2)
        .fillColor(COLOR_BLACK)
        .text(signatoryTitle, compSigX, currentY + 54, { align: 'center', width: sigBoxW });

      // ==========================================
      // SECTION J: BUFFERED FOOTER ON ALL PAGES
      // ==========================================
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;

        // Subtle divider
        doc
          .save()
          .strokeColor('#E2E8F0')
          .lineWidth(0.5)
          .moveTo(36, 798)
          .lineTo(36 + tableW, 798)
          .stroke();

        // Footer Text
        doc
          .font(FONT_REGULAR)
          .fontSize(6.5)
          .fillColor(COLOR_MUTED)
          .text(
            'This document is a commercial cost quotation and does not constitute a Tax Invoice.',
            36,
            804,
            { lineBreak: false }
          );

        doc
          .font(FONT_REGULAR)
          .fontSize(6.5)
          .fillColor(COLOR_MUTED)
          .text(`Page ${i + 1} of ${range.count}`, 36 + tableW - 80, 804, {
            width: 80,
            align: 'right',
            lineBreak: false,
          });

        doc.restore();
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
