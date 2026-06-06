const COUNTRY_MAP = {
  MA: {
    code: 'MA',
    flag: '🇲🇦',
    name: 'Maroc',
    aliases: ['MA', 'MAROC', 'MOROCCO', '+212', '212'],
  },
  FR: {
    code: 'FR',
    flag: '🇫🇷',
    name: 'France',
    aliases: ['FR', 'FRANCE', '+33', '33'],
  },
};

function normalizeCountryCode(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();

  for (const [code, config] of Object.entries(COUNTRY_MAP)) {
    if (code === upper || config.aliases.includes(upper)) return code;
  }

  return '';
}

function getCountryFlag(input, fallback = '🌍') {
  const code = normalizeCountryCode(input);
  return code ? COUNTRY_MAP[code].flag : fallback;
}

function getCountryName(input, fallback = '') {
  const code = normalizeCountryCode(input);
  if (code) return COUNTRY_MAP[code].name;
  return fallback || String(input || '').trim();
}

function getCountryDisplay(input, options = {}) {
  const { showName = true, fallback = '🌍' } = options;
  const code = normalizeCountryCode(input);
  if (!code) return fallback || String(input || '').trim();
  const { flag, name } = COUNTRY_MAP[code];
  return showName ? `${flag} ${name}` : flag;
}

function getDirectionCountries(direction) {
  const raw = String(direction || '').trim().toUpperCase();
  if (raw === 'MA-FR') return ['MA', 'FR'];
  if (raw === 'FR-MA') return ['FR', 'MA'];
  return [];
}

function getDirectionDisplay(direction, options = {}) {
  const { showNames = false, fallback = '' } = options;
  const countries = getDirectionCountries(direction);
  if (!countries.length) return fallback || String(direction || '').trim();

  const [fromCode, toCode] = countries;
  if (showNames) {
    return `${getCountryDisplay(fromCode)} → ${getCountryDisplay(toCode)}`;
  }
  return `${getCountryFlag(fromCode)} → ${getCountryFlag(toCode)}`;
}

function getCountryPairDisplay(separator = ' · ') {
  return `${getCountryDisplay('FR')}${separator}${getCountryDisplay('MA')}`;
}

module.exports = {
  COUNTRY_MAP,
  normalizeCountryCode,
  getCountryFlag,
  getCountryName,
  getCountryDisplay,
  getDirectionCountries,
  getDirectionDisplay,
  getCountryPairDisplay,
};
