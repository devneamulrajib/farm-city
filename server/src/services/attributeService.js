import { ApiError } from '../utils/ApiError.js';

export function validateAttributes(schema = [], raw = {}) {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const known = new Set(schema.map((field) => field.key));
  const unknown = Object.keys(input).filter((key) => !known.has(key));
  if (unknown.length) {
    throw new ApiError(400, `Unknown attributes: ${unknown.join(', ')}`);
  }

  const cleaned = {};
  const errors = [];
  for (const field of schema) {
    const label = field.label?.en || field.key;
    const value = input[field.key];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (field.required) errors.push({ field: field.key, message: `${label} is required` });
      continue;
    }
    if (field.type === 'text') {
      if (typeof value !== 'string') errors.push({ field: field.key, message: `${label} must be text` });
      else cleaned[field.key] = value.trim();
    } else if (field.type === 'number') {
      const number = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(number)) errors.push({ field: field.key, message: `${label} must be a number` });
      else cleaned[field.key] = number;
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') errors.push({ field: field.key, message: `${label} must be yes or no` });
      else cleaned[field.key] = value;
    } else if (field.type === 'select') {
      const allowed = new Set((field.options || []).map((option) => option.value));
      if (!allowed.has(value)) errors.push({ field: field.key, message: `${label} is not a valid choice` });
      else cleaned[field.key] = value;
    } else if (field.type === 'multiselect') {
      const allowed = new Set((field.options || []).map((option) => option.value));
      if (!Array.isArray(value) || value.some((item) => !allowed.has(item))) {
        errors.push({ field: field.key, message: `${label} has an invalid choice` });
      } else cleaned[field.key] = value;
    }
  }
  if (errors.length) throw new ApiError(400, 'Some specifications are missing or invalid.', errors);
  return cleaned;
}
