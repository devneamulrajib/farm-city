import { media } from '../utils/format.js';

export const CATEGORY_ICON_KEYS = [
  'freshwater',
  'saltwater',
  'popular',
  'seafood',
  'frozen',
  'river',
  'fish',
  'crab',
  'prawn',
  'meat',
  'vegetables',
  'fruits',
  'grocery',
  'dairy',
  'essentials',
];

export const SLUG_ICONS = {
  'freshwater-fish': 'freshwater',
  'saltwater-fish': 'saltwater',
  'popular-fish': 'popular',
  'premium-seafood': 'seafood',
  'frozen-fish': 'frozen',
  'padma-meghna': 'river',
};

export function resolveIconKey(category) {
  const chosen = category?.icon;
  if (chosen && CATEGORY_ICON_KEYS.includes(chosen)) return chosen;
  return SLUG_ICONS[category?.slug] || 'fish';
}

function Tile({ fill, children }) {
  return (
    <svg viewBox="0 0 130 130" className="h-full w-full" aria-hidden>
      <rect width="130" height="130" rx="30" fill={fill} />
      <g transform="translate(65 65)">{children}</g>
    </svg>
  );
}

function Eye({ cx, cy, r = 4.6 }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#FFFFFF" />
      <circle cx={cx} cy={cy} r={r * 0.46} fill="#212121" />
    </>
  );
}

