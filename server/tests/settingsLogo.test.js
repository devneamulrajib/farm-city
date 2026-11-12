import { describe, expect, it } from 'vitest';
import { publicSettings } from '../src/services/settingsService.js';
import { settingsSchema } from '../src/validators/schemas.js';

const base = {
  storeName: 'Farm City',
  tagline: { en: 'The day’s catch, at your door.', bn: '' },
  phone: '01710000001',
  email: 'hello@farmcity.com',
  whatsapp: '',
  address: { en: 'Dhaka', bn: '' },
  about: { en: '', bn: '' },
  hours: { en: '', bn: '' },
  announcement: { enabled: false, text: { en: '', bn: '' }, link: '' },
  social: { facebook: '', instagram: '' },
  payments: {
    cod: { enabled: true },
    bkash: { enabled: false },
    nagad: { enabled: false },
    sslcommerz: { enabled: false },
  },
  defaultDeliveryCharge: 120,
  freeDeliveryThreshold: 3500,
  lowStockThreshold: 5,
  highlights: [],
  testimonials: [],
};

function parse(logo) {
  return settingsSchema.parse({ body: { ...base, logo }, query: {}, params: {} });
}

describe('company logo setting', () => {
  it('publishes an uploaded logo', () => {
    const logo = { url: '/uploads/mark.png', publicId: 'local:mark.png', alt: 'Farm City' };
    const parsed = parse(logo);
    expect(parsed.body.logo).toEqual(logo);
    expect(publicSettings({ ...base, logo }).logo).toEqual(logo);
  });

  it('treats a cleared logo as the default mark', () => {
    expect(parse(null).body.logo).toBeNull();
    expect(publicSettings({ ...base, logo: null }).logo).toBeNull();
    expect(publicSettings({ ...base, logo: { url: '', publicId: '', alt: '' } }).logo).toBeNull();
    expect(publicSettings(base).logo).toBeNull();
  });
});
