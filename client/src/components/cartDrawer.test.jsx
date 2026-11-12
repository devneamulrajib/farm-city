import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Header } from './layout.jsx';
import auth from '../store/authSlice.js';
import cart from '../store/cartSlice.js';
import ui from '../store/uiSlice.js';

function renderHeader() {
  const store = configureStore({
    reducer: { auth, cart, ui },
    preloadedState: {
      auth: { user: null, status: 'ready' },
      ui: { locale: 'en', miniCart: false, mobileNav: false },
      cart: {
        status: 'ready',
        cart: {
          items: [{
            id: 'line-1',
            slug: 'padma-ilish',
            name: { en: 'Padma Ilish', bn: 'পদ্মার ইলিশ' },
            image: '',
            mode: 'variant',
            variantLabel: '1 kg',
            quantity: 2,
            unitPrice: 1950,
            lineTotal: 3900,
            issues: [],
          }],
          subtotal: 3900,
          discount: 0,
          total: 3900,
          coupon: null,
        },
      },
    },
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Header categories={[]} />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('cart drawer', () => {
  it('shows the lines that the header badge is counting', async () => {
    renderHeader();
    expect(screen.getByLabelText('Cart').textContent).toContain('2');
    await userEvent.click(screen.getByLabelText('Cart'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.className).toContain('inset-y-0');
    expect(screen.getByText('Padma Ilish')).toBeTruthy();
    expect(screen.getByText('1 kg')).toBeTruthy();
  });
});
