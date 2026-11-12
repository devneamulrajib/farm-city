import crypto from 'crypto';
import { env } from '../../config/env.js';

function sign(data, privateKey) {
  const signer = crypto.createSign('SHA256');
  signer.update(data);
  signer.end();
  return signer.sign(privateKey, 'base64');
}

function encrypt(data, publicKey) {
  return crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(data)).toString('base64');
}

function decrypt(data, privateKey) {
  return crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(data, 'base64')).toString('utf8');
}

function nagadHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-KM-Api-Version': 'v-0.2.0',
    'X-KM-IP-V4': '127.0.0.1',
    'X-KM-Client-Type': 'PC_WEB',
  };
}

export const nagadProvider = {
  id: 'nagad',
  label: 'Nagad',
  isConfigured() {
    const { merchantId, merchantNumber, publicKey, privateKey, baseUrl } = env.nagad;
    return Boolean(merchantId && merchantNumber && publicKey.includes('BEGIN') && privateKey.includes('BEGIN') && baseUrl);
  },
  async initiate({ order }) {
    const dateTime = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const challenge = crypto.randomBytes(16).toString('hex');
    const orderId = order.orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
    const initPlain = JSON.stringify({
      merchantId: env.nagad.merchantId,
      datetime: dateTime,
      orderId,
      challenge,
    });
    const initResponse = await fetch(`${env.nagad.baseUrl}/check-out/initialize/${env.nagad.merchantId}/${orderId}`, {
      method: 'POST',
      headers: nagadHeaders(),
      body: JSON.stringify({
        accountNumber: env.nagad.merchantNumber,
        dateTime,
        sensitiveData: encrypt(initPlain, env.nagad.publicKey),
        signature: sign(initPlain, env.nagad.privateKey),
      }),
    });
    const initData = await initResponse.json().catch(() => ({}));
    if (!initResponse.ok || !initData.sensitiveData) {
      throw new Error(initData.message || initData.reason || 'Nagad could not initialize the payment.');
    }
    const initSecret = JSON.parse(decrypt(initData.sensitiveData, env.nagad.privateKey));
    const completePlain = JSON.stringify({
      merchantId: env.nagad.merchantId,
      orderId,
      currencyCode: '050',
      amount: Number(order.total).toFixed(2),
      challenge: initSecret.challenge || challenge,
    });
    const completeResponse = await fetch(`${env.nagad.baseUrl}/check-out/complete/${initSecret.paymentReferenceId}`, {
      method: 'POST',
      headers: nagadHeaders(),
      body: JSON.stringify({
        sensitiveData: encrypt(completePlain, env.nagad.publicKey),
        signature: sign(completePlain, env.nagad.privateKey),
        merchantCallbackURL: `${env.serverUrl}/api/payments/nagad/callback`,
      }),
    });
    const completeData = await completeResponse.json().catch(() => ({}));
    if (!completeResponse.ok || !completeData.callBackUrl) {
      throw new Error(completeData.message || 'Nagad could not start checkout.');
    }
    return { redirectUrl: completeData.callBackUrl, providerPaymentId: initSecret.paymentReferenceId };
  },
  async verify({ paymentRefId, payment_ref_id, status }) {
    const ref = paymentRefId || payment_ref_id || '';
    if (!ref || ['Cancelled', 'Canceled', 'Failed', 'Abort'].includes(status)) {
      return { ok: false, providerPaymentId: ref, reason: status || 'cancelled' };
    }
    const response = await fetch(`${env.nagad.baseUrl}/verify/payment/${ref}`, { headers: nagadHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Nagad verification failed.');
    const ok = data.status === 'Success' || data.statusCode === '000';
    return {
      ok,
      providerPaymentId: ref,
      providerTransactionId: data.paymentRefId || data.issuerPaymentRefNo || '',
      rawStatus: data.status || '',
      reason: ok ? '' : data.reason || 'Nagad payment was not successful.',
    };
  },
};
