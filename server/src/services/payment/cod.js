export const codProvider = {
  id: 'cod',
  label: 'Cash on delivery',
  isConfigured() {
    return true;
  },
  async initiate() {
    return { redirectUrl: '', providerPaymentId: '' };
  },
  async verify() {
    return { ok: true, providerPaymentId: '', providerTransactionId: '', rawStatus: 'cod' };
  },
};
