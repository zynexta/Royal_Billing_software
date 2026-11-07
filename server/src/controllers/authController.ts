import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account is deactivated. Please contact support.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const payload = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });

    await logAudit({
      action: 'USER_LOGIN',
      entityType: 'Auth',
      userId: user._id.toString(),
      userName: user.name,
      details: { email: user.email },
    });

    return sendSuccess(res, {
      token,
      user: payload,
    }, 'Login successful');
  } catch (error) {
    return sendError(res, 'Login failed', 500, (error as Error).message);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch user profile', 500, (error as Error).message);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  if (req.user) {
    await logAudit({
      action: 'USER_LOGOUT',
      entityType: 'Auth',
      userId: req.user.id,
      userName: req.user.name,
    });
  }
  return sendSuccess(res, null, 'Logged out successfully');
}

