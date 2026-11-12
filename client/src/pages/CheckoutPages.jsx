import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { CartLines } from '../components/layout.jsx';
import { Button, Empty, Field, Notice, Spinner } from '../components/ui/primitives.jsx';
import { getAccessToken } from '../services/api.js';
import { catalogApi, orderApi } from '../services/resources.js';
import { applyCoupon, clearCoupon, fetchCart } from '../store/cartSlice.js';
import { apiError, dhaka, lx, money } from '../utils/format.js';

export function CartPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart.cart);
  const [zones, setZones] = useState([]);
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [quote, setQuote] = useState(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { catalogApi.zones().then((res) => setZones(res.data)); }, []);
  const districts = [...new Set(zones.map((zone) => zone.district))];
  const areas = zones.filter((zone) => zone.district === district && zone.area);
  useEffect(() => {
    if (!district || !cart) return;
    catalogApi.quote({ district, area, subtotal: Math.max(0, cart.subtotal - cart.discount) }).then((res) => setQuote(res.data)).catch(() => {});
  }, [district, area, cart.subtotal, cart.discount]);

  async function coupon(event) {
    event.preventDefault();
    try {
      await dispatch(applyCoupon(code)).unwrap();
      setMessage(t('cart.couponOk'));
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  if (!cart.items?.length) {
    return <div className="container-page py-16"><Empty title={t('cart.empty')} body={t('cart.emptyBody')} action={<Button asChild><Link to="/products">{t('cart.continue')}</Link></Button>} /></div>;
  }
  const total = (cart.total || 0) + (quote?.charge || 0);
  return (
    <div className="container-page grid gap-10 py-12 md:py-16 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="display text-5xl">{t('cart.title')}</h1>
        <CartLines cart={cart} />
      </div>
      <aside className="h-fit rounded-[1.6rem] bg-white p-6 shadow-soft">
        <h2 className="font-medium">{t('cart.estimate')}</h2>
        <label className="mt-3 block text-sm">{t('cart.district')}
          <select className="field mt-1" value={district} onChange={(event) => { setDistrict(event.target.value); setArea(''); }}>
            {districts.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-sm">{t('cart.area')}
          <select className="field mt-1" value={area} onChange={(event) => setArea(event.target.value)}>
            <option value="">{t('cart.other')}</option>
            {areas.map((zone) => <option key={zone.area} value={zone.area}>{zone.area}</option>)}
          </select>
        </label>
        <form onSubmit={coupon} className="mt-4 flex gap-2">
          <input className="field" placeholder={t('cart.coupon')} value={code} onChange={(event) => setCode(event.target.value)} />
          <Button type="submit" variant="outline">{t('common.apply')}</Button>
        </form>
        {cart.coupon?.code ? <button type="button" className="mt-2 text-xs underline" onClick={() => dispatch(clearCoupon())}>{cart.coupon.code} · {t('common.remove')}</button> : null}
        {message ? <p className="mt-2 text-xs">{message}</p> : null}
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(cart.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>{t('cart.discount')}</dt><dd>-{money(cart.discount)}</dd></div>
          <div className="flex justify-between"><dt>{t('cart.delivery')}</dt><dd>{money(quote?.charge || 0)}</dd></div>
          {quote?.freeDelivery ? <p className="text-xs text-kelp-700">{t('cart.free')}</p> : null}
          {quote?.eta ? <p className="text-xs text-ocean-900/60">{lx(quote.eta, i18n.language)}</p> : null}
          <div className="flex justify-between border-t border-ocean-900/10 pt-2 text-base font-medium"><dt>Total</dt><dd>{money(total)}</dd></div>
        </dl>
        <Button className="mt-4 w-full" asChild><Link to="/checkout">{t('cart.checkout')}</Link></Button>
      </aside>
    </div>
  );
}

const blank = { name: '', phone: '', email: '', addressLine: '', district: 'Dhaka', area: '', instructions: '', paymentMethod: 'cod' };

export function CheckoutPage() {
  const { t } = useTranslation();
  const cart = useSelector((state) => state.cart.cart);
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [zones, setZones] = useState([]);
  const [methods, setMethods] = useState([]);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  useEffect(() => {
    catalogApi.zones().then((res) => setZones(res.data));
    catalogApi.methods().then((res) => {
      setMethods(res.data);
      if (res.data[0]) setForm((current) => ({ ...current, paymentMethod: res.data[0].id }));
    });
  }, []);
  useEffect(() => {
    if (!user) return;
    setForm((current) => ({ ...current, name: user.name, phone: user.phone, email: user.email || '' }));
  }, [user]);
  useEffect(() => {
    catalogApi.quote({ district: form.district, area: form.area, subtotal: Math.max(0, (cart.subtotal || 0) - (cart.discount || 0)) })
      .then((res) => setQuote(res.data)).catch(() => {});
  }, [form.district, form.area, cart.subtotal, cart.discount]);

  const districts = [...new Set(zones.map((zone) => zone.district))];
  const areas = zones.filter((zone) => zone.district === form.district && zone.area);

  function useAddress(address) {
    setForm((current) => ({
      ...current,
      name: address.name || current.name,
      phone: address.phone || current.phone,
      addressLine: address.addressLine,
      district: address.district,
      area: address.area || '',
      instructions: address.instructions || '',
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await orderApi.create(form);
      if (res.data.payment.redirectUrl) {
        window.location.href = res.data.payment.redirectUrl;
        return;
      }
      navigate(`/order/${res.data.order.orderNumber}?token=${res.data.order.viewToken}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!cart.items?.length) return <div className="container-page py-16"><Empty title={t('checkout.empty')} body={t('cart.emptyBody')} action={<Button asChild><Link to="/products">{t('cart.continue')}</Link></Button>} /></div>;

  return (
    <form onSubmit={submit} className="container-page grid gap-10 py-12 md:py-16 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <h1 className="display text-5xl">{t('checkout.title')}</h1>
        {error ? <Notice>{error}</Notice> : null}
        {user?.addresses?.length ? (
          <div>
            <p className="text-sm font-medium">{t('checkout.saved')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.addresses.map((address) => (
                <button type="button" key={address._id} className="rounded-full border px-3 py-1.5 text-sm" onClick={() => useAddress(address)}>{address.label} · {address.area || address.district}</button>
              ))}
            </div>
          </div>
        ) : null}
        <section className="grid gap-3 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-display text-2xl">{t('checkout.contact')}</h2>
          <Field label={t('checkout.name')}><input className="field" required value={form.name} onChange={set('name')} /></Field>
          <Field label={t('checkout.phone')} hint={t('checkout.phoneHint')}><input className="field" required value={form.phone} onChange={set('phone')} /></Field>
          <Field label={t('checkout.email')} hint={t('checkout.emailHint')}><input className="field" type="email" value={form.email} onChange={set('email')} required={form.paymentMethod !== 'cod'} /></Field>
        </section>
        <section className="grid gap-3 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-display text-2xl">{t('checkout.address')}</h2>
          <Field label={t('checkout.line')}><input className="field sm:col-span-2" required value={form.addressLine} onChange={set('addressLine')} /></Field>
          <Field label={t('cart.district')}><select className="field" value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value, area: '' })}>{districts.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label={t('cart.area')}><select className="field" value={form.area} onChange={set('area')}><option value="">{t('cart.other')}</option>{areas.map((zone) => <option key={zone.area} value={zone.area}>{zone.area}</option>)}</select></Field>
          <Field label={t('checkout.notes')}><input className="field sm:col-span-2" value={form.instructions} onChange={set('instructions')} /></Field>
        </section>
        <section>
          <h2 className="font-display text-2xl">{t('checkout.pay')}</h2>
          {methods.length === 0 ? <p className="mt-2 text-sm">{t('checkout.none')}</p> : (
            <div className="mt-3 grid gap-2">
              {methods.map((method) => (
                <label key={method.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${form.paymentMethod === method.id ? 'border-ocean-800 bg-ocean-50' : 'border-ocean-900/10'}`}>
                  <input type="radio" name="pay" checked={form.paymentMethod === method.id} onChange={() => setForm({ ...form, paymentMethod: method.id })} />
                  <span><span className="font-medium">{t(`pay.${method.id}`)}</span>{method.id === 'cod' ? <span className="mt-1 block text-sm text-ocean-900/70">{t('checkout.cod')}</span> : null}</span>
                </label>
              ))}
            </div>
          )}
        </section>
        <Button type="submit" disabled={busy || methods.length === 0}>{t('checkout.place')}</Button>
      </div>
      <aside className="h-fit rounded-[1.6rem] bg-white p-6 text-sm shadow-soft">
        {cart.items.map((item) => <p key={item.id} className="flex justify-between py-1"><span>{lx(item.name, 'en')} × {item.quantity}</span><span>{money(item.lineTotal)}</span></p>)}
        <p className="mt-3 flex justify-between"><span>{t('cart.delivery')}</span><span>{money(quote?.charge || 0)}</span></p>
        <p className="flex justify-between"><span>{t('cart.discount')}</span><span>-{money(cart.discount)}</span></p>
        <p className="mt-2 flex justify-between border-t border-ocean-900/10 pt-2 text-base font-medium"><span>Total</span><span>{money((cart.total || 0) + (quote?.charge || 0))}</span></p>
      </aside>
    </form>
  );
}

export function OrderView({ order, onCancel }) {
  const { t, i18n } = useTranslation();
  if (!order) return null;
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{t('order.number')}</p>
        <h1 className="font-display text-4xl">{order.orderNumber}</h1>
        <p className="mt-2 text-sm text-ocean-900/70">{dhaka(order.createdAt, i18n.language)} · {t(`status.${order.status}`)} · {t(`pay.${order.paymentMethod}`)}</p>
      </div>
      <ol className="space-y-3 border-l border-ocean-900/15 pl-4">
        {order.statusHistory?.map((entry, index) => (
          <li key={`${entry.status}-${index}`}>
            <p className="font-medium">{t(`status.${entry.status}`)}</p>
            <p className="text-xs text-ocean-900/60">{dhaka(entry.at, i18n.language)} {entry.note ? `· ${entry.note}` : ''}</p>
          </li>
        ))}
      </ol>
      <div>
        <h2 className="font-display text-2xl">{t('order.items')}</h2>
        {order.items.map((item) => (
          <p key={item._id || item.variantLabel} className="mt-2 flex justify-between text-sm">
            <span>{lx(item.name, i18n.language)} · {item.variantLabel} × {item.quantity}</span>
            <span>{money(item.lineTotal)}</span>
          </p>
        ))}
        <p className="mt-3 flex justify-between text-sm"><span>{t('cart.delivery')}</span><span>{money(order.deliveryCharge)}</span></p>
        <p className="flex justify-between text-sm"><span>{t('cart.discount')}</span><span>-{money(order.discount)}</span></p>
        <p className="mt-1 flex justify-between font-medium"><span>Total</span><span>{money(order.total)}</span></p>
      </div>
      <p className="text-sm text-ocean-900/70">{order.shippingAddress?.addressLine}, {order.shippingAddress?.area} {order.shippingAddress?.district}</p>
      {onCancel && order.status === 'Pending' ? <Button variant="outline" onClick={onCancel}>{t('order.cancel')}</Button> : null}
      <p className="text-xs text-ocean-900/50">{t('order.live')}</p>
    </div>
  );
}

