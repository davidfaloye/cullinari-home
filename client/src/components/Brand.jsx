import { Link } from 'react-router-dom';

export function Logo({ light = false }) {
  return (
    <Link to="/" className={`logo${light ? ' logo--light' : ''}`} aria-label="Cullinari home">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="16" cy="16" r="4.5" fill="var(--palm)" />
      </svg>
      <span>Cullinari</span>
    </Link>
  );
}

// Adire-inspired resist-dye tile: rings, ladder stripes, dotted fields and a seed motif,
// repeated like a hand-stamped indigo cloth. Decorative only.
export function AdireField({ id = 'adire', className = '' }) {
  return (
    <svg className={`adire ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="96" height="96" patternUnits="userSpaceOnUse">
          <rect width="96" height="96" fill="var(--indigo)" />
          {/* rings */}
          <g fill="none" stroke="var(--dye-2)" strokeWidth="2">
            <circle cx="24" cy="24" r="16" />
            <circle cx="24" cy="24" r="10" />
            <circle cx="24" cy="24" r="4" fill="var(--dye-3)" stroke="none" />
          </g>
          {/* ladder */}
          <g stroke="var(--dye-2)" strokeWidth="2">
            <line x1="56" y1="6" x2="56" y2="42" />
            <line x1="88" y1="6" x2="88" y2="42" />
            <line x1="56" y1="12" x2="88" y2="12" />
            <line x1="56" y1="20" x2="88" y2="20" />
            <line x1="56" y1="28" x2="88" y2="28" />
            <line x1="56" y1="36" x2="88" y2="36" />
          </g>
          {/* dotted field */}
          <g fill="var(--dye-2)">
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => <circle key={`${r}${c}`} cx={12 + c * 8} cy={60 + r * 8} r="1.8" />)
            )}
          </g>
          {/* seed */}
          <g fill="none" stroke="var(--dye-3)" strokeWidth="2">
            <path d="M72 54c10 6 10 30 0 36c-10-6-10-30 0-36z" />
            <line x1="72" y1="58" x2="72" y2="86" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