const glyphs = {
  freshwater: (
    <Tile fill="#26A69A">
      <path d="M26 1 44-13 44 15Z" fill="#EF6C00" />
      <path d="M-8-14c10-16 26-12 24 4-10-4-18-2-24-4Z" fill="#FFB74D" />
      <ellipse rx="30" ry="20" fill="#F7F7F7" />
      <path d="M-28-2c10-16 36-14 54-2-16-6-36-6-54 2Z" fill="#558B2F" />
      <path d="M-6 16c6 12 18 8 20-2" fill="#EF6C00" />
      <path d="M-20 10c-8 6-6 12 2 10" stroke="#FFF8E1" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M-16 14c-8 6-4 12 4 8" stroke="#FFF8E1" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Eye cx={-16} cy={-2} />
    </Tile>
  ),
  saltwater: (
    <Tile fill="#7E57C2">
      <path d="M22 0 40-16Q34 0 40 16Z" fill="#FFEB3B" />
      <path d="M-10-16Q2-30 16-13Z" fill="#1A237E" />
      <ellipse rx="27" ry="19" fill="#2979FF" />
      <path d="M-10 4Q2-10 18-6 8 12-10 4Z" fill="#1A237E" />
      <ellipse cx="-4" cy="12" rx="6" ry="3" fill="#FFEB3B" />
      <Eye cx={-17} cy={-4} />
    </Tile>
  ),
  popular: (
    <Tile fill="#29B6F6">
      <path d="M24 0 42-15 42 15Z" fill="#546E7A" />
      <path d="M-4-14Q6-26 18-12Z" fill="#90A4AE" />
      <ellipse rx="30" ry="16" fill="#F5F7F8" />
      <path d="M-28-1c12-12 38-10 52 0-14-5-34-6-52 0Z" fill="#B0BEC5" />
      <ellipse cx="-12" cy="4" rx="4.4" ry="2.6" fill="#263238" />
      <ellipse cx="-1" cy="3" rx="4" ry="2.4" fill="#263238" />
      <ellipse cx="10" cy="1.6" rx="3.4" ry="2.1" fill="#263238" />
      <path d="M-2 12c6 8 16 6 18-1" fill="#FFD54F" />
      <Eye cx={-18} cy={-3} />
    </Tile>
  ),
  seafood: (
    <Tile fill="#FF7043">
      <path d="M-22 16c2-16 16-28 30-24 10 3 14 14 8 22-8 10-24 12-34 6 4-4 14-6 22-4" fill="#FFF5F2" />
      <path d="M-14 10c8-2 16 2 18 8" stroke="#FFCCBC" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M2-2c6-2 12 2 12 8" stroke="#FFCCBC" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M14-14c8-10 20-8 22 0" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M16-18c10-6 18 0 14 6" stroke="#FFFFFF" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="24" cy="-8" rx="9" ry="6" fill="#FFEBEE" />
      <path d="M18-8c4-8 14-8 16-2" fill="#E64A19" />
      <Eye cx={-6} cy={6} r={3.4} />
    </Tile>
  ),
  frozen: (
    <Tile fill="#00ACC1">
      <path d="M-4 2 10-10 10 14Z" fill="#90A4AE" />
      <ellipse cx="-16" cy="2" rx="22" ry="14" fill="#F7F7F7" />
      <path d="M-34 0c8-10 26-10 40 0-12-4-26-4-40 0Z" fill="#B0BEC5" />
      <Eye cx={-26} cy={-1} r={3.6} />
      <g stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round">
        <path d="M22-24v28" />
        <path d="M10-16 34 4" />
        <path d="M10 4 34-16" />
      </g>
      <g stroke="#E1F5FE" strokeWidth="3" strokeLinecap="round">
        <path d="M22-18 16-24M22-18 28-24M22 10 16 16M22 10 28 16" />
      </g>
    </Tile>
  ),
  river: (
    <Tile fill="#1565C0">
      <path d="M8-18 22-28 22-8Z" fill="#90A4AE" />
      <ellipse cx="-8" cy="-18" rx="20" ry="11" fill="#F5F7F8" />
      <path d="M-26-20c8-8 22-8 34 0-10-3-22-3-34 0Z" fill="#B0BEC5" />
      <Eye cx={-16} cy={-20} r={3.4} />
      <path d="M-40 4q10-10 20 0t20 0 20 0 20 0" stroke="#E1F5FE" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M-40 20q10-10 20 0t20 0 20 0 20 0" stroke="#81D4FA" strokeWidth="7" fill="none" strokeLinecap="round" />
    </Tile>
  ),
  fish: (
    <Tile fill="#C0CA33">
      <path d="M24 0 42-15 42 15Z" fill="#E64A19" />
      <path d="M-6-19Q4-34 16-16Z" fill="#E64A19" />
      <path d="M-4 18Q4 30 14 17Z" fill="#E64A19" />
      <ellipse rx="28" ry="20" fill="#FF7043" />
      <path d="M-8-19.2Q-13 0-8 19.2L-2 20Q-7 0-2-20Z" fill="#FFFFFF" />
      <path d="M10-18.7Q6 0 10 18.7L16 16.4Q12 0 16-16.4Z" fill="#FFFFFF" />
      <Eye cx={-18} cy={-4} />
    </Tile>
  ),
  crab: (
    <Tile fill="#FFB300">
      <g stroke="#C62828" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M-18 12-32 20M-14 16-26 28M18 12 32 20M14 16 26 28M-20-2-30-14M20-2 30-14M-8-8v-8M8-8v-8" />
      </g>
      <circle cx="-30" cy="-18" r="9" fill="#EF5350" />
      <circle cx="30" cy="-18" r="9" fill="#EF5350" />
      <path d="M-30-18-36-28-24-28Z" fill="#FFE082" />
      <path d="M30-18 24-28 36-28Z" fill="#FFE082" />
      <ellipse cx="0" cy="6" rx="26" ry="17" fill="#EF5350" />
      <Eye cx={-8} cy={-18} />
      <Eye cx={8} cy={-18} />
      <path d="M-6 10Q0 15 6 10" stroke="#8E0000" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Tile>
  ),
  prawn: (
    <Tile fill="#EC407A">
      <path d="M-16 22C-28 8-22-12-6-18 8-24 24-12 22 2 20 14 6 22-8 20" fill="#FFFFFF" />
      <path d="M-10 12c8-1 14 4 14 10" stroke="#F8BBD0" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M4-2c6-2 12 3 10 9" stroke="#F8BBD0" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M-22 8-32 2-24 16Z" fill="#FCE4EC" />
      <path d="M16-14c8-8 18-4 16 4" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M14-16c6-10 16-8 18-2" stroke="#FFFFFF" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Eye cx={6} cy={4} r={3.2} />
    </Tile>
  ),
  meat: (
    <Tile fill="#E53935">
      <ellipse cx="8" cy="-6" rx="24" ry="18" fill="#FFCCBC" />
      <path d="M-8-8c8-10 24-8 28 2-10-2-20 2-28-2Z" fill="#E57373" />
      <rect x="-6" y="6" width="12" height="26" rx="6" fill="#FFF8E1" />
      <circle cx="-16" cy="16" r="3" fill="#FFAB91" />
    </Tile>
  ),
  vegetables: (
    <Tile fill="#66BB6A">
      <path d="M4 24-16-2h40Z" fill="#FF7043" />
      <path d="M-4 6h16" stroke="#FBE9E7" strokeWidth="3" strokeLinecap="round" />
      <path d="M2-4c2-16 8-24 2-30" stroke="#1B5E20" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M6-6c8-12 18-14 22-8" stroke="#E8F5E9" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M4-6C0-18-10-22-16-14" stroke="#C8E6C9" strokeWidth="5" fill="none" strokeLinecap="round" />
    </Tile>
  ),
  fruits: (
    <Tile fill="#AB47BC">
      <path d="M-18 16C-28 4-22-18-2-20 16-22 26 2 12 16 6 22-10 22-18 16Z" fill="#FFB300" />
      <path d="M-2-18c4-12 14-14 20-8" stroke="#C5E1A5" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="8" r="12" fill="#E53935" />
      <path d="M22-4c2-8 8-10 12-6" stroke="#C5E1A5" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M16 4c4 2 6 6 4 8" stroke="#FFCDD2" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Tile>
  ),
  grocery: (
    <Tile fill="#8D6E63">
      <path d="M-24 6-18-18h36l6 24v16h-48Z" fill="#FFE0B2" />
      <path d="M-18-18h36l-4-10H-14Z" fill="#FFCC80" />
      <path d="M-6-28h12v10H-6Z" fill="#6D4C41" />
      <path d="M-6 2h8l4 16h-8Z" fill="#66BB6A" />
      <circle cx="12" cy="10" r="7" fill="#FF7043" />
    </Tile>
  ),
  dairy: (
    <Tile fill="#42A5F5">
      <path d="M-28 24V0l6-14h16L0 0v24Z" fill="#FFFFFF" />
      <rect x="-20" y="-20" width="14" height="8" rx="2" fill="#1565C0" />
      <rect x="-22" y="6" width="18" height="6" rx="2" fill="#BBDEFB" />
      <ellipse cx="22" cy="8" rx="13" ry="16" fill="#FFF8E1" />
      <ellipse cx="22" cy="2" rx="4" ry="3" fill="#FFE082" />
    </Tile>
  ),
  essentials: (
    <Tile fill="#5C6BC0">
      <rect x="-30" y="4" width="32" height="18" rx="5" fill="#F8BBD0" />
      <rect x="-26" y="0" width="24" height="6" rx="2" fill="#FCE4EC" />
      <path d="M10 24V-6h16v30Z" fill="#FFFFFF" />
      <rect x="12" y="-16" width="12" height="10" rx="3" fill="#FFEB3B" />
      <circle cx="18" cy="8" r="3" fill="#5C6BC0" />
    </Tile>
  ),
};

export function CategoryGlyph({ name = 'fish', className = 'h-8 w-8' }) {
  return <span className={`inline-flex shrink-0 ${className}`}>{glyphs[name] || glyphs.fish}</span>;
}

export function CategoryIcon({ category, className = 'h-8 w-8' }) {
  const custom = category?.iconImage?.url;
  if (custom) {
    return <img src={media(custom)} alt="" className={`${className} rounded-[23%] object-cover`} />;
  }
  return <CategoryGlyph name={resolveIconKey(category)} className={className} />;
}
