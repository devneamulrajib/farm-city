import { SlidersHorizontal, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ProductGrid } from '../components/ProductCard.jsx';
import { Button, Empty, Notice, Spinner } from '../components/ui/primitives.jsx';
import { catalogApi } from '../services/resources.js';
import { addToCart } from '../store/cartSlice.js';
import { apiError, discountPercent, lx, media, money, roundQty } from '../utils/format.js';

export function ProductListPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const category = categories.find((item) => item.slug === slug);
  const page = Number(params.get('page') || 1);

  useEffect(() => { catalogApi.categories().then((res) => setCategories(res.data.flat || [])); }, []);
  useEffect(() => {
    const query = Object.fromEntries(params.entries());
    if (slug) query.category = slug;
    setError('');
    catalogApi.products(query).then((res) => setResult(res)).catch((err) => setError(apiError(err)));
  }, [params, slug]);

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key); else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  const title = category ? lx(category.name, i18n.language) : (params.get('q') ? `“${params.get('q')}”` : t('list.title'));
  const schema = category?.attributeSchema?.filter((field) => field.filterable) || [];

  return (
    <div className="container-page py-12 md:py-16">
      <p className="text-sm text-ocean-900/60"><Link to="/">{t('brand')}</Link> / {title}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <h1 className="display text-5xl">{title}</h1>
        <button type="button" className="rounded-full border px-3 py-2 text-sm lg:hidden" onClick={() => setOpen((value) => !value)}><SlidersHorizontal className="mr-1 inline h-4 w-4" />{t('list.filters')}</button>
      </div>
      {category?.description ? <p className="mt-2 max-w-2xl text-ocean-900/70">{lx(category.description, i18n.language)}</p> : null}
      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className={`${open ? 'block' : 'hidden'} h-fit space-y-5 rounded-[1.5rem] bg-white p-5 shadow-soft lg:block`}>
          <label className="block text-sm">{t('list.sort')}
            <select className="field mt-1" value={params.get('sort') || 'popular'} onChange={(event) => setFilter('sort', event.target.value)}>
              <option value="popular">{t('list.popular')}</option>
              <option value="newest">{t('list.newest')}</option>
              <option value="price_asc">{t('list.priceAsc')}</option>
              <option value="price_desc">{t('list.priceDesc')}</option>
            </select>
          </label>
          <div>
            <p className="text-sm font-medium">{t('list.price')}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input className="field" inputMode="numeric" placeholder={t('list.min')} defaultValue={params.get('minPrice') || ''} onBlur={(event) => setFilter('minPrice', event.target.value)} />
              <input className="field" inputMode="numeric" placeholder={t('list.max')} defaultValue={params.get('maxPrice') || ''} onBlur={(event) => setFilter('maxPrice', event.target.value)} />
            </div>
          </div>
          <label className="block text-sm">{t('list.availability')}
            <select className="field mt-1" value={params.get('availability') || ''} onChange={(event) => setFilter('availability', event.target.value)}>
              <option value="">{t('list.any')}</option>
              <option value="in_stock">{t('common.inStock')}</option>
              <option value="low_stock">{t('common.lowStock')}</option>
              <option value="out_of_stock">{t('common.out')}</option>
            </select>
          </label>
          {schema.map((field) => (
            <label key={field.key} className="block text-sm">{lx(field.label, i18n.language)}
              <select className="field mt-1" value={params.get(`attr_${field.key}`) || ''} onChange={(event) => setFilter(`attr_${field.key}`, event.target.value)}>
                <option value="">{t('list.any')}</option>
                {field.options.map((option) => <option key={option.value} value={option.value}>{lx(option.label, i18n.language)}</option>)}
              </select>
            </label>
          ))}
        </aside>
        <div>
          {error ? <Notice>{error}</Notice> : null}
          {!result ? <Spinner /> : result.data.length === 0 ? <Empty title={t('list.empty')} body={t('home.fallbackBody')} action={<Button asChild><Link to="/products">{t('common.all')}</Link></Button>} /> : (
            <>
              <p className="mb-4 text-sm text-ocean-900/60">{t('list.results', { count: result.meta.total })}</p>
              <ProductGrid products={result.data} />
              <div className="mt-8 flex justify-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>{t('common.prev')}</Button>
                <span className="grid place-items-center px-3 text-sm">{page} / {result.meta.pages || 1}</span>
                <Button variant="outline" disabled={page >= result.meta.pages} onClick={() => setFilter('page', String(page + 1))}>{t('common.next')}</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductDetailPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [image, setImage] = useState(0);
  const [mode, setMode] = useState('variant');
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState(1);
  const [review, setReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    setError('');
    catalogApi.product(slug).then((res) => {
      setData(res.data);
      const product = res.data.product;
      const variant = product.variants?.find((item) => item.isDefault) || product.variants?.[0];
      if (variant) { setMode('variant'); setVariantId(variant.id); setQty(1); }
      else { setMode('custom'); setQty(product.minQuantity || 1); }
      setImage(0);
    }).catch((err) => setError(apiError(err)));
    catalogApi.reviews(slug).then((res) => setReviews(res.data)).catch(() => {});
  }, [slug]);

  const product = data?.product;
  const variant = product?.variants?.find((item) => item.id === variantId);
  const unitPrice = mode === 'variant' ? variant?.price : product?.basePrice;
  const compare = mode === 'variant' ? variant?.compareAtPrice : product?.compareAtPrice;
  const line = mode === 'variant' ? (unitPrice || 0) * qty : (unitPrice || 0) * qty;
  const optionLabel = useMemo(() => {
    if (!product?.category?.attributeSchema) return new Map();
    return new Map(product.category.attributeSchema.flatMap((field) => (field.options || []).map((option) => [`${field.key}:${option.value}`, option])));
  }, [product]);

  async function add(buyNow) {
    try {
      await dispatch(addToCart({
        productId: product.id,
        mode,
        variantId: mode === 'variant' ? variantId : null,
        quantity: qty,
      })).unwrap();
      if (buyNow) navigate('/checkout');
      else toast.success(t('product.added'));
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function sendReview(event) {
    event.preventDefault();
    try {
      await catalogApi.addReview({ productId: product.id, ...review });
      const res = await catalogApi.reviews(slug);
      setReviews(res.data);
      toast.success(t('product.submitReview'));
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (error) return <div className="container-page py-16"><Notice>{error}</Notice></div>;
  if (!product) return <div className="py-24"><Spinner /></div>;
  const lang = i18n.language;
  const step = product.quantityStep || (product.unit === 'piece' ? 1 : 0.5);

  return (
    <div className="container-page py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <img src={media(product.images?.[image]?.url)} alt={lx(product.name, lang)} className="aspect-[4/5] w-full rounded-[1.75rem] object-cover shadow-soft" />
          <div className="mt-3 flex gap-2">
            {product.images?.map((item, index) => (
              <button type="button" key={item.url} onClick={() => setImage(index)} className={`h-16 w-16 overflow-hidden rounded-xl ring-2 ${image === index ? 'ring-ocean-800' : 'ring-transparent'}`}>
                <img src={media(item.url)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-kelp-700">{lx(product.category?.name, lang)}</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">{lx(product.name, lang)}</h1>
          <p className="mt-3 text-ocean-900/75">{lx(product.description, lang)}</p>
          <div className="mt-4 flex items-end gap-3">
            <p className="font-display text-3xl">{money(line)}</p>
            {compare > unitPrice ? <p className="text-ocean-900/40 line-through">{money(mode === 'variant' ? compare * qty : compare * qty)}</p> : null}
            {discountPercent(unitPrice, compare) > 0 ? <span className="rounded-full bg-kelp-50 px-2 py-1 text-xs text-kelp-700">-{discountPercent(unitPrice, compare)}%</span> : null}
          </div>
          <p className="mt-1 text-sm text-ocean-900/60">{money(product.basePrice)} {t('common.per')} {t(`units.${product.unit}`)}</p>
          {product.variants?.length ? (
            <div className="mt-6">
              <p className="text-sm font-medium">{t('product.weight')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((item) => (
                  <button type="button" key={item.id} disabled={item.stock <= 0} onClick={() => { setMode('variant'); setVariantId(item.id); setQty(1); }} className={`rounded-full border px-4 py-2 text-sm disabled:opacity-40 ${mode === 'variant' && variantId === item.id ? 'border-ocean-800 bg-ocean-900 text-white' : 'border-ocean-900/15'}`}>
                    {item.label} · {money(item.price)}
                  </button>
                ))}
                {product.allowCustomQuantity ? (
                  <button type="button" onClick={() => { setMode('custom'); setQty(product.minQuantity); }} className={`rounded-full border px-4 py-2 text-sm ${mode === 'custom' ? 'border-ocean-800 bg-ocean-900 text-white' : 'border-ocean-900/15'}`}>{t('product.custom')}</button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="mt-5 flex items-center gap-3">
            <label className="text-sm">{t('common.cart')}
              <input className="field mt-1 w-28" type="number" min={mode === 'variant' ? 1 : product.minQuantity} max={mode === 'variant' ? (variant?.stock || 1) : product.maxQuantity} step={mode === 'variant' ? 1 : step} value={qty} onChange={(event) => setQty(roundQty(event.target.value))} />
            </label>
            <p className="text-sm text-ocean-900/60">{t('product.available')}: {mode === 'variant' ? variant?.stock : product.stock} {mode === 'variant' ? '' : t(`units.${product.unit}`)}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => add(false)} disabled={product.availability === 'out_of_stock'}>{t('common.add')}</Button>
            <Button variant="outline" onClick={() => add(true)} disabled={product.availability === 'out_of_stock'}>{t('common.buy')}</Button>
          </div>
          <div className="mt-8">
            <h2 className="font-display text-2xl">{t('product.specs')}</h2>
            <dl className="mt-3 divide-y divide-ocean-900/10">
              {(product.category?.attributeSchema || []).map((field) => {
                const value = product.attributes?.[field.key];
                if (value === undefined || value === '') return null;
                const option = optionLabel.get(`${field.key}:${value}`);
                const shown = option ? lx(option.label, lang) : Array.isArray(value) ? value.join(', ') : String(value);
                return <div key={field.key} className="grid grid-cols-2 py-2 text-sm"><dt className="text-ocean-900/60">{lx(field.label, lang)}</dt><dd>{shown}{field.unit ? ` ${field.unit}` : ''}</dd></div>;
              })}
            </dl>
          </div>
        </div>
      </div>
      <section className="mt-14">
        <h2 className="font-display text-3xl">{t('product.reviews')}</h2>
        <p className="mt-1 text-sm text-ocean-900/60"><Star className="mr-1 inline h-4 w-4" />{product.ratingAvg || 0} · {product.ratingCount || 0}</p>
        {user ? (
          <form onSubmit={sendReview} className="mt-4 max-w-lg space-y-3 rounded-3xl bg-sand p-4">
            <p className="font-medium">{t('product.yourReview')}</p>
            <select className="field" value={review.rating} onChange={(event) => setReview({ ...review, rating: Number(event.target.value) })}>
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
            </select>
            <textarea className="field" rows="3" placeholder={t('product.comment')} value={review.comment} onChange={(event) => setReview({ ...review, comment: event.target.value })} />
            <Button type="submit">{t('product.submitReview')}</Button>
          </form>
        ) : <p className="mt-3 text-sm"><Link to="/login" className="underline">{t('nav.login')}</Link></p>}
        <div className="mt-4 grid gap-3">
          {reviews.length === 0 ? <p className="text-sm text-ocean-900/60">{t('product.noReviews')}</p> : reviews.map((item) => (
            <article key={item.id} className="rounded-2xl border border-ocean-900/10 p-4">
              <p className="text-sm font-medium">{item.author} · {item.rating}/5</p>
              <p className="mt-1 text-sm">{item.comment}</p>
            </article>
          ))}
        </div>
      </section>
      {data.related?.length ? <section className="mt-14"><h2 className="mb-5 font-display text-3xl">{t('product.related')}</h2><ProductGrid products={data.related} /></section> : null}
    </div>
  );
}
