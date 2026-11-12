export function toPaisa(taka) {
  return Math.round(Number(taka) * 100);
}

export function fromPaisa(paisa) {
  return Math.round(Number(paisa)) / 100;
}

export function addMoney(...amounts) {
  return fromPaisa(amounts.reduce((sum, amount) => sum + toPaisa(amount || 0), 0));
}

export function subMoney(a, b) {
  return fromPaisa(toPaisa(a || 0) - toPaisa(b || 0));
}

export function mulMoney(price, qty) {
  return fromPaisa(Math.round(toPaisa(price) * Number(qty)));
}
