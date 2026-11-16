import dotenv from 'dotenv';

dotenv.config();

function getPositiveInteger(
  value: string | undefined,
  fallback: number,
  variableName: string
): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${variableName} must be a positive integer.`);
  }

  return parsed;
}

function getDurationInMilliseconds(
  value: string,
  variableName: string
): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);

  if (!match) {
    throw new Error(
      `${variableName} must use a supported duration, e.g. 30s, 15m, 2h, or 7d.`
    );
  }

  const amount = Number(match[1]);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`${variableName} must be a positive duration.`);
  }

  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const milliseconds = amount * multipliers[unit];

  if (!Number.isSafeInteger(milliseconds)) {
    throw new Error(`${variableName} duration is too large.`);
  }

  return milliseconds;
}

function getRequiredSecret(value: string | undefined,
  variableName: string
): string {
  if (!value || value.length < 32) {
    throw new Error(
      `${variableName} must contain at least 32 characters.`
    );
  }
  return value;
}

const jwtAccessSecret = getRequiredSecret(
  process.env.JWT_ACCESS_SECRET,
  'JWT_ACCESS_SECRET'
);

const jwtRefreshSecret = getRequiredSecret(
  process.env.JWT_REFRESH_SECRET,
  'JWT_REFRESH_SECRET'
);

if (jwtAccessSecret === jwtRefreshSecret) {
  throw new Error(
    'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.'
  );
}

const jwtRefreshExpiresIn =
  process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const jwtRefreshExpiresInMs = getDurationInMilliseconds(jwtRefreshExpiresIn, 'JWT_REFRESH_EXPIRES_IN');

const khaltiBaseUrl =
  process.env.KHALTI_BASE_URL ||
  'https://dev.khalti.com/api/v2';

const clientUrl =
  process.env.CLIENT_URL || 'http://localhost:5173';

const allowedKhaltiHosts = [
  'dev.khalti.com',
  'khalti.com',
];

const khaltiUrl = new URL(khaltiBaseUrl);

if (
  !allowedKhaltiHosts.includes(khaltiUrl.hostname) ||
  khaltiUrl.protocol !== 'https:'
) {
  throw new Error('Invalid KHALTI_BASE_URL.');
}

const parsedClientUrl = new URL(clientUrl);

if (!['http:', 'https:'].includes(parsedClientUrl.protocol)) {
  throw new Error('CLIENT_URL must use HTTP or HTTPS.');
}

export const config = {
  port: getPositiveInteger(process.env.PORT, 5000, 'PORT'),
  nodeEnv: process.env.NODE_ENV || 'development',


  jwtAccessSecret,
  jwtRefreshSecret,

  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn,
  jwtRefreshExpiresInMs,

  khaltiSecretKey: process.env.KHALTI_SECRET_KEY || '',
  khaltiBaseUrl: khaltiUrl.toString().replace(/\/$/, ''),
  clientUrl: parsedClientUrl.origin,

  database: {
    name: process.env.DB_NAME || 'booknest_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: getPositiveInteger(process.env.DB_PORT, 3306, 'DB_PORT')
  },
};