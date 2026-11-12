import { Setting } from '../models/Setting.js';

export async function getSettings() {
  let settings = await Setting.findOne({ key: 'store' });
  if (!settings) settings = await Setting.create({ key: 'store' });
  return settings;
}

export function publicSettings(settings) {
  return {
    storeName: settings.storeName,
    logo: settings.logo?.url
      ? { url: settings.logo.url, publicId: settings.logo.publicId || '', alt: settings.logo.alt || '' }
      : null,
    tagline: settings.tagline,
    phone: settings.phone,
    email: settings.email,
    whatsapp: settings.whatsapp,
    address: settings.address,
    about: settings.about,
    hours: settings.hours,
    announcement: settings.announcement,
    social: settings.social,
    defaultDeliveryCharge: settings.defaultDeliveryCharge,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    lowStockThreshold: settings.lowStockThreshold,
    highlights: settings.highlights,
    testimonials: settings.testimonials,
  };
}
