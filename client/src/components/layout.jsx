import { Globe, Menu, Minus, Plus, Search, ShoppingBag, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { catalogApi } from '../services/resources.js';
import { logout } from '../store/authSlice.js';
import { fetchCart, removeFromCart, updateCartQty } from '../store/cartSlice.js';
import { setLocale, setMiniCart, setMobileNav } from '../store/uiSlice.js';
import { lx, media, money, roundQty } from '../utils/format.js';
import { CategoryIcon } from './CategoryIcon.jsx';
import { LiveNotificationsProvider, NotificationBell } from './LiveNotifications.jsx';
import { Logo, logoSrc } from './Logo.jsx';
import { Badge, Button, Menu as AccountMenu, MenuItem, Sheet } from './ui/primitives.jsx';

export function Announcement({ settings, compact }) {
  const { i18n } = useTranslation();
  const bar = settings?.announcement;
  if (!bar?.enabled || compact) return null;
  const text = lx(bar.text, i18n.language);
  if (!text) return null;
  const inner = <span className="tracking-[0.08em]">{text}</span>;
  return (
    <div className="bg-ocean-950 text-center text-[12px] text-sand/90">
      <div className="container-page py-2.5">
        {bar.link ? <Link to={bar.link} className="underline-offset-4 hover:underline">{inner}</Link> : inner}
      </div>
    </div>
  );
}

function childrenOf(categories, id) {
  return categories.filter((category) => category.parent && String(category.parent) === String(id));
}

export function Header({ categories = [], settings = null }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const cart = useSelector((state) => state.cart.cart);
  const mini = useSelector((state) => state.ui.miniCart);
  const mobile = useSelector((state) => state.ui.mobileNav);
  const [q, setQ] = useState('');
  const [compact, setCompact] = useState(false);
  const count = cart.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
  const roots = categories.filter((category) => !category.parent);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function search(event) {
    event.preventDefault();
    navigate(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
    dispatch(setMobileNav(false));
  }

  function switchLang() {
    const next = i18n.language === 'bn' ? 'en' : 'bn';
    i18n.changeLanguage(next);
    dispatch(setLocale(next));
    document.documentElement.lang = next === 'bn' ? 'bn' : 'en';
  }

  return (
    <div className={`sticky top-0 z-40 transition-shadow print:hidden ${compact ? 'shadow-soft' : ''}`}>
      <Announcement settings={settings} compact={compact} />
      <header className="border-b border-ocean-950/5 bg-white/85 backdrop-blur-md">
        <div className={`container-page flex items-center gap-4 transition-all ${compact ? 'h-16' : 'h-[4.75rem]'}`}>
          <button type="button" className="rounded-full p-2 text-ocean-950 lg:hidden" aria-label={t('common.menu')} onClick={() => dispatch(setMobileNav(true))}>
            <Menu className="h-5 w-5" />
          </button>
          <Logo compact={compact} logo={settings?.logo} />
          <form onSubmit={search} className="mx-auto hidden max-w-xl flex-1 lg:block">
            <label className="relative block">
              <span className="sr-only">{t('common.search')}</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-700" />
              <input className="field h-11 rounded-full bg-[#f6f3ee] pl-11" placeholder={t('common.search')} value={q} onChange={(event) => setQ(event.target.value)} />
            </label>
          </form>
          <div className="ml-auto flex items-center gap-1 text-ocean-950">
            <button type="button" className="rounded-full px-3 py-2 text-xs font-medium tracking-[0.14em] hover:bg-[#f6f3ee]" onClick={switchLang} aria-label={t('common.language')}>
              <Globe className="mr-1 inline h-4 w-4" />{i18n.language === 'bn' ? 'EN' : 'বাং'}
            </button>
            {user ? <NotificationBell /> : null}
            <AccountMenu trigger={<button type="button" className="rounded-full p-2.5 hover:bg-[#f6f3ee]" aria-label={t('common.account')}><User className="h-[18px] w-[18px]" /></button>}>
              {user ? (
                <>
                  <div className="px-3 py-2 text-xs text-ocean-900/60">{user.name}</div>
                  <MenuItem onSelect={() => navigate('/account')}>{t('nav.profile')}</MenuItem>
                  <MenuItem onSelect={() => navigate('/account/orders')}>{t('nav.orders')}</MenuItem>
                  <MenuItem onSelect={() => navigate('/account/notifications')}>{t('nav.notifications')}</MenuItem>
                  <MenuItem onSelect={() => navigate('/account/addresses')}>{t('nav.addresses')}</MenuItem>
                  {user.role === 'admin' ? <MenuItem onSelect={() => navigate('/admin')}>{t('nav.admin')}</MenuItem> : null}
                  <MenuItem onSelect={() => dispatch(logout()).then(() => dispatch(fetchCart()))}>{t('nav.logout')}</MenuItem>
                </>
              ) : (
                <>
                  <MenuItem onSelect={() => navigate('/login')}>{t('nav.login')}</MenuItem>
                  <MenuItem onSelect={() => navigate('/register')}>{t('nav.register')}</MenuItem>
                </>
              )}
            </AccountMenu>
            <button type="button" className="relative rounded-full p-2.5 hover:bg-[#f6f3ee]" aria-label={t('common.cart')} onClick={() => dispatch(setMiniCart(true))}>
              <ShoppingBag className="h-[18px] w-[18px]" />
              {count > 0 ? <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-kelp-700 px-1 text-[10px] font-medium text-white">{Math.round(count)}</span> : null}
            </button>
          </div>
        </div>
        <nav className="container-page hidden items-center gap-1 pb-3 lg:flex" aria-label="Categories">
          <NavLink to="/products" className={({ isActive }) => `rounded-full px-3 py-1.5 text-sm ${isActive ? 'bg-ocean-950 text-white' : 'text-ocean-900 hover:bg-[#f6f3ee]'}`}>{t('common.all')}</NavLink>
          {roots.map((category) => {
            const kids = childrenOf(categories, category._id);
            return (
              <div key={category._id} className="group relative">
                <NavLink to={`/category/${category.slug}`} className={({ isActive }) => `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm ${isActive ? 'bg-ocean-950 text-white' : 'text-ocean-900 hover:bg-[#f6f3ee]'}`}>
                  <CategoryIcon category={category} className="h-6 w-6" />
                  {lx(category.name, i18n.language)}
                </NavLink>
                {kids.length ? (
                  <div className="invisible absolute left-0 top-full z-30 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <div className="min-w-56 rounded-2xl bg-white p-2 shadow-card ring-1 ring-ocean-950/5">
                      {kids.map((child) => (
                        <Link key={child._id} to={`/category/${child.slug}`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ocean-900 hover:bg-[#f6f3ee]">
                          <CategoryIcon category={child} className="h-6 w-6" />
                          {lx(child.name, i18n.language)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </header>
      <Sheet open={mobile} onOpenChange={(open) => dispatch(setMobileNav(open))} title={t('common.menu')} side="left">
        <form onSubmit={search} className="border-b border-ocean-950/10 p-5">
          <input className="field" placeholder={t('common.search')} value={q} onChange={(event) => setQ(event.target.value)} />
        </form>
        <div className="flex flex-col p-3">
          <Link className="rounded-2xl px-4 py-3 text-lg hover:bg-[#f6f3ee]" to="/products" onClick={() => dispatch(setMobileNav(false))}>{t('common.all')}</Link>
          {roots.map((category) => (
            <div key={category._id}>
              <Link className="flex items-center gap-3 rounded-2xl px-4 py-3 text-lg hover:bg-[#f6f3ee]" to={`/category/${category.slug}`} onClick={() => dispatch(setMobileNav(false))}>
                <CategoryIcon category={category} className="h-10 w-10" />
                {lx(category.name, i18n.language)}
              </Link>
              {childrenOf(categories, category._id).map((child) => (
                <Link key={child._id} className="flex items-center gap-2 rounded-2xl py-2 pl-8 pr-4 text-sm text-ocean-800 hover:bg-[#f6f3ee]" to={`/category/${child.slug}`} onClick={() => dispatch(setMobileNav(false))}>
                  <CategoryIcon category={child} className="h-7 w-7" />
                  {lx(child.name, i18n.language)}
                </Link>
              ))}
            </div>
          ))}
          <div className="mt-4 border-t border-ocean-950/10 pt-3">
            <Link className="block rounded-2xl px-4 py-3 hover:bg-[#f6f3ee]" to="/track" onClick={() => dispatch(setMobileNav(false))}>{t('nav.track')}</Link>
            {user ? <Link className="block rounded-2xl px-4 py-3 hover:bg-[#f6f3ee]" to="/account/notifications" onClick={() => dispatch(setMobileNav(false))}>{t('nav.notifications')}</Link> : null}
            <Link className="block rounded-2xl px-4 py-3 hover:bg-[#f6f3ee]" to={user ? '/account' : '/login'} onClick={() => dispatch(setMobileNav(false))}>{user ? t('nav.profile') : t('nav.login')}</Link>
          </div>
        </div>
      </Sheet>
      <Sheet open={mini} onOpenChange={(open) => dispatch(setMiniCart(open))} title={t('cart.title')}>
        <CartLines cart={cart} />
        <div className="border-t border-ocean-950/10 p-5">
          <div className="mb-4 flex justify-between text-sm"><span>{t('cart.subtotal')}</span><strong>{money(cart.subtotal)}</strong></div>
          <div className="grid gap-2">
            <Button onClick={() => { dispatch(setMiniCart(false)); navigate('/cart'); }} variant="outline">{t('cart.title')}</Button>
            <Button onClick={() => { dispatch(setMiniCart(false)); navigate('/checkout'); }}>{t('cart.checkout')}</Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

export function CartLines({ cart }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  if (!cart.items?.length) return <p className="p-8 text-sm text-ocean-900/70">{t('cart.empty')}</p>;
  return (
    <ul className="divide-y divide-ocean-950/10">
      {cart.items.map((item) => (
        <li key={item.id} className="flex gap-4 p-5">
          {item.image ? <img src={media(item.image)} alt="" className="h-20 w-16 rounded-2xl object-cover" /> : <div className="h-20 w-16 rounded-2xl bg-[#f6f3ee]" />}
          <div className="min-w-0 flex-1">
            <Link to={`/product/${item.slug}`} className="font-display text-lg leading-tight">{lx(item.name, i18n.language)}</Link>
            <p className="mt-1 text-xs tracking-wide text-ocean-900/55">{item.variantLabel}</p>
            {item.issues?.length ? <p className="text-xs text-red-700">{item.issues[0]}</p> : <p className="mt-1 text-sm">{money(item.lineTotal)}</p>}
            <div className="mt-3 flex items-center gap-2">
              <button type="button" aria-label="Decrease" className="grid h-8 w-8 place-items-center rounded-full border border-ocean-950/15" onClick={() => dispatch(updateCartQty({ id: item.id, quantity: roundQty(Math.max(0.5, item.quantity - (item.mode === 'variant' ? 1 : 0.5))) }))}><Minus className="h-3 w-3" /></button>
              <span className="min-w-6 text-center text-sm">{item.quantity}</span>
              <button type="button" aria-label="Increase" className="grid h-8 w-8 place-items-center rounded-full border border-ocean-950/15" onClick={() => dispatch(updateCartQty({ id: item.id, quantity: roundQty(item.quantity + (item.mode === 'variant' ? 1 : 0.5)) }))}><Plus className="h-3 w-3" /></button>
              <button type="button" className="ml-auto text-ocean-900/50" aria-label={t('common.remove')} onClick={() => dispatch(removeFromCart(item.id))}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Footer({ settings, categories }) {
  const { t, i18n } = useTranslation();
  return (
    <footer className="mt-8 bg-ocean-950 text-sand print:hidden">
      <div className="container-page grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <img src={logoSrc(settings?.logo)} alt="" className="h-12 w-auto max-w-[13rem] object-contain" />
          <p className="mt-4 font-display text-4xl tracking-tight">Farm City</p>
          <p className="mt-4 max-w-xs text-sm font-light leading-relaxed text-sand/75">{lx(settings?.tagline, i18n.language) || t('tagline')}</p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-sand/45">{t('venture')}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-sand/50">{t('footer.shop')}</p>
          <div className="mt-4 grid gap-2.5 text-sm text-sand/85">
            <Link to="/products" className="hover:text-white">{t('common.all')}</Link>
            {categories?.filter((category) => category.isFeatured && !category.parent).map((category) => (
              <Link key={category._id} to={`/category/${category.slug}`} className="hover:text-white">{lx(category.name, i18n.language)}</Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-sand/50">{t('footer.help')}</p>
          <div className="mt-4 grid gap-2.5 text-sm text-sand/85">
            <Link to="/track" className="hover:text-white">{t('nav.track')}</Link>
            <Link to="/delivery" className="hover:text-white">{t('nav.delivery')}</Link>
            <Link to="/about" className="hover:text-white">{t('nav.about')}</Link>
            <Link to="/contact" className="hover:text-white">{t('nav.contact')}</Link>
          </div>
        </div>
        <div className="text-sm font-light leading-relaxed text-sand/80">
          <p className="text-[11px] uppercase tracking-[0.2em] text-sand/50">{t('footer.hours')}</p>
          <p className="mt-4">{lx(settings?.hours, i18n.language)}</p>
          <p className="mt-4">{settings?.phone}</p>
          <p>{settings?.email}</p>
          <p className="mt-3">{lx(settings?.address, i18n.language)}</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs tracking-wide text-sand/45">© {new Date().getFullYear()} Farm City</div>
    </footer>
  );
}

export function StoreLayout() {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.auth.status);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    catalogApi.categories().then((res) => setCategories(res.data.flat || [])).catch(() => {});
    catalogApi.settings().then((res) => setSettings(res.data)).catch(() => {});
  }, []);
  useEffect(() => {
    if (status === 'ready') dispatch(fetchCart());
  }, [status, dispatch]);
  return (
    <LiveNotificationsProvider>
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">{useTranslation().t('skip')}</a>
      <Header categories={categories} settings={settings} />
      <main id="main" className="flex-1"><Outlet context={{ categories, settings }} /></main>
      <Footer settings={settings} categories={categories} />
    </div>
    </LiveNotificationsProvider>
  );
}

export function PriceTag({ price, compare, unit, t }) {
  return (
    <p className="flex flex-wrap items-baseline gap-2">
      <span className="font-display text-2xl text-ocean-950">{money(price)}</span>
      {compare > price ? <span className="text-sm text-ocean-900/35 line-through">{money(compare)}</span> : null}
      {unit ? <span className="text-[11px] uppercase tracking-[0.14em] text-ocean-900/50">{t('common.per')} {t(`units.${unit}`)}</span> : null}
    </p>
  );
}

export function StockBadge({ availability, t }) {
  if (availability === 'out_of_stock') return <Badge tone="red">{t('common.out')}</Badge>;
  if (availability === 'low_stock') return <Badge tone="sand">{t('common.lowStock')}</Badge>;
  return <Badge tone="kelp">{t('common.inStock')}</Badge>;
}
