import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useOutletContext } from 'react-router-dom';
import { CategoryIcon } from '../components/CategoryIcon.jsx';
import { HeroSlider } from '../components/HeroSlider.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { Button, Notice, Spinner } from '../components/ui/primitives.jsx';
import { catalogApi } from '../services/resources.js';
import { apiError, lx, media } from '../utils/format.js';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { settings } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [news, setNews] = useState('');
  const lang = i18n.language;

  function load() {
    setError('');
    Promise.all([
      catalogApi.banners('hero'),
      catalogApi.banners('promo'),
      catalogApi.categories(),
      catalogApi.products({ bestSeller: 'true', limit: 8 }),
      catalogApi.products({ newArrival: 'true', limit: 4 }),
      catalogApi.products({ onSale: 'true', limit: 4 }),
    ]).then(([hero, promo, categories, best, fresh, sale]) => {
      setData({
        hero: hero.data,
        promo: promo.data,
        categories: (categories.data.flat || []).filter((category) => category.isFeatured && !category.parent),
        best: best.data,
        fresh: fresh.data,
        sale: sale.data,
      });
    }).catch((err) => setError(apiError(err)));
  }
  useEffect(load, []);

  async function subscribe(event) {
    event.preventDefault();
    try {
      const res = await catalogApi.subscribe(email);
      setNews(res.data.already ? t('home.newsAlready') : t('home.newsOk'));
      setEmail('');
    } catch (err) {
      setNews(apiError(err));
    }
  }

  if (error) return <div className="container-page py-16"><Notice>{error}</Notice><Button className="mt-4" onClick={load}>{t('common.retry')}</Button></div>;
  if (!data) return <div className="py-24"><Spinner /></div>;

  return (
    <div>
      <HeroSlider slides={data.hero} />

      <section className="container-page py-20 md:py-28">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{t('home.eyebrow')}</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">{t('home.categories')}</h2>
          </div>
        </div>
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-6 sm:overflow-visible sm:px-0">
          {data.categories.map((category) => (
            <Link key={category._id} to={`/category/${category.slug}`} className="group flex w-[6.6rem] shrink-0 flex-col items-center gap-3 sm:w-auto">
              <span className="block h-[5.5rem] w-[5.5rem] [filter:drop-shadow(0_10px_16px_rgba(12,40,61,0.12))] transition duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                <CategoryIcon category={category} className="h-full w-full" />
              </span>
              <span className="text-center text-sm font-medium text-ocean-950">{lx(category.name, lang)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-20 md:pb-28">
        <SectionHead title={t('home.best')} body={t('home.bestBody')} href="/products?sort=popular" link={t('home.viewAll')} />
        <ProductGrid products={data.best} />
      </section>

      {data.promo.length ? (
        <section className="container-page grid gap-5 pb-20 md:grid-cols-2 md:pb-28">
          {data.promo.map((banner) => (
            <Link key={banner._id} to={banner.link || '/products'} className="group relative min-h-[320px] overflow-hidden rounded-[1.8rem]">
              <img src={media(banner.image?.url)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-ocean-950/75 via-ocean-950/10 to-transparent" />
              <span className="relative flex h-full min-h-[320px] flex-col justify-end p-8 text-white">
                <span className="font-display text-4xl tracking-tight">{lx(banner.title, lang)}</span>
                <span className="mt-2 max-w-sm text-sm font-light text-white/80">{lx(banner.subtitle, lang)}</span>
                <span className="mt-5 text-sm tracking-wide underline underline-offset-4">{lx(banner.ctaLabel, lang) || t('common.shopNow')}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="container-page pb-20 md:pb-28">
        <SectionHead title={t('home.arrivals')} href="/products?sort=newest" link={t('home.viewAll')} />
        <ProductGrid products={data.fresh} />
      </section>

      {data.sale.length ? (
        <section className="container-page pb-20 md:pb-28">
          <SectionHead title={t('home.offers')} href="/products?onSale=true" link={t('home.viewAll')} />
          <ProductGrid products={data.sale} />
        </section>
      ) : null}

      <section className="border-y border-ocean-950/10 bg-white">
        <div className="container-page py-20 md:py-24">
          <h2 className="display text-4xl sm:text-5xl">{t('home.why')}</h2>
          <div className="mt-12 grid gap-12 md:grid-cols-4">
            {(settings?.highlights || []).map((item, index) => (
              <div key={item.title?.en || index}>
                <p className="font-display text-3xl text-ocean-300">{String(index + 1).padStart(2, '0')}</p>
                <h3 className="mt-4 font-display text-2xl">{lx(item.title, lang)}</h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-ocean-900/70">{lx(item.text, lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20 md:py-28">
        <h2 className="display text-4xl sm:text-5xl">{t('home.stories')}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {(settings?.testimonials || []).map((item) => (
            <blockquote key={item.name} className="rounded-[1.6rem] bg-white p-8 shadow-soft">
              <p className="font-display text-5xl leading-none text-ocean-200">“</p>
              <p className="mt-3 font-display text-2xl leading-snug text-ocean-950">{lx(item.quote, lang)}</p>
              <footer className="mt-6 text-xs uppercase tracking-[0.16em] text-ocean-900/50">{item.name} · {item.location}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="bg-ocean-950 text-sand">
        <form onSubmit={subscribe} className="container-page grid items-end gap-8 py-16 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
            <h2 className="font-display text-4xl tracking-tight sm:text-5xl">{t('home.newsTitle')}</h2>
            <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-sand/70">{t('home.newsBody')}</p>
          </div>
          <div>
            <label className="sr-only" htmlFor="news-email">Email</label>
            <div className="flex gap-2">
              <input id="news-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="field h-12 flex-1 rounded-full bg-white text-ink" placeholder="you@email.com" />
              <Button type="submit" className="h-12 rounded-full px-6">{t('home.newsCta')}</Button>
            </div>
            {news ? <p className="mt-3 text-sm text-sand/80">{news}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}

function SectionHead({ eyebrow, title, body, href, link }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="display mt-2 text-4xl sm:text-5xl">{title}</h2>
        {body ? <p className="mt-3 max-w-md text-sm font-light text-ocean-900/65">{body}</p> : null}
      </div>
      {href ? <Link to={href} className="shrink-0 text-sm tracking-wide text-ocean-800 underline-offset-4 hover:underline">{link}</Link> : null}
    </div>
  );
}
