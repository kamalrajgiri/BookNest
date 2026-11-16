import type { UserRole } from '../models/User.js';
import {randomUUID} from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import {config as  env } from '../config/env.js';
import {createHash} from 'node:crypto';

export interface AccessTokenPayload {
  userId: number;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: number;
}


export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn as SignOptions['expiresIn'], 
  });
}


export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as SignOptions['expiresIn'],jwtid: randomUUID(),
  });
}

export function verifyAccessToken(token:string): AccessTokenPayload{
    const decoded = jwt.verify(token, env.jwtAccessSecret);
    if(
        typeof decoded !== 'object' || decoded === null || typeof decoded.userId !== 'number' ||  (decoded.role !== 'customer' && decoded.role !== 'admin')
    ){
        throw new Error('Invalid access token payload');
    }
    return {
        userId: decoded.userId,
        role:decoded.role,
    };
} 

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.jwtRefreshSecret);

  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof decoded.userId !== 'number'
  ) {
    throw new Error('Invalid refresh token payload');
  }

  return {
    userId: decoded.userId,
  };
}

export function hashToken(token:string) : string {
    return createHash('sha256').update(token).digest('hex');
}