export function ConfirmationPage() {
  const { orderNumber } = useParams();
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const token = params.get('token');
  const payment = params.get('payment');
  useEffect(() => { dispatch(fetchCart()); }, [dispatch]);
  useEffect(() => {
    orderApi.byToken(orderNumber, token).then((res) => setOrder(res.data)).catch((err) => setError(apiError(err)));
  }, [orderNumber, token]);
  useEffect(() => {
    if (!order) return undefined;
    const socket = io(import.meta.env.VITE_API_URL || undefined, { auth: { token: getAccessToken() || '' } });
    socket.emit('order:watch', { orderId: order.id, phone: order.customer?.phone });
    socket.on('order:status', (payload) => setOrder((current) => ({ ...current, ...payload, id: current.id })));
    return () => socket.disconnect();
  }, [order?.id]);
  return (
    <div className="container-page max-w-3xl py-10">
      <p className="font-display text-3xl">{t('order.thanks')}</p>
      {payment === 'success' ? <Notice tone="ok">{t('order.paid')}</Notice> : null}
      {payment === 'failed' ? <Notice>{t('order.failed')}</Notice> : null}
      {payment === 'cancel' ? <Notice>{t('order.cancelPay')}</Notice> : null}
      {error ? <Notice>{error}</Notice> : order ? <div className="mt-6"><OrderView order={order} /></div> : <Spinner />}
    </div>
  );
}

