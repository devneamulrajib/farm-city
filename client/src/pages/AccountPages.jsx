import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { Button, Field, Notice } from '../components/ui/primitives.jsx';
import { OrderView } from './CheckoutPages.jsx';
import { getAccessToken } from '../services/api.js';
import { authApi, orderApi } from '../services/resources.js';
import { login, logout, register, setUser } from '../store/authSlice.js';
import { mergeCart } from '../store/cartSlice.js';
import { apiError, dhaka, money } from '../utils/format.js';

function nextPath(params) {
  const next = params.get('next');
  return next && next.startsWith('/') ? next : '/';
}

export function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    try {
      await dispatch(login(form)).unwrap();
      await dispatch(mergeCart());
      navigate(nextPath(params));
    } catch (err) {
      setError(apiError(err));
    }
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 px-4 py-16">
      <h1 className="font-display text-4xl">{t('auth.loginTitle')}</h1>
      {error ? <Notice>{error}</Notice> : null}
      <Field label={t('auth.identifier')}><input className="field" required value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} /></Field>
      <Field label={t('auth.password')}><input className="field" type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
      <Button type="submit" className="w-full">{t('nav.login')}</Button>
      <p className="text-sm">{t('auth.need')} <Link className="underline" to="/register">{t('nav.register')}</Link></p>
    </form>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  async function submit(event) {
    event.preventDefault();
    try {
      await dispatch(register(form)).unwrap();
      await dispatch(mergeCart());
      navigate('/');
    } catch (err) {
      setError(apiError(err));
    }
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 px-4 py-16">
      <h1 className="font-display text-4xl">{t('auth.registerTitle')}</h1>
      {error ? <Notice>{error}</Notice> : null}
      <Field label={t('checkout.name')}><input className="field" required value={form.name} onChange={set('name')} /></Field>
      <Field label={t('checkout.email')}><input className="field" type="email" required value={form.email} onChange={set('email')} /></Field>
      <Field label={t('checkout.phone')} hint={t('checkout.phoneHint')}><input className="field" required value={form.phone} onChange={set('phone')} /></Field>
      <Field label={t('auth.password')} hint={t('auth.passwordHint')}><input className="field" type="password" required value={form.password} onChange={set('password')} /></Field>
      <Button type="submit" className="w-full">{t('nav.register')}</Button>
      <p className="text-sm">{t('auth.have')} <Link className="underline" to="/login">{t('nav.login')}</Link></p>
    </form>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  async function save(event) {
    event.preventDefault();
    try {
      const res = await authApi.updateProfile(form);
      dispatch(setUser(res.data));
      toast.success(t('account.saved'));
    } catch (error) { toast.error(apiError(error)); }
  }
  async function changePassword(event) {
    event.preventDefault();
    try {
      await authApi.updatePassword(password);
      toast.success(t('account.saved'));
      dispatch(logout());
    } catch (error) { toast.error(apiError(error)); }
  }
  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3">
        <h1 className="font-display text-4xl">{t('account.profile')}</h1>
        <Field label={t('checkout.name')}><input className="field" value={form.name} onChange={set('name')} required /></Field>
        <Field label={t('checkout.email')}><input className="field" type="email" value={form.email} onChange={set('email')} required /></Field>
        <Field label={t('checkout.phone')}><input className="field" value={form.phone} onChange={set('phone')} required /></Field>
        <Button type="submit">{t('common.save')}</Button>
      </form>
      <form onSubmit={changePassword} className="space-y-3">
        <h2 className="font-display text-2xl">{t('account.password')}</h2>
        <Field label={t('auth.current')}><input className="field" type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} required /></Field>
        <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')}><input className="field" type="password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} required /></Field>
        <Button type="submit" variant="outline">{t('common.save')}</Button>
      </form>
    </div>
  );
}

