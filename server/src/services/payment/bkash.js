import { env } from '../../config/env.js';

async function postJson(url, body, headers) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.statusCode && !['0000'].includes(data.statusCode) && !data.id_token)) {
    const message = data.errorMessage || data.statusMessage || data.message || 'bKash rejected the request.';
    const error = new Error(message);
    error.details = data;
    throw error;
  }
  return data;
}

export const bkashProvider = {
  id: 'bkash',
  label: 'bKash',
  isConfigured() {
    const { appKey, appSecret, username, password, baseUrl } = env.bkash;
    return Boolean(appKey && appSecret && username && password && baseUrl);
  },
  async grantToken() {
    const data = await postJson(`${env.bkash.baseUrl}/checkout/token/grant`, {
      app_key: env.bkash.appKey,
      app_secret: env.bkash.appSecret,
    }, {
      username: env.bkash.username,
      password: env.bkash.password,
    });
    if (!data.id_token) throw new Error('bKash did not return an access token.');
    return data.id_token;
  },
  async initiate({ order }) {
    const token = await this.grantToken();
    const data = await postJson(`${env.bkash.baseUrl}/checkout/create`, {
      mode: '0011',
      payerReference: order.customer.phone,
      callbackURL: `${env.serverUrl}/api/payments/bkash/callback`,
      amount: Number(order.total).toFixed(2),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: order.orderNumber,
    }, {
      authorization: token,
      'x-app-key': env.bkash.appKey,
    });
    if (!data.bkashURL || !data.paymentID) throw new Error(data.statusMessage || 'bKash did not return a checkout URL.');
    return { redirectUrl: data.bkashURL, providerPaymentId: data.paymentID };
  },
  async verify({ paymentID, status }) {
    if (!paymentID || status !== 'success') {
      return { ok: false, providerPaymentId: paymentID || '', reason: status || 'cancelled' };
    }
    const token = await this.grantToken();
    const data = await postJson(`${env.bkash.baseUrl}/checkout/execute`, { paymentID }, {
      authorization: token,
      'x-app-key': env.bkash.appKey,
    });
    const ok = data.transactionStatus === 'Completed';
    return {
      ok,
      providerPaymentId: paymentID,
      providerTransactionId: data.trxID || '',
      rawStatus: data.transactionStatus || '',
      reason: ok ? '' : data.statusMessage || 'bKash payment was not completed.',
    };
  },
};
