import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsAdminPage } from './AdminPages.jsx';

const { upload, saveSettings, settings } = vi.hoisted(() => ({
  upload: vi.fn(),
  saveSettings: vi.fn(),
  settings: {
    storeName: 'Farm City',
    phone: '01710000001',
    email: 'hello@farmcity.com',
    announcement: { enabled: false, text: { en: '', bn: '' }, link: '' },
    payments: { cod: { enabled: true }, bkash: { enabled: false }, nagad: { enabled: false }, sslcommerz: { enabled: false } },
    defaultDeliveryCharge: 120,
    freeDeliveryThreshold: 3500,
    lowStockThreshold: 5,
    highlights: [],
    testimonials: [],
    logo: null,
  },
}));

vi.mock('../services/resources.js', () => ({
  adminApi: {
    settings: () => Promise.resolve({ data: { ...settings } }),
    providers: () => Promise.resolve({ data: [] }),
    zones: () => Promise.resolve({ data: [] }),
    inquiries: () => Promise.resolve({ data: [] }),
    upload,
    saveSettings,
  },
  catalogApi: {
    settings: () => Promise.resolve({ data: { storeName: 'Farm City', logo: null } }),
  },
}));

describe('admin company logo', () => {
  beforeEach(() => {
    upload.mockReset();
    saveSettings.mockReset();
    saveSettings.mockImplementation(async (body) => ({ data: { ...settings, ...body } }));
  });

  it('previews an upload, clears back to the default mark, and saves with the other settings', async () => {
    const user = userEvent.setup();
    upload.mockResolvedValue({ data: { url: '/uploads/new-logo.png', publicId: 'local:new-logo.png' } });
    render(<SettingsAdminPage />);
    const preview = async () => (await screen.findByRole('img', { name: 'Company logo' })).getAttribute('src');
    expect(await preview()).toBe('/logo.png');
    expect(screen.queryByRole('button', { name: 'Use the default logo' })).toBeNull();

    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('PNG, JPEG, WebP, or SVG'), file);
    await waitFor(async () => expect(await preview()).toBe('/uploads/new-logo.png'));
    expect(upload).toHaveBeenCalledWith(file);

    const storeForm = screen.getByRole('heading', { name: 'Store details' }).closest('form');
    await user.click(within(storeForm).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saveSettings).toHaveBeenCalled());
    expect(saveSettings.mock.calls[0][0].logo).toEqual({
      url: '/uploads/new-logo.png',
      publicId: 'local:new-logo.png',
      alt: 'Farm City',
    });
    expect(saveSettings.mock.calls[0][0].storeName).toBe('Farm City');

    await user.click(screen.getByRole('button', { name: 'Use the default logo' }));
    expect(await preview()).toBe('/logo.png');
    await user.click(within(storeForm).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saveSettings).toHaveBeenCalledTimes(2));
    expect(saveSettings.mock.calls[1][0].logo).toBeNull();
  });
});
