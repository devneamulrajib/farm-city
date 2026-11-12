import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { addToCart } from '../store/cartSlice.js';
import { setMiniCart } from '../store/uiSlice.js';
import { apiError, defaultCartPayload, discountPercent, lx, media } from '../utils/format.js';
import { PriceTag, StockBadge } from './layout.jsx';

export function ProductCard({ product }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const payload = defaultCartPayload(product);
  const off = discountPercent(product.basePrice, product.compareAtPrice);
  async function add() {
    if (!payload) return;
    setBusy(true);
    try {
      await dispatch(addToCart(payload)).unwrap();
      dispatch(setMiniCart(true));
      toast.success(t('product.added'));
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="card-lift flex h-full flex-col">
      <Link to={`/product/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-white">
        <img src={media(product.images?.[0]?.url)} alt={lx(product.name, i18n.language)} loading="lazy" width="640" height="800" className="h-full w-full object-cover transition duration-700 hover:scale-[1.04]" />
        {off > 0 ? <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] tracking-wide text-ocean-950">-{off}%</span> : null}
      </Link>
      <div className="flex flex-1 flex-col px-1 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-kelp-700">{lx(product.category?.name, i18n.language)}</p>
          <StockBadge availability={product.availability} t={t} />
        </div>
        <Link to={`/product/${product.slug}`} className="mt-2 font-display text-[1.35rem] leading-tight text-ocean-950">{lx(product.name, i18n.language)}</Link>
        <div className="mt-2"><PriceTag price={product.basePrice} compare={product.compareAtPrice} unit={product.unit} t={t} /></div>
        {product.variants?.length ? <p className="mt-1 text-xs text-ocean-900/45">{product.variants.map((variant) => variant.label).join(' · ')}</p> : null}
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={add} disabled={!payload || busy} className="inline-flex h-10 items-center rounded-full bg-ocean-950 px-4 text-sm text-white transition hover:bg-ocean-800 disabled:opacity-40">{t('common.add')}</button>
          <Link to={`/product/${product.slug}`} className="text-sm text-ocean-800 underline-offset-4 hover:underline">{t('common.details')}</Link>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}
