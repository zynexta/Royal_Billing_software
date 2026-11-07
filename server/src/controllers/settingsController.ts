import { Request, Response } from 'express';
import { CompanySettings } from '../models/CompanySettings.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

export async function getSettings(req: Request, res: Response) {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create({});
    }
    return sendSuccess(res, settings);
  } catch (error) {
    return sendError(res, 'Failed to fetch company settings', 500, (error as Error).message);
  }
}

export async function updateCompanyProfile(req: AuthenticatedRequest, res: Response) {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) settings = await CompanySettings.create({});

    settings.companyProfile = {
      ...settings.companyProfile,
      ...req.body,
    };
    await settings.save();

    await logAudit({
      action: 'SETTINGS_COMPANY_UPDATED',
      entityType: 'Settings',
      entityId: settings._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
    });

    return sendSuccess(res, settings.companyProfile, 'Company profile updated');
  } catch (error) {
    return sendError(res, 'Failed to update company profile', 500, (error as Error).message);
  }
}

export async function updateInvoiceSettings(req: AuthenticatedRequest, res: Response) {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) settings = await CompanySettings.create({});

    settings.invoiceSettings = {
      ...settings.invoiceSettings,
      ...req.body,
    };
    await settings.save();

    await logAudit({
      action: 'SETTINGS_INVOICE_UPDATED',
      entityType: 'Settings',
      entityId: settings._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
    });

    return sendSuccess(res, settings.invoiceSettings, 'Invoice preferences updated');
  } catch (error) {
    return sendError(res, 'Failed to update invoice settings', 500, (error as Error).message);
  }
}

export async function updateGSTSettings(req: AuthenticatedRequest, res: Response) {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) settings = await CompanySettings.create({});

    settings.gstSettings = {
      ...settings.gstSettings,
      ...req.body,
    };
    await settings.save();

    await logAudit({
      action: 'SETTINGS_GST_UPDATED',
      entityType: 'Settings',
      entityId: settings._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
    });

    return sendSuccess(res, settings.gstSettings, 'GST configuration updated');
  } catch (error) {
    return sendError(res, 'Failed to update GST settings', 500, (error as Error).message);
  }
}

export async function updateBankDetails(req: AuthenticatedRequest, res: Response) {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) settings = await CompanySettings.create({});

    settings.bankDetails = {
      ...settings.bankDetails,
      ...req.body,
    };
    await settings.save();

    await logAudit({
      action: 'SETTINGS_BANK_UPDATED',
      entityType: 'Settings',
      entityId: settings._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
    });

    return sendSuccess(res, settings.bankDetails, 'Bank details updated');
  } catch (error) {
    return sendError(res, 'Failed to update bank details', 500, (error as Error).message);
  }
}

