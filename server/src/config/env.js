import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function pem(value) {
  if (!value) return '';
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}

const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4108),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmcity?replicaSet=rs0',
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://127.0.0.1:4178,http://localhost:4178')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-farmcity-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-farmcity-change-me',
  accessTtl: process.env.JWT_ACCESS_TTL || '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  cookieSecure: bool(process.env.COOKIE_SECURE, false),
  cookieSameSite: ['lax', 'strict', 'none'].includes(sameSite) ? sameSite : 'lax',
  serverUrl: process.env.SERVER_URL || `http://127.0.0.1:${process.env.PORT || 4108}`,
  trustProxy: bool(process.env.TRUST_PROXY, false),
  bcryptCost: Number(process.env.BCRYPT_COST || 12),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  bkash: {
    appKey: process.env.BKASH_APP_KEY || '',
    appSecret: process.env.BKASH_APP_SECRET || '',
    username: process.env.BKASH_USERNAME || '',
    password: process.env.BKASH_PASSWORD || '',
    baseUrl: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized',
  },
  nagad: {
    merchantId: process.env.NAGAD_MERCHANT_ID || '',
    merchantNumber: process.env.NAGAD_MERCHANT_NUMBER || '',
    publicKey: pem(process.env.NAGAD_PG_PUBLIC_KEY || ''),
    privateKey: pem(process.env.NAGAD_MERCHANT_PRIVATE_KEY || ''),
    baseUrl: process.env.NAGAD_BASE_URL || 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs',
  },
  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID || '',
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
    isLive: bool(process.env.SSLCOMMERZ_LIVE, false),
  },
};

export const isProd = env.nodeEnv === 'production';

const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|::1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;

export function isAllowedOrigin(origin, { nodeEnv = env.nodeEnv, allowed = env.clientOrigin } = {}) {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  if (nodeEnv === 'production') return false;
  try {
    const url = new URL(origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && PRIVATE_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

export function assertProductionSecrets() {
  if (!isProd) return;
  const weak = ['dev-access-farmcity-change-me', 'dev-refresh-farmcity-change-me', 'change-me', ''];
  if (weak.includes(env.jwtAccessSecret) || weak.includes(env.jwtRefreshSecret)) {
    throw new Error('Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before running in production.');
  }
}