export function TrackPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ orderNumber: '', phone: '' });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    try { setOrder((await orderApi.track(form)).data); }
    catch (err) { setOrder(null); setError(apiError(err)); }
  }
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="font-display text-4xl">{t('order.track')}</h1>
      <p className="mt-2 text-ocean-900/70">{t('order.trackBody')}</p>
      <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input className="field" placeholder={t('order.number')} value={form.orderNumber} onChange={(event) => setForm({ ...form, orderNumber: event.target.value })} required />
        <input className="field" placeholder={t('checkout.phone')} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
        <Button type="submit">{t('order.find')}</Button>
      </form>
      {error ? <div className="mt-4"><Notice>{error}</Notice></div> : null}
      {order ? <div className="mt-8"><OrderView order={order} /></div> : null}
    </div>
  );
}

export function ContentPages({ kind }) {
  const { t, i18n } = useTranslation();
  const [store, setStore] = useState(null);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState('');
  useEffect(() => {
    catalogApi.settings().then((res) => setStore(res.data));
    if (kind === 'delivery') catalogApi.zones().then((res) => setZones(res.data));
  }, [kind]);
  async function send(event) {
    event.preventDefault();
    try {
      await catalogApi.inquiry(form);
      setSent(t('contact.sent'));
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      setSent(apiError(error));
    }
  }
  if (kind === 'about') {
    return <article className="container-page max-w-3xl py-12"><h1 className="font-display text-4xl">{t('about.title')}</h1><p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-ocean-900/80">{lx(store?.about, i18n.language)}</p></article>;
  }
  if (kind === 'delivery') {
    return (
      <div className="container-page py-12">
        <h1 className="font-display text-4xl">{t('deliveryPage.title')}</h1>
        <p className="mt-2 max-w-2xl text-ocean-900/70">{t('deliveryPage.body')}</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="py-2">{t('cart.district')}</th><th>{t('cart.area')}</th><th>{t('admin.charge')}</th><th>{t('admin.eta')}</th></tr></thead>
            <tbody>{zones.map((zone) => <tr key={`${zone.district}-${zone.area}`} className="border-b border-ocean-900/10"><td className="py-2">{zone.district}</td><td>{zone.area || '—'}</td><td>{money(zone.charge)}</td><td>{lx(zone.eta, i18n.language)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div className="container-page grid gap-8 py-12 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl">{t('contact.title')}</h1>
        <p className="mt-3 text-ocean-900/75">{t('contact.body')}</p>
        <p className="mt-4 text-sm">{store?.phone}<br />{store?.email}<br />{lx(store?.address, i18n.language)}</p>
      </div>
      <form onSubmit={send} className="space-y-3">
        <Field label={t('checkout.name')}><input className="field" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label={t('checkout.email')}><input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label={t('checkout.phone')}><input className="field" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label={t('contact.message')}><textarea className="field" required rows="5" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></Field>
        <Button type="submit">{t('common.save') === 'Save' ? 'Send' : 'পাঠান'}</Button>
        {sent ? <Notice tone="ok">{sent}</Notice> : null}
      </form>
    </div>
  );
}
