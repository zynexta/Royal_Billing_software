import { CompanySettings } from '../models/CompanySettings.js';
import { Quotation } from '../models/Quotation.js';

export async function generateNextQuotationNumber(): Promise<string> {
  let settings = await CompanySettings.findOne();
  if (!settings) {
    settings = await CompanySettings.create({});
  }

  const prefix = settings.quotationSettings?.prefix || 'QT-2026';
  let candidateNumber = settings.quotationSettings?.nextNumber || 1;

  // Atomically increment the sequence counter and ensure uniqueness
  while (true) {
    const formatted = `${prefix}-${String(candidateNumber).padStart(3, '0')}`;

    const exists = await Quotation.exists({ quotationNumber: formatted });
    if (!exists) {
      await CompanySettings.updateOne(
        { _id: settings._id },
        { $set: { 'quotationSettings.nextNumber': candidateNumber + 1 } }
      );
      return formatted;
    }
    candidateNumber++;
  }
}
