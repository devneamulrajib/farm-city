import { useTranslation } from 'react-i18next';
import { logoSrc } from './Logo.jsx';
import { dhaka, lx, money } from '../utils/format.js';

export function InvoiceSheet({ invoice }) {
  const { t, i18n } = useTranslation();
  if (!invoice) return null;
  const lang = i18n.language;
  const address = lx(invoice.store?.address, lang);
  return (
    <article className="mx-auto max-w-3xl bg-white p-6 text-ocean-950 shadow-soft print:max-w-none print:p-0 print:shadow-none sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <img src={logoSrc(invoice.store?.logo)} alt={invoice.store?.name || 'Farm City'} className="h-14 w-auto max-w-[10rem] object-contain" />
          <p className="mt-3 font-display text-3xl">{invoice.store?.name || t('brand')}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ocean-700">{t('venture')}</p>
          {address ? <p className="mt-3 max-w-xs text-sm text-ocean-900/70">{address}</p> : null}
          <p className="text-sm text-ocean-900/70">{invoice.store?.phone} {invoice.store?.email}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-ocean-700">{t('invoice.title')}</p>
          <h1 className="font-display text-4xl">{invoice.invoiceNumber}</h1>
          <p className="mt-2 text-sm">{t('invoice.issued')}: {dhaka(invoice.issuedAt, lang)}</p>
          <p className="text-sm">{t('invoice.orderDate')}: {dhaka(invoice.orderCreatedAt, lang)}</p>
          <p className="text-sm">{t('order.number')}: {invoice.orderNumber}</p>
          <p className="text-sm">{t('invoice.currency')}: BDT (৳)</p>
        </div>
      </header>
      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-ocean-700">{t('invoice.billTo')}</p>
          <p className="mt-1 font-medium">{invoice.customer?.name}</p>
          <p className="text-sm text-ocean-900/70">{invoice.customer?.phone}</p>
          {invoice.customer?.email ? <p className="text-sm text-ocean-900/70">{invoice.customer.email}</p> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-ocean-700">{t('invoice.deliverTo')}</p>
          <p className="mt-1 text-sm">{invoice.shippingAddress?.addressLine}</p>
          <p className="text-sm text-ocean-900/70">{invoice.shippingAddress?.area} {invoice.shippingAddress?.district}</p>
        </div>
      </section>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ocean-900/15 text-left text-xs uppercase tracking-wide text-ocean-900/50">
              <th className="py-2 font-medium">{t('invoice.item')}</th>
              <th className="py-2 text-right font-medium">{t('invoice.qty')}</th>
              <th className="py-2 text-right font-medium">{t('invoice.price')}</th>
              <th className="py-2 text-right font-medium">{t('invoice.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item) => (
              <tr key={item.id || `${item.sku}-${item.variantLabel}`} className="border-b border-ocean-900/10">
                <td className="py-3 pr-3">
                  <span className="font-medium">{lx(item.name, lang)}</span>
                  {item.variantLabel ? <span className="text-ocean-900/60"> · {item.variantLabel}</span> : null}
                  {item.sku ? <span className="block text-xs text-ocean-900/50">{t('invoice.sku')} {item.sku}</span> : null}
                </td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">{money(item.unitPrice)}</td>
                <td className="py-3 text-right">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt>{t('invoice.subtotal')}</dt><dd>{money(invoice.subtotal)}</dd></div>
        <div className="flex justify-between"><dt>{t('invoice.delivery')}</dt><dd>{money(invoice.deliveryCharge)}</dd></div>
        <div className="flex justify-between"><dt>{t('invoice.discount')}{invoice.couponCode ? ` (${invoice.couponCode})` : ''}</dt><dd>-{money(invoice.discount)}</dd></div>
        <div className="flex justify-between border-t border-ocean-900/15 pt-2 text-base font-medium"><dt>{t('invoice.total')}</dt><dd>{money(invoice.total)} BDT</dd></div>
      </dl>
      <p className="mt-6 text-sm text-ocean-900/70">
        {t('invoice.orderStatus')}: {t(`status.${invoice.status}`)}
        {' · '}
        {t('invoice.payment')}: {t(`pay.${invoice.paymentMethod}`)}
        {' · '}
        {t('invoice.paymentStatus')}: {t(`payStatus.${invoice.paymentStatus}`)}
      </p>
      <p className="mt-8 text-sm">{t('invoice.thanks')}</p>
    </article>
  );
}
