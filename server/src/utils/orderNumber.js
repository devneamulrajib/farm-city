import crypto from 'crypto';

export function dhakaDateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts.replaceAll('-', '');
}

export function makeOrderNumber(date = new Date()) {
  const stamp = dhakaDateStamp(date);
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FC-${stamp}-${rand}`;
}

export function makeViewToken() {
  return crypto.randomBytes(24).toString('hex');
}