export function AddressesPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const blank = { label: 'Home', name: user?.name || '', phone: user?.phone || '', addressLine: '', district: 'Dhaka', area: '', instructions: '', isDefault: false };
  const [form, setForm] = useState(blank);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  async function save(event) {
    event.preventDefault();
    try {
      const res = await authApi.addAddress(form);
      dispatch(setUser({ ...user, addresses: res.data }));
      setForm(blank);
      toast.success(t('account.saved'));
    } catch (error) { toast.error(apiError(error)); }
  }
  async function remove(id) {
    const res = await authApi.deleteAddress(id);
    dispatch(setUser({ ...user, addresses: res.data }));
  }
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl">{t('account.addresses')}</h1>
        <div className="mt-4 space-y-3">
          {(user?.addresses || []).map((address) => (
            <article key={address._id} className="rounded-2xl border border-ocean-900/10 p-4">
              <p className="font-medium">{address.label} {address.isDefault ? `· ${t('account.default')}` : ''}</p>
              <p className="text-sm text-ocean-900/70">{address.addressLine}, {address.area} {address.district}</p>
              <button type="button" className="mt-2 text-sm text-red-700" onClick={() => remove(address._id)}>{t('common.delete')}</button>
            </article>
          ))}
        </div>
      </div>
      <form onSubmit={save} className="space-y-3">
        <h2 className="font-display text-2xl">{t('account.addAddress')}</h2>
        <Field label={t('account.label')}><input className="field" value={form.label} onChange={set('label')} /></Field>
        <Field label={t('checkout.line')}><input className="field" required value={form.addressLine} onChange={set('addressLine')} /></Field>
        <Field label={t('cart.district')}><input className="field" required value={form.district} onChange={set('district')} /></Field>
        <Field label={t('cart.area')}><input className="field" value={form.area} onChange={set('area')} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} />{t('account.default')}</label>
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </div>
  );
}

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState(null);
  useEffect(() => { orderApi.mine().then((res) => setOrders(res.data)); }, []);
  if (!orders) return null;
  return (
    <div className="container-page py-10">
      <h1 className="font-display text-4xl">{t('account.orders')}</h1>
      {orders.length === 0 ? <p className="mt-4">{t('account.noOrders')}</p> : (
        <div className="mt-6 divide-y divide-ocean-900/10">
          {orders.map((order) => (
            <Link key={order.orderNumber} to={`/account/orders/${order.orderNumber}`} className="flex items-center justify-between py-4">
              <span><span className="font-medium">{order.orderNumber}</span><span className="block text-sm text-ocean-900/60">{dhaka(order.createdAt, i18n.language)}</span></span>
              <span className="text-right"><span className="block">{money(order.total)}</span><span className="text-sm text-ocean-900/60">{t(`status.${order.status}`)}{order.invoice ? ` · ${t('invoice.view')}` : ''}</span></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountOrderPage() {
  const { orderNumber } = useParams();
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { orderApi.mineOne(orderNumber).then((res) => setOrder(res.data)).catch((err) => setError(apiError(err))); }, [orderNumber]);
  const orderId = order?.id;
  const orderPhone = order?.customer?.phone;
  useEffect(() => {
    if (!orderId) return undefined;
    const socket = io(import.meta.env.VITE_API_URL || undefined, { auth: { token: getAccessToken() || '' } });
    socket.emit('order:watch', { orderId, phone: orderPhone });
    socket.on('order:status', (payload) => setOrder((current) => ({ ...current, ...payload, id: current.id })));
    return () => socket.disconnect();
  }, [orderId, orderPhone]);
  async function cancel() {
    try {
      const res = await orderApi.cancel(orderNumber, t('order.cancelled'));
      setOrder(res.data);
    } catch (err) { toast.error(apiError(err)); }
  }
  return <div className="container-page max-w-3xl py-10">{error ? <Notice>{error}</Notice> : <OrderView order={order} onCancel={cancel} invoiceHref={order?.invoice ? `/account/orders/${order.orderNumber}/invoice` : ''} />}</div>;
}
