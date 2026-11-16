
import type { Request, Response } from 'express';
import { UniqueConstraintError, Op } from 'sequelize';

import { sequelize } from '../config/database.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import RefreshToken from '../models/RefreshToken.js';

import { hashPassword, comparePassword } from '../utils/password.js';
import { config as env } from '../config/env.js';

import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashToken,
    type RefreshTokenPayload,
} from '../utils/token.js';

// --------------------------------------------------
// REFRESH COOKIE CONFIGURATION
// --------------------------------------------------

const isProduction = env.nodeEnv === 'production';

const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    path: '/api/auth',
};

// --------------------------------------------------
// REGISTER
// --------------------------------------------------

export async function register(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !name.trim() ||
            !email.trim() ||
            password.length === 0
        ) {
            res.status(400).json({
                message: 'Name, email, and password are required.',
            });
            return;
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (normalizedName.length > 150 || normalizedEmail.length > 255) {
            res.status(400).json({
                message: 'Name or email exceeds the allowed length.',
            });
            return;
        }

        if (
            password.length < 8 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            res.status(400).json({
                message:
                    'Password must be at least 8 characters and no more than 72 UTF-8 bytes.',
            });
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(normalizedEmail)) {
            res.status(400).json({
                message: 'Please provide a valid email address.',
            });
            return;
        }

        const existingUser = await User.findOne({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            res.status(409).json({
                message: 'An account with this email already exists.',
            });
            return;
        }

        const passwordHash = await hashPassword(password);

        const createdUser = await sequelize.transaction(
            async (transaction) => {
                const user = await User.create(
                    {
                        name: normalizedName,
                        email: normalizedEmail,
                        passwordHash,
                        role: 'customer',
                    },
                    { transaction }
                );

                await Cart.create(
                    { userId: user.id },
                    { transaction }
                );

                await Wishlist.create(
                    { userId: user.id },
                    { transaction }
                );

                return user;
            }
        );

        res.status(201).json({
            message: 'Registration successful.',
            user: {
                id: createdUser.id,
                name: createdUser.name,
                email: createdUser.email,
                role: createdUser.role,
            },
        });
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            res.status(409).json({
                message: 'An account with this email already exists.',
            });
            return;
        }

        res.status(500).json({
            message: 'Internal server error during registration.',
        });
    }
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

export async function login(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            password.length === 0
        ) {
            res.status(400).json({
                message: 'Email and password are required.',
            });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            where: { email: normalizedEmail },
        });

        if (!user || !user.passwordHash) {
            res.status(401).json({
                message: 'Invalid email or password.',
            });
            return;
        }

        const isPasswordValid = await comparePassword(
            password,
            user.passwordHash
        );

        if (!isPasswordValid) {
            res.status(401).json({
                message: 'Invalid email or password.',
            });
            return;
        }

        const accessToken = generateAccessToken({
            userId: user.id,
            role: user.role,
        });

        const refreshToken = generateRefreshToken({
            userId: user.id,
        });

        const tokenHash = hashToken(refreshToken);

        const expiresAt = new Date(
            Date.now() + env.jwtRefreshExpiresInMs
        );

        await RefreshToken.create({
            userId: user.id,
            tokenHash,
            expiresAt,
        });

        res.cookie('refreshToken', refreshToken, {
            ...refreshCookieOptions,
            maxAge: env.jwtRefreshExpiresInMs,
        });

        res.status(200).json({
            message: 'Login successful.',
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch {
        res.status(500).json({
            message: 'Internal server error during login.',
        });
    }
}

// --------------------------------------------------
// REFRESH TOKEN ROTATION
// --------------------------------------------------

export async function refresh(
    req: Request,
    res: Response
): Promise<void> {
    try {
        // 1. Read refresh token from HttpOnly cookie.
        const rawRefreshToken = req.cookies?.refreshToken;

        if (
            typeof rawRefreshToken !== 'string' ||
            !rawRefreshToken.trim()
        ) {
            res.status(401).json({
                message: 'Refresh token is missing.',
            });
            return;
        }

        // 2. Verify JWT signature and expiration.
        let payload: RefreshTokenPayload;

        try {
            payload = verifyRefreshToken(rawRefreshToken);
        } catch {
            res.status(401).json({
                message: 'Invalid or expired refresh token.',
            });
            return;
        }

        // 3. Find the corresponding database record.
        const tokenHash = hashToken(rawRefreshToken);

        const storedToken = await RefreshToken.findOne({
            where: {
                userId: payload.userId,
                tokenHash,
            },
        });

        if (
            !storedToken ||
            storedToken.revokedAt !== null ||
            storedToken.expiresAt.getTime() <= Date.now()
        ) {
            res.status(401).json({
                message: 'Refresh token is invalid or has been revoked.',
            });
            return;
        }

        // 4. Confirm that the account still exists and is active.
        const user = await User.findByPk(payload.userId);

        if (!user) {
            res.status(401).json({
                message: 'User account is unavailable.',
            });
            return;
        }

        // 5. Atomically revoke the old token and create a new one.
        const newRefreshToken = await sequelize.transaction(
            async (transaction) => {
                const [updatedCount] = await RefreshToken.update(
                    {
                        revokedAt: new Date(),
                    },
                    {
                        where: {
                            id: storedToken.id,
                            revokedAt: null,
                            expiresAt: { [Op.gt]: new Date() },
                        },
                        transaction,
                    }
                );

                if (updatedCount !== 1) {
                    return null;
                }

                const generatedToken = generateRefreshToken({
                    userId: user.id,
                });

                await RefreshToken.create(
                    {
                        userId: user.id,
                        tokenHash: hashToken(generatedToken),
                        expiresAt: new Date(
                            Date.now() + env.jwtRefreshExpiresInMs
                        ),
                    },
                    { transaction }
                );

                return generatedToken;
            }
        );

        if (!newRefreshToken) {
            res.status(401).json({
                message: 'Refresh token has already been used or revoked.',
            });
            return;
        }

        // 6. Generate a new access token using the current database role.
        const accessToken = generateAccessToken({
            userId: user.id,
            role: user.role,
        });

        // 7. Replace the old refresh cookie with consistent options.
        res.cookie('refreshToken', newRefreshToken, {
            ...refreshCookieOptions,
            maxAge: env.jwtRefreshExpiresInMs,
        });

        // 8. Return the new access token and safe user details.
        res.status(200).json({
            message: 'Token refreshed successfully.',
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch {
        res.status(500).json({
            message: 'Internal server error during token refresh.',
        });
    }
}

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

export async function logout(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const rawRefreshToken = req.cookies?.refreshToken;

        if (
            typeof rawRefreshToken === 'string' &&
            rawRefreshToken.trim()
        ) {
            const tokenHash = hashToken(rawRefreshToken);

            await RefreshToken.update(
                {
                    revokedAt: new Date(),
                },
                {
                    where: {
                        tokenHash,
                        revokedAt: null,
                    },
                }
            );
        }

        // Clear the cookie using the same options used when setting it.
        res.clearCookie('refreshToken', refreshCookieOptions);

        res.status(200).json({
            message: 'Logout successful.',
        });
    } catch {
        res.status(500).json({
            message: 'Internal server error during logout.',
        });
    }
}
