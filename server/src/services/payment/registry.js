import { bkashProvider } from './bkash.js';
import { codProvider } from './cod.js';
import { nagadProvider } from './nagad.js';
import { sslcommerzProvider } from './sslcommerz.js';

const providers = [codProvider, bkashProvider, nagadProvider, sslcommerzProvider];

export function getProvider(id) {
  return providers.find((provider) => provider.id === id) || null;
}

export function listAdminProviders(settings) {
  return providers.map((provider) => {
    const settingsEnabled = Boolean(settings.payments?.[provider.id]?.enabled);
    const configured = provider.isConfigured();
    return {
      id: provider.id,
      label: provider.label,
      settingsEnabled,
      configured,
      available: settingsEnabled && configured,
    };
  });
}

export function listPublicMethods(settings) {
  return listAdminProviders(settings)
    .filter((provider) => provider.available)
    .map(({ id, label }) => ({ id, label }));
}
