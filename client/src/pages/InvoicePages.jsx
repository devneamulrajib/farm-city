import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { InvoiceSheet } from '../components/InvoiceSheet.jsx';
import { logoSrc } from '../components/Logo.jsx';
import { Button, Notice, Spinner } from '../components/ui/primitives.jsx';
import { adminApi, orderApi } from '../services/resources.js';
import { apiError, dhaka, lx, money } from '../utils/format.js';
import { downloadInvoiceFile, renderInvoiceHtml } from '../utils/invoiceFile.js';

function absoluteAsset(url) {
  if (!url) return `${window.location.origin}/logo.png`;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) {
    const api = import.meta.env.VITE_API_URL || '';
    return `${api || window.location.origin}${url}`;
  }
  return `${window.location.origin}${url}`;
}

function useInvoiceLabels() {
  const { t, i18n } = useTranslation();
  return { t, lang: i18n.language };
}

function InvoiceScreen({ invoice, error, backTo, backLabel }) {
  const { t, lang } = useInvoiceLabels();
  function download() {
    if (!invoice) return;
    const html = renderInvoiceHtml({
      lang,
      logoUrl: absoluteAsset(logoSrc(invoice.store?.logo)),
      labels: {
        title: t('invoice.title'),
        venture: t('venture'),
        issued: t('invoice.issued'),
        orderDate: t('invoice.orderDate'),
        orderNumber: t('order.number'),
        currency: t('invoice.currency'),
        billTo: t('invoice.billTo'),
        deliverTo: t('invoice.deliverTo'),
        item: t('invoice.item'),
        qty: t('invoice.qty'),
        price: t('invoice.price'),
        amount: t('invoice.amount'),
        sku: t('invoice.sku'),
        subtotal: t('invoice.subtotal'),
        delivery: t('invoice.delivery'),
        discount: t('invoice.discount'),
        total: t('invoice.total'),
        orderStatus: t('invoice.orderStatus'),
        payment: t('invoice.payment'),
        paymentStatus: t('invoice.paymentStatus'),
        thanks: t('invoice.thanks'),
      },
      invoice: {
        ...invoice,
        issuedLabel: dhaka(invoice.issuedAt, lang),
        orderedLabel: dhaka(invoice.orderCreatedAt, lang),
        statusLabel: t(`status.${invoice.status}`),
        paymentLabel: t(`pay.${invoice.paymentMethod}`),
        paymentStatusLabel: t(`payStatus.${invoice.paymentStatus}`),
        subtotalLabel: money(invoice.subtotal),
        deliveryLabel: money(invoice.deliveryCharge),
        discountLabel: money(invoice.discount),
        totalLabel: money(invoice.total),
        items: (invoice.items || []).map((item) => ({
          ...item,
          unitPriceLabel: money(item.unitPrice),
          lineTotalLabel: money(item.lineTotal),
          name: item.name,
        })),
        store: {
          ...invoice.store,
          address: { [lang]: lx(invoice.store?.address, lang) },
        },
      },
    });
    downloadInvoiceFile(`Farm-City-${invoice.invoiceNumber}.html`, html);
  }
  return (
    <div className="container-page py-8 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={backTo} className="text-sm text-ocean-800 underline">{backLabel}</Link>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()} disabled={!invoice}>{t('invoice.print')}</Button>
          <Button type="button" onClick={download} disabled={!invoice}>{t('invoice.download')}</Button>
        </div>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      {!error && !invoice ? <Spinner /> : null}
      {invoice ? <InvoiceSheet invoice={invoice} /> : null}
    </div>
  );
}

export function CustomerInvoicePage() {
  const { orderNumber } = useParams();
  const { t } = useTranslation();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    orderApi.invoice(orderNumber).then((res) => setInvoice(res.data)).catch((err) => setError(apiError(err)));
  }, [orderNumber]);
  return <InvoiceScreen invoice={invoice} error={error} backTo={`/account/orders/${orderNumber}`} backLabel={t('invoice.backOrder')} />;
}

export function AdminInvoicePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    adminApi.invoice(id).then((res) => setInvoice(res.data)).catch((err) => setError(apiError(err)));
  }, [id]);
  return <InvoiceScreen invoice={invoice} error={error} backTo={`/admin/orders/${id}`} backLabel={t('invoice.backOrder')} />;
}
