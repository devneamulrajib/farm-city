import { describe, expect, it } from 'vitest';
import { renderInvoiceHtml } from './invoiceFile.js';

describe('invoice file', () => {
  it('renders a printable Farm City invoice in BDT and escapes customer text', () => {
    const html = renderInvoiceHtml({
      lang: 'bn',
      logoUrl: 'https://farmcity.example/logo.png',
      labels: {
        title: 'Invoice',
        venture: 'A Trikon Holdings venture',
        issued: 'Invoice date',
        orderDate: 'Order date',
        orderNumber: 'Order number',
        currency: 'Currency',
        billTo: 'Bill to',
        deliverTo: 'Deliver to',
        item: 'Item',
        qty: 'Qty',
        price: 'Price',
        amount: 'Amount',
        sku: 'SKU',
        subtotal: 'Subtotal',
        delivery: 'Delivery',
        discount: 'Discount',
        total: 'Total',
        orderStatus: 'Order status',
        payment: 'Payment',
        paymentStatus: 'Payment status',
        thanks: 'Thank you for shopping at Farm City.',
      },
      invoice: {
        invoiceNumber: 'INV-20261112-ABC123',
        orderNumber: 'FC-20261112-ABCDEF',
        issuedLabel: '12 Nov 2026, 14:00',
        orderedLabel: '12 Nov 2026, 10:00',
        statusLabel: 'Delivered',
        paymentLabel: 'Cash on delivery',
        paymentStatusLabel: 'Paid',
        subtotalLabel: '৳400',
        deliveryLabel: '৳70',
        discountLabel: '৳0',
        totalLabel: '৳470',
        customer: { name: 'Karim <script>', phone: '01819001122', email: '' },
        shippingAddress: { addressLine: '12 Road 8', area: 'Dhanmondi', district: 'Dhaka' },
        store: { name: 'Farm City', phone: '01710000000', email: 'hello@farmcity.com', address: { en: 'Dhaka, Bangladesh' } },
        items: [{
          name: { en: 'Pangas', bn: 'পাঙ্গাস' },
          variantLabel: '1 kg',
          sku: 'PAN-1',
          quantity: 2,
          unitPriceLabel: '৳200',
          lineTotalLabel: '৳400',
        }],
      },
    });
    expect(html).toContain('INV-20261112-ABC123');
    expect(html).toContain('BDT');
    expect(html).toContain('৳470');
    expect(html).toContain('A Trikon Holdings venture');
    expect(html).toContain('12 Nov 2026, 14:00');
    expect(html).toContain('পাঙ্গাস');
    expect(html).toContain('Karim &lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
