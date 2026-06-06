import React from 'react';

const COUNTRY_MAP = {
  MA: { flag: '🇲🇦', name: 'Maroc' },
  FR: { flag: '🇫🇷', name: 'France' },
};

export function normalizeCountryCode(input) {
  const raw = String(input || '').trim().toUpperCase();
  if (raw === 'MA' || raw === 'MAROC' || raw === 'MOROCCO' || raw === '+212' || raw === '212') return 'MA';
  if (raw === 'FR' || raw === 'FRANCE' || raw === '+33' || raw === '33') return 'FR';
  return '';
}

export function getCountryFlag(code, fallback = '🌍') {
  const normalized = normalizeCountryCode(code);
  return normalized ? COUNTRY_MAP[normalized].flag : fallback;
}

export function getCountryName(code, fallback = '') {
  const normalized = normalizeCountryCode(code);
  return normalized ? COUNTRY_MAP[normalized].name : (fallback || String(code || '').trim());
}

export function getDirectionFlags(direction, options = {}) {
  const { showNames = false, fallback = '' } = options;
  const raw = String(direction || '').trim().toUpperCase();
  const from = raw === 'FR-MA' ? 'FR' : raw === 'MA-FR' ? 'MA' : '';
  const to = raw === 'FR-MA' ? 'MA' : raw === 'MA-FR' ? 'FR' : '';
  if (!from || !to) return fallback || String(direction || '').trim();
  if (showNames) {
    return `${getCountryFlag(from)} ${getCountryName(from)} → ${getCountryFlag(to)} ${getCountryName(to)}`;
  }
  return `${getCountryFlag(from)} → ${getCountryFlag(to)}`;
}

export function CountryFlag({ code, showName = false, className = '', fallback = '🌍' }) {
  const normalized = normalizeCountryCode(code);
  const flag = getCountryFlag(normalized, fallback);
  const name = getCountryName(normalized, code);
  const classes = ['country-flag', className].filter(Boolean).join(' ');

  return (
    <span className={classes} title={name} aria-label={name}>
      <span className="country-flag__emoji">{flag}</span>
      {showName ? <span className="country-flag__name"> {name}</span> : null}
    </span>
  );
}

export default CountryFlag;
