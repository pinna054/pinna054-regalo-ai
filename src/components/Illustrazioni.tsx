/** Piccoli disegni del sito, in SVG (nessuna immagine esterna). */

/** Marchio: un pacchetto regalo stilizzato. */
export function Marchio({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-terracotta" />
      <rect x="8" y="14.5" width="16" height="10.5" rx="2" className="fill-crema" />
      <rect x="6.5" y="11" width="19" height="4.5" rx="1.6" className="fill-crema" />
      <rect x="14.6" y="11" width="2.8" height="14" className="fill-terracotta" />
      <path
        d="M16 11c-1.4-3.4-5.8-4.4-5.8-1.8 0 1.7 3.1 1.8 5.8 1.8zM16 11c1.4-3.4 5.8-4.4 5.8-1.8 0 1.7-3.1 1.8-5.8 1.8z"
        className="fill-crema"
      />
    </svg>
  );
}

/** Illustrazione della home: un regalo con il cartellino che dondola. */
export function IllustrazioneRegalo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 220" className={className} aria-hidden="true" fill="none">
      {/* ombra */}
      <ellipse cx="118" cy="200" rx="78" ry="9" fill="#2b211c" opacity="0.08" />
      {/* coriandoli */}
      <circle cx="38" cy="58" r="5" fill="#4f6548" opacity="0.55" />
      <circle cx="206" cy="40" r="4" fill="#8a5e17" opacity="0.5" />
      <circle cx="214" cy="128" r="3.5" fill="#b4482f" opacity="0.45" />
      <path d="M26 112c6-6 10 4 16-2" stroke="#b4482f" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <path d="M180 22c4 6-6 9-2 15" stroke="#4f6548" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <g transform="rotate(-5 118 130)">
        {/* scatola */}
        <rect x="56" y="98" width="124" height="96" rx="10" fill="#f6e0d6" stroke="#2b211c" strokeWidth="3" />
        {/* coperchio */}
        <rect x="46" y="76" width="144" height="30" rx="8" fill="#fffdf9" stroke="#2b211c" strokeWidth="3" />
        {/* nastro */}
        <rect x="106" y="76" width="24" height="118" fill="#b4482f" stroke="#2b211c" strokeWidth="3" />
        {/* fiocco */}
        <path
          d="M118 76c-10-24-46-32-46-12 0 14 24 14 46 12z"
          fill="#b4482f"
          stroke="#2b211c"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M118 76c10-24 46-32 46-12 0 14-24 14-46 12z"
          fill="#b4482f"
          stroke="#2b211c"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="118" cy="75" r="7" fill="#953a25" stroke="#2b211c" strokeWidth="3" />
      </g>
      {/* cartellino */}
      <g className="origin-[176px_96px] animate-dondola">
        <path d="M176 96c8 10 14 20 16 34" stroke="#2b211c" strokeWidth="2" strokeLinecap="round" />
        <g transform="rotate(14 196 152)">
          <path
            d="M182 132h30a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6h-30l-10-19z"
            fill="#e4ebdc"
            stroke="#2b211c"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="184" cy="151" r="3" fill="#2b211c" />
          <path d="M194 146h16M194 156h11" stroke="#4f6548" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
