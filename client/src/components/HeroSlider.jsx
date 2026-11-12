import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { lx, media } from '../utils/format.js';

export function HeroSlider({ slides = [] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const startX = useRef(null);
  const count = slides.length;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mediaQuery.matches);
    apply();
    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reduced || paused || count < 2) return undefined;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), 6500);
    return () => window.clearInterval(timer);
  }, [reduced, paused, count, index]);

  if (!count) return null;
  const go = (next) => setIndex((next + count) % count);

  return (
    <section
      className="relative h-[78vh] min-h-[520px] max-h-[820px] overflow-hidden bg-ocean-950 text-white"
      aria-roledescription="carousel"
      aria-label={t('slider.label')}
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
      }}
      onTouchStart={(event) => { startX.current = event.changedTouches[0].clientX; }}
      onTouchEnd={(event) => {
        if (startX.current == null) return;
        const delta = event.changedTouches[0].clientX - startX.current;
        if (delta > 48) go(index - 1);
        if (delta < -48) go(index + 1);
        startX.current = null;
      }}
    >
      {slides.map((slide, slideIndex) => {
        const active = slideIndex === index;
        return (
          <div
            key={slide._id || slideIndex}
            className={`absolute inset-0 ${reduced ? '' : 'transition-opacity duration-700'} ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            aria-hidden={!active}
          >
            <img
              src={media(slide.image?.url)}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ocean-950/80 via-ocean-950/45 to-ocean-950/10" />
            <div className="absolute inset-0 flex items-end">
              <div className="container-page w-full pb-20 sm:pb-24">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">{t('home.eyebrow')}</p>
                <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] sm:text-6xl">
                  {lx(slide.title, lang)}
                </h1>
                <p className="mt-5 max-w-xl text-base font-light leading-relaxed text-white/85 sm:text-lg">
                  {lx(slide.subtitle, lang)}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to={slide.link || '/products'} className="inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-medium text-ocean-950 transition hover:bg-sand">
                    {lx(slide.ctaLabel, lang) || t('common.shopNow')}
                  </Link>
                  <Link to="/products" className="inline-flex h-12 items-center rounded-full border border-white/40 px-6 text-sm text-white transition hover:bg-white/10">
                    {t('common.explore')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {count > 1 ? (
        <>
          <button type="button" className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:grid" aria-label={t('slider.prev')} onClick={() => go(index - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:grid" aria-label={t('slider.next')} onClick={() => go(index + 1)}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-7 left-0 right-0 flex justify-center gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide._id || slideIndex}
                type="button"
                aria-label={t('slider.goto', { n: slideIndex + 1 })}
                aria-current={slideIndex === index ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all ${slideIndex === index ? 'w-8 bg-white' : 'w-3 bg-white/45 hover:bg-white/70'}`}
                onClick={() => setIndex(slideIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
