export function normalizeBdPhone(input) {
  if (input === undefined || input === null) return null;
  let phone = String(input).trim().replace(/[\s()-]/g, '');
  if (phone.startsWith('+880')) phone = `0${phone.slice(4)}`;
  else if (phone.startsWith('880')) phone = `0${phone.slice(3)}`;
  if (!/^01[3-9]\d{8}$/.test(phone)) return null;
  return phone;
}
