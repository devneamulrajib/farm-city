import { DeliveryZone } from '../models/DeliveryZone.js';
import { getSettings } from './settingsService.js';

export async function quoteDelivery({ district, area = '', subtotal = 0 }) {
  const settings = await getSettings();
  const normalizedArea = (area || '').trim();
  let zone = null;
  if (normalizedArea) {
    zone = await DeliveryZone.findOne({ district, area: normalizedArea, isActive: true });
  }
  if (!zone) zone = await DeliveryZone.findOne({ district, area: '', isActive: true });
  let charge = zone ? zone.charge : settings.defaultDeliveryCharge;
  const threshold = settings.freeDeliveryThreshold;
  const free = threshold != null && threshold > 0 && subtotal >= threshold;
  if (free) charge = 0;
  return {
    charge,
    eta: zone?.eta || { en: '1–2 days', bn: '১–২ দিন' },
    district,
    area: normalizedArea,
    freeDelivery: free,
    freeDeliveryThreshold: threshold,
  };
}

export async function listActiveZones() {
  return DeliveryZone.find({ isActive: true }).sort({ district: 1, area: 1 }).lean();
}
