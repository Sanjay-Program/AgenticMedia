import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import type { JWTPayload, TokenPair } from '@agenticmedia/shared-types';

export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRY,
  });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, config.JWT_SECRET) as JWTPayload;
}

export function generateTokenPair(
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): TokenPair & { refreshTokenHash: string } {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  return { accessToken, refreshToken, refreshTokenHash };
}
