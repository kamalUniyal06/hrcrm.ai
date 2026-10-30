// Small Halloween illustrations. They keep their own fixed colours on purpose: a pumpkin
// stays orange in every theme. All are decorative, so they are hidden from screen readers.

export function Pumpkin({ size = 40, glow = true, className }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <path d="M33 14c0-5 3-8 7-9" fill="none" stroke="#3f6212" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M36 12c5-4 11-3 14 1-5 1-9 1-14-1z" fill="#65a30d" />
      <ellipse cx="20" cy="38" rx="14" ry="18" fill="#ea580c" />
      <ellipse cx="44" cy="38" rx="14" ry="18" fill="#ea580c" />
      <ellipse cx="32" cy="38" rx="15" ry="20" fill="#f97316" />
      <path d="M32 18v40M22 21c-4 9-4 25 0 34M42 21c4 9 4 25 0 34" stroke="#c2410c" strokeWidth="1.6" fill="none" opacity=".6" />
      <g fill={glow ? "#fde047" : "#7c2d12"} className={glow ? "ho-flicker" : undefined}>
        <path d="M19 33l6-6 5 6z" />
        <path d="M34 33l5-6 6 6z" />
        <path d="M18 43c4 6 24 6 28 0l-4 1-3 3-3-3-4 3-4-3-3 3-3-3z" />
      </g>
    </svg>
  );
}

export function Candy({ size = 30, color = "#a855f7", className }) {
  return (
    <svg viewBox="0 0 64 32" width={size * 2} height={size} className={className} aria-hidden="true">
      <path d="M6 6l14 10L6 26z" fill={color} opacity=".85" />
      <path d="M58 6L44 16l14 10z" fill={color} opacity=".85" />
      <ellipse cx="32" cy="16" rx="14" ry="10" fill={color} />
      <path d="M22 9c4 5 4 9 0 14M32 6c4 6 4 14 0 20M42 9c-4 5-4 9 0 14" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".75" />
    </svg>
  );
}

export function Lollipop({ size = 36, className }) {
  return (
    <svg viewBox="0 0 40 64" width={size * 0.62} height={size} className={className} aria-hidden="true">
      <rect x="18.5" y="30" width="3" height="32" rx="1.5" fill="#e7e5e4" />
      <circle cx="20" cy="18" r="16" fill="#f97316" />
      <path d="M20 18m-11 0a11 11 0 1 0 22 0a8 8 0 1 0-16 0a5 5 0 1 0 10 0" fill="none" stroke="#fff7ed" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Ghost({ size = 40, className }) {
  return (
    <svg viewBox="0 0 64 72" width={size} height={size * 1.12} className={className} aria-hidden="true">
      <path d="M32 4C17 4 8 16 8 32v34l8-6 8 6 8-6 8 6 8-6 8 6V32C56 16 47 4 32 4z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      <ellipse cx="24" cy="30" rx="4" ry="6" fill="#1e1b4b" />
      <ellipse cx="40" cy="30" rx="4" ry="6" fill="#1e1b4b" />
      <ellipse cx="32" cy="44" rx="5" ry="6" fill="#1e1b4b" />
      <circle cx="18" cy="38" r="3" fill="#fda4af" opacity=".6" />
      <circle cx="46" cy="38" r="3" fill="#fda4af" opacity=".6" />
    </svg>
  );
}

export function Bat({ size = 44, className }) {
  return (
    <svg viewBox="0 0 80 40" width={size} height={size / 2} className={className} aria-hidden="true">
      <g className="ho-flap" style={{ transformOrigin: "40px 20px" }}>
        <path d="M40 18C33 6 18 4 2 10c8 2 10 8 9 14 5-4 10-3 13 2 3-5 9-6 16-8zM40 18c7-12 22-14 38-8-8 2-10 8-9 14-5-4-10-3-13 2-3-5-9-6-16-8z" fill="#1e1b4b" />
      </g>
      <ellipse cx="40" cy="20" rx="6" ry="8" fill="#312e81" />
      <path d="M36 13l1-6 3 4 3-4 1 6z" fill="#312e81" />
      <circle cx="38" cy="18" r="1.3" fill="#fde047" />
      <circle cx="42" cy="18" r="1.3" fill="#fde047" />
    </svg>
  );
}

export function Owl({ size = 90, className }) {
  return (
    <svg viewBox="0 0 120 100" width={size * 1.2} height={size} className={className} aria-hidden="true">
      <g className="ho-flap" style={{ transformOrigin: "60px 50px" }}>
        <path d="M44 46C30 30 12 30 2 40c14 0 22 10 28 22 4-6 9-10 14-16zM76 46c14-16 32-16 42-6-14 0-22 10-28 22-4-6-9-10-14-16z" fill="#78350f" />
      </g>
      <ellipse cx="60" cy="56" rx="20" ry="26" fill="#92400e" />
      <ellipse cx="60" cy="64" rx="12" ry="16" fill="#fde68a" opacity=".85" />
      <path d="M43 34l5-12 8 10zM77 34l-5-12-8 10z" fill="#78350f" />
      <circle cx="52" cy="44" r="8" fill="#fef3c7" />
      <circle cx="68" cy="44" r="8" fill="#fef3c7" />
      <circle cx="52" cy="44" r="4" fill="#1c1917" />
      <circle cx="68" cy="44" r="4" fill="#1c1917" />
      <path d="M57 51l3 5 3-5z" fill="#f59e0b" />
    </svg>
  );
}

export function Bird({ size = 34, className }) {
  return (
    <svg viewBox="0 0 60 30" width={size} height={size / 2} className={className} aria-hidden="true">
      <g className="ho-flap" style={{ transformOrigin: "30px 15px" }}>
        <path d="M30 16C24 6 12 4 2 8c10 1 18 6 28 10 10-4 18-9 28-10-10-4-22-2-28 8z" fill="#292524" />
      </g>
    </svg>
  );
}

export function Leaf({ size = 22, rotate = 0, className }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <path d="M4 28C4 12 14 4 28 4c0 14-8 24-24 24z" fill="#65a30d" />
      <path d="M6 26L24 8" stroke="#3f6212" strokeWidth="1.5" />
    </svg>
  );
}
