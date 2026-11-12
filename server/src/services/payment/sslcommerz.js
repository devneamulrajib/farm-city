import { env } from '../../config/env.js';

function gatewayUrl() {
  return env.sslcommerz.isLive
    ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';
}

function validationUrl() {
  return env.sslcommerz.isLive
    ? 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
    : 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';
}

export const sslcommerzProvider = {
  id: 'sslcommerz',
  label: 'Card / online banking',
  isConfigured() {
    return Boolean(env.sslcommerz.storeId && env.sslcommerz.storePassword);
  },
  async initiate({ order }) {
    const params = new URLSearchParams({
      store_id: env.sslcommerz.storeId,
      store_passwd: env.sslcommerz.storePassword,
      total_amount: Number(order.total).toFixed(2),
      currency: 'BDT',
      tran_id: order.orderNumber,
      success_url: `${env.serverUrl}/api/payments/sslcommerz/success`,
      fail_url: `${env.serverUrl}/api/payments/sslcommerz/fail`,
      cancel_url: `${env.serverUrl}/api/payments/sslcommerz/cancel`,
      ipn_url: `${env.serverUrl}/api/payments/sslcommerz/ipn`,
      cus_name: order.customer.name,
      cus_email: order.customer.email,
      cus_add1: order.shippingAddress.addressLine,
      cus_city: order.shippingAddress.district,
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: order.customer.phone,
      shipping_method: 'YES',
      ship_name: order.customer.name,
      ship_add1: order.shippingAddress.addressLine,
      ship_city: order.shippingAddress.district,
      ship_postcode: '1000',
      ship_country: 'Bangladesh',
      product_name: `Farm City ${order.orderNumber}`,
      product_category: 'seafood',
      product_profile: 'general',
    });
    const response = await fetch(gatewayUrl(), { method: 'POST', body: params });
    const data = await response.json().catch(() => ({}));
    if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
      throw new Error(data.failedreason || 'SSLCommerz could not start the payment.');
    }
    return { redirectUrl: data.GatewayPageURL, providerPaymentId: data.sessionkey || order.orderNumber };
  },
  async verify(payload) {
    const valId = payload.val_id || payload.valId;
    if (!valId) return { ok: false, providerPaymentId: payload.tran_id || '', reason: payload.status || 'missing validation id' };
    const url = new URL(validationUrl());
    url.searchParams.set('val_id', valId);
    url.searchParams.set('store_id', env.sslcommerz.storeId);
    url.searchParams.set('store_passwd', env.sslcommerz.storePassword);
    url.searchParams.set('format', 'json');
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    const ok = data.status === 'VALID' || data.status === 'VALIDATED';
    const amountOk = Number(data.amount) === Number(payload.expectedAmount) || payload.expectedAmount == null || Number(data.currency_amount) === Number(payload.expectedAmount);
    return {
      ok: ok && amountOk,
      providerPaymentId: data.tran_id || payload.tran_id || '',
      providerTransactionId: data.bank_tran_id || data.val_id || '',
      rawStatus: data.status || '',
      reason: ok ? '' : data.error || 'SSLCommerz could not validate the payment.',
      orderNumber: data.tran_id || payload.tran_id,
    };
  },
};
