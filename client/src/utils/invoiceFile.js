function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

export function renderInvoiceHtml({ invoice, labels, lang = 'en', logoUrl = '' }) {
  const rows = (invoice.items || []).map((item) => {
    const name = item.name?.[lang] || item.name?.en || item.name?.bn || '';
    const variant = item.variantLabel ? ` · ${item.variantLabel}` : '';
    const sku = item.sku ? `<div class="muted">${esc(labels.sku)} ${esc(item.sku)}</div>` : '';
    return `<tr>
      <td>${esc(name)}${esc(variant)}${sku}</td>
      <td class="num">${esc(item.quantity)}</td>
      <td class="num">${esc(item.unitPriceLabel)}</td>
      <td class="num">${esc(item.lineTotalLabel)}</td>
    </tr>`;
  }).join('');
  const address = invoice.store?.address?.[lang] || invoice.store?.address?.en || invoice.store?.address?.bn || '';
  const ship = [invoice.shippingAddress?.addressLine, invoice.shippingAddress?.area, invoice.shippingAddress?.district].filter(Boolean).join(', ');
  const logo = logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(invoice.store?.name || 'Farm City')}" />` : '';
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
  <meta charset="utf-8" />
  <title>${esc(labels.title)} ${esc(invoice.invoiceNumber)}</title>
  <style>
    body { margin: 0; background: #f4f1ea; color: #14202b; font: 15px/1.5 Outfit, "Noto Sans Bengali", sans-serif; }
    main { max-width: 820px; margin: 32px auto; background: #fff; padding: 40px; }
    header { display: flex; justify-content: space-between; gap: 24px; }
    img { height: 56px; width: auto; object-fit: contain; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 36px; margin: 0; color: #12344f; }
    .brand { font-family: Fraunces, Georgia, serif; font-size: 28px; margin: 8px 0 0; }
    .muted { color: #5d7182; font-size: 13px; }
    .eyebrow { letter-spacing: .16em; text-transform: uppercase; font-size: 12px; color: #1d496c; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    th { text-align: left; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #5d7182; border-bottom: 1px solid #d5e0ea; padding: 8px 0; }
    td { border-bottom: 1px solid #eef2f5; padding: 10px 0; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-left: auto; width: min(320px, 100%); margin-top: 12px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand { font-weight: 600; border-top: 1px solid #d5e0ea; margin-top: 6px; padding-top: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
    .meta { display: grid; gap: 4px; text-align: right; }
    @media print { body { background: #fff; } main { margin: 0; max-width: none; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        ${logo}
        <p class="brand">${esc(invoice.store?.name || 'Farm City')}</p>
        <p class="muted">${esc(labels.venture)}</p>
        <p class="muted">${esc(address)}</p>
        <p class="muted">${esc(invoice.store?.phone || '')} ${esc(invoice.store?.email || '')}</p>
      </div>
      <div class="meta">
        <p class="eyebrow">${esc(labels.title)}</p>
        <h1>${esc(invoice.invoiceNumber)}</h1>
        <p>${esc(labels.issued)}: ${esc(invoice.issuedLabel)}</p>
        <p>${esc(labels.orderDate)}: ${esc(invoice.orderedLabel)}</p>
        <p>${esc(labels.orderNumber)}: ${esc(invoice.orderNumber)}</p>
        <p>${esc(labels.currency)}: BDT (৳)</p>
      </div>
    </header>
    <section class="grid">
      <div>
        <p class="eyebrow">${esc(labels.billTo)}</p>
        <p>${esc(invoice.customer?.name)}</p>
        <p class="muted">${esc(invoice.customer?.phone)}</p>
        <p class="muted">${esc(invoice.customer?.email || '')}</p>
      </div>
      <div>
        <p class="eyebrow">${esc(labels.deliverTo)}</p>
        <p>${esc(ship)}</p>
      </div>
    </section>
    <table>
      <thead><tr><th>${esc(labels.item)}</th><th class="num">${esc(labels.qty)}</th><th class="num">${esc(labels.price)}</th><th class="num">${esc(labels.amount)}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>${esc(labels.subtotal)}</span><span>${esc(invoice.subtotalLabel)}</span></div>
      <div><span>${esc(labels.delivery)}</span><span>${esc(invoice.deliveryLabel)}</span></div>
      <div><span>${esc(labels.discount)}</span><span>-${esc(invoice.discountLabel)}</span></div>
      <div class="grand"><span>${esc(labels.total)}</span><span>${esc(invoice.totalLabel)} BDT</span></div>
    </div>
    <p class="muted" style="margin-top:24px">${esc(labels.orderStatus)}: ${esc(invoice.statusLabel)} · ${esc(labels.payment)}: ${esc(invoice.paymentLabel)} · ${esc(labels.paymentStatus)}: ${esc(invoice.paymentStatusLabel)}</p>
    <p style="margin-top:28px">${esc(labels.thanks)}</p>
  </main>
</body>
</html>`;
}

export function downloadInvoiceFile(filename, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
