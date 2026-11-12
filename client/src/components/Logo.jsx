import { Link } from 'react-router-dom';
import { media } from '../utils/format.js';

export const DEFAULT_LOGO = '/logo.png';

export function logoSrc(logo) {
  const url = typeof logo === 'string' ? logo : logo?.url;
  if (!url) return DEFAULT_LOGO;
  return media(url);
}

export function Logo({ compact = false, logo = null }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 sm:gap-3">
      <img
        src={logoSrc(logo)}
        alt=""
        className={`w-auto object-contain ${compact ? 'h-8 max-w-[6.5rem]' : 'h-9 max-w-[7.5rem] sm:h-11 sm:max-w-[9.5rem]'}`}
      />
      <span className="leading-none">
        <span className={`block whitespace-nowrap font-display tracking-[-0.03em] ${compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-[1.65rem]'}`}>
          <span className="text-ocean-950">Farm</span>
          <span className="text-kelp-700"> City</span>
        </span>
        <span className="mt-1 hidden text-[10px] uppercase tracking-[0.24em] text-ocean-700 sm:block">Trikon · Dhaka</span>
      </span>
    </Link>
  );
}
