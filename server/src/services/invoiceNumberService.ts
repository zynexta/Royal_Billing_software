import { CompanySettings } from '../models/CompanySettings.js';
import { Invoice } from '../models/Invoice.js';

export async function generateNextInvoiceNumber(): Promise<string> {
  let settings = await CompanySettings.findOne();
  if (!settings) {
    settings = await CompanySettings.create({});
  }

  const prefix = settings.invoiceSettings.prefix || 'INV-2026';
  let candidateNumber = settings.invoiceSettings.nextNumber || 1;

  // Atomically increment the sequence counter
  while (true) {
    const formatted = `${prefix}-${String(candidateNumber).padStart(3, '0')}`;

    // Check if this invoice number already exists (e.g. from prior runs or manual creations)
    const exists = await Invoice.exists({ invoiceNumber: formatted });
    if (!exists) {
      // Update settings with the next sequential number
      await CompanySettings.updateOne(
        { _id: settings._id },
        { $set: { 'invoiceSettings.nextNumber': candidateNumber + 1 } }
      );
      return formatted;
    }
    candidateNumber++;
  }
}

