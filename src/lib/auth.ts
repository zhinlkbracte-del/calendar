import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'schedule-app-secret-key-change-in-production';
const SALT_ROUNDS = 10;
const TOKEN_EXPIRES = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export function getTokenFromHeaders(headers: Headers): string | null {
  // Try Authorization header first
  const auth = headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  // Try cookie
  const cookie = headers.get('cookie');
  if (cookie) {
    const tokenCookie = cookie.split(';').find((c) => c.trim().startsWith('token='));
    if (tokenCookie) {
      return tokenCookie.split('=')[1]?.trim() || null;
    }
  }
  return null;
}

import { NextRequest } from 'next/server';

/**
 * Get auth token from NextRequest.
 * Uses request.cookies first (most reliable in App Router),
 * then falls back to header parsing.
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // Method 1: NextRequest.cookies (reliable for App Router)
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) return cookieToken;

  // Method 2: Fallback to header parsing
  return getTokenFromHeaders(request.headers);
}
