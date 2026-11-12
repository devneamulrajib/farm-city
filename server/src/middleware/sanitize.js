const blocked = new Set(['__proto__', 'constructor', 'prototype']);

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (blocked.has(key) || key.startsWith('$') || key.includes('.')) continue;
      out[key] = clean(nested);
    }
    return out;
  }
  return value;
}

export function sanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  if (req.params && typeof req.params === 'object') {
    for (const key of Object.keys(req.params)) {
      if (blocked.has(key) || key.startsWith('$') || key.includes('.')) delete req.params[key];
    }
  }
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (blocked.has(key) || key.startsWith('$') || key.includes('.')) delete req.query[key];
    }
  }
  next();
}
