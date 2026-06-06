const express = require('express');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { ensureAuth } = require('../middleware/auth');
const Order = require('../models/Order');
const City = require('../models/City');
const { generatePdfBufferFromHtml } = require('../utils/pdf');

const router = express.Router();

function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

function formatDateFr(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function normalizeCountryCode(input) {
  const v = String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!v) return '';
  if (v === 'ma' || v === 'maroc' || v === 'morocco') return 'MA';
  if (v === 'fr' || v === 'france') return 'FR';
  return '';
}

function normalizeCityKey(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toFileUrl(absPath) {
  return `file:///${String(absPath).replace(/\\/g, '/')}`;
}

function chunkArray(arr, size) {
  const out = [];
  const list = Array.isArray(arr) ? arr : [];
  const n = Math.max(1, Number(size) || 1);
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

let logoDataUriCache = null;
function getLogoDataUri() {
  if (logoDataUriCache !== null) return logoDataUriCache;
  try {
    const logoPath = path.join(__dirname, '..', 'public', 'img', 'LOgotransparent.png');
    const buf = fs.readFileSync(logoPath);
    logoDataUriCache = `data:image/png;base64,${buf.toString('base64')}`;
    return logoDataUriCache;
  } catch (e) {
    logoDataUriCache = '';
    return logoDataUriCache;
  }
}

router.get('/pdf', ensureAuth, async (req, res, next) => {
  try {
    const direction = String(req.query.direction || '').trim();
    const toCountry = normalizeCountryCode(req.query.toCountry);
    if (!(toCountry === 'MA' || toCountry === 'FR')) {
      return res.status(400).send('Paramètre toCountry invalide. Utilisez Maroc ou France.');
    }
    const transporteur = String(req.query.transporteur || '').trim();
    const vehicle = String(req.query.vehicle || '').trim();
    const dateValue = req.query.date ? new Date(req.query.date) : new Date();
    const dateArriveeValue = req.query.dateArrivee ? new Date(req.query.dateArrivee) : dateValue;
    const immatriculation = String(req.query.immatriculation || '').trim();
    const paysImmatriculation = String(req.query.paysImmatriculation || '').trim();
    const registreCommerceNumber = String(req.query.registreCommerceNumber || '').trim();
    const registreCommerceCentre = String(req.query.registreCommerceCentre || '').trim();
    const adresseMaroc = String(req.query.adresseMaroc || '').trim();
    const villeDepart = direction === 'FR-MA' ? 'France' : direction === 'MA-FR' ? 'Maroc' : '';
    const paysProvenance = String(req.query.paysProvenance || '').trim() || villeDepart;

    const cities = await City.find({}).lean();
    const cityById = new Map(cities.map((c) => [String(c._id), String(c.name || '').trim()]));
    const cityCountryById = new Map(cities.map((c) => [String(c._id), normalizeCountryCode(c.country)]));
    const cityNameCountries = new Map();
    const cityNameDisplay = new Map();
    for (const c of cities) {
      const key = normalizeCityKey(c.name);
      if (!key) continue;
      if (!cityNameCountries.has(key)) cityNameCountries.set(key, new Set());
      cityNameCountries.get(key).add(normalizeCountryCode(c.country));
      if (!cityNameDisplay.has(key)) cityNameDisplay.set(key, String(c.name || '').trim());
    }
    const destinationCityIds = new Set(
      cities
        .filter((c) => normalizeCountryCode(c.country) === toCountry)
        .map((c) => String(c._id))
    );
    const destinationCityNameKeys = new Set(
      cities
        .filter((c) => normalizeCountryCode(c.country) === toCountry)
        .map((c) => normalizeCityKey(c.name))
        .filter(Boolean)
    );

    function resolveDestinationInfo(order) {
      if (!order || typeof order !== 'object') return { country: '', cityName: '' };

      const receiverCityRaw = String(order.receiverCity || '').trim();

      // Source prioritaire: toCity (référence City)
      if (order.toCity) {
        const cityId = String(order.toCity);
        const country = cityCountryById.get(cityId) || '';
        const cityName = cityById.get(cityId) || receiverCityRaw;
        if (country) return { country, cityName: cityName || '' };
      }

      // Fallback: receiverCity uniquement si ce nom existe dans les villes du pays cible.
      const receiverKey = normalizeCityKey(receiverCityRaw);
      if (receiverCityRaw && receiverKey && destinationCityNameKeys.has(receiverKey)) {
        return { country: toCountry, cityName: receiverCityRaw };
      }
      if (receiverCityRaw) return { country: '', cityName: receiverCityRaw };
      return { country: '', cityName: '' };
    }

    const orderQuery = {};
    const expectedDirection = toCountry === 'MA' ? 'FR-MA' : 'MA-FR';
    orderQuery.direction = expectedDirection;
    if (direction && direction !== expectedDirection) {
      return res.status(404).send('Aucun colis à exporter');
    }

    const ordersRaw = await Order.find(orderQuery).sort({ createdAt: 1 }).lean();
    const orders = ordersRaw.filter((o) => {
      if (o.toCity) return destinationCityIds.has(String(o.toCity));
      const key = normalizeCityKey(o.receiverCity);
      return !!(key && destinationCityNameKeys.has(key));
    });

    const ordersByCity = new Map();
    const cityDisplayByKey = new Map();
    for (const o of orders) {
      const info = resolveDestinationInfo(o);
      const toCityName = String(info.cityName || '').trim();
      if (!toCityName) continue;
      const key = normalizeCityKey(toCityName);
      if (!ordersByCity.has(key)) ordersByCity.set(key, []);
      ordersByCity.get(key).push(o);
      if (!cityDisplayByKey.has(key)) {
        cityDisplayByKey.set(key, cityNameDisplay.get(key) || toCityName);
      }
    }

    const cityNames = Array.from(cityDisplayByKey.values()).sort((a, b) => a.localeCompare(b, 'fr'));

    const templatePath = path.join(__dirname, '..', 'views', 'exports', 'feuille-route.ejs');
    const todayIso = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rowsPerPage = 28;
    const feuilles = [];

    for (const cityName of cityNames) {
      const cityKey = normalizeCityKey(cityName);
      const cityOrders = ordersByCity.get(cityKey) || [];
      if (!cityOrders.length) continue;

      const totalColis = cityOrders.reduce((acc, o) => acc + (Number(o.parcelsCount) || 1), 0);
      const poidsTotal = cityOrders.reduce((acc, o) => acc + (Number(o.weightKg) || 0), 0);
      const pages = chunkArray(cityOrders, rowsPerPage);

      for (const pageOrders of pages) {
        const feuilleRouteNumber = `FR-${todayIso}-${slugify(cityName)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        feuilles.push({
          feuilleRouteNumber,
          date: formatDateFr(dateValue),
          dateArrivee: formatDateFr(dateArriveeValue),
          transporteur: transporteur || '',
          vehicle: vehicle || '',
          paysProvenance,
          immatriculation,
          paysImmatriculation,
          registreCommerceNumber,
          registreCommerceCentre,
          adresseMaroc,
          villeDepart,
          villeArrivee: cityName,
          direction: direction || '',
          colis: pageOrders.map((o) => ({
            ...(function () {
              const info = resolveDestinationInfo(o);
              const destinationName = String(info.cityName || '').trim() || cityName;
              const refNumber = String(o.orderNumber || '').trim() || 'N/A';
              const quantity = Number(o.parcelsCount) || 1;
              const refWithQuantity = `${refNumber}/${quantity}`;
              return {
                reference: refWithQuantity,
                nombre: quantity,
                nature: String(o.dimensions || '').trim() || 'Colis',
                description: o.description || '—',
                poids: o.weightKg !== undefined && o.weightKg !== null ? Number(o.weightKg) : '',
                valeur: o.paidAmount !== undefined && o.paidAmount !== null ? Number(o.paidAmount) : (o.price !== undefined && o.price !== null ? Number(o.price) : ''),
                expediteur: { nom: o.senderName || '—', telephone: o.senderPhone || '', ville: o.senderCity || '' },
                destinataire: { nom: o.receiverName || '—', telephone: o.receiverPhone || '', ville: destinationName },
                villeProvenance: o.senderCity || '',
                villeDestination: destinationName,
              };
            })(),
          })),
          totalColis,
          poidsTotal,
        });
      }
    }

    if (!feuilles.length) {
      return res.status(404).send('Aucun colis à exporter');
    }

    const logoDataUri = getLogoDataUri();

    const html = await ejs.renderFile(
      templatePath,
      {
        feuilles,
        logoDataUri,
        contacts: {
          france: '+33 6 58 88 18 09',
          maroc1: '+212 6 00 43 42 01',
          maroc2: '+212 6 01 95 42 24',
        },
      },
      { async: true }
    );
    const pdfBuffer = await generatePdfBufferFromHtml(html, {
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      scale: 0.99,
    });

    const destinationLabel =
      toCountry === 'MA' ? 'vers-maroc' : toCountry === 'FR' ? 'vers-france' : 'toutes-villes';
    const filename = `feuille-route-${destinationLabel}-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return next(err);
    return res.status(500).send(`Erreur PDF: ${err && err.message ? err.message : 'Erreur serveur'}`);
  }
});

router.get('/pdf/:city', ensureAuth, async (req, res, next) => {
  try {
    const cityName = String(req.params.city || '').trim();
    if (!cityName) {
      return res.status(400).send('City is required');
    }

    const direction = String(req.query.direction || '').trim();
    const transporteur = String(req.query.transporteur || '').trim();
    const vehicle = String(req.query.vehicle || '').trim();
    const dateValue = req.query.date ? new Date(req.query.date) : new Date();
    const dateArriveeValue = req.query.dateArrivee ? new Date(req.query.dateArrivee) : dateValue;
    const immatriculation = String(req.query.immatriculation || '').trim();
    const paysImmatriculation = String(req.query.paysImmatriculation || '').trim();
    const registreCommerceNumber = String(req.query.registreCommerceNumber || '').trim();
    const registreCommerceCentre = String(req.query.registreCommerceCentre || '').trim();
    const adresseMaroc = String(req.query.adresseMaroc || '').trim();

    const cityDoc = await City.findOne({ name: cityName }).lean();
    const query = {
      $or: [
        { receiverCity: cityName },
        ...(cityDoc ? [{ toCity: cityDoc._id }] : []),
      ],
    };
    if (direction) query.direction = direction;

    const orders = await Order.find(query).sort({ createdAt: 1 }).lean();
    if (!orders.length) {
      return res.status(404).send('Aucun colis à exporter pour cette ville');
    }

    const totalColis = orders.reduce((acc, o) => acc + (Number(o.parcelsCount) || 1), 0);
    const poidsTotal = orders.reduce((acc, o) => acc + (Number(o.weightKg) || 0), 0);

    const feuilleRouteNumber = `FR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${slugify(cityName)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const templatePath = path.join(__dirname, '..', 'views', 'exports', 'feuille-route.ejs');
    const villeDepart = direction === 'FR-MA' ? 'France' : direction === 'MA-FR' ? 'Maroc' : '';
    const paysProvenance = String(req.query.paysProvenance || '').trim() || villeDepart;
    const logoDataUri = getLogoDataUri();

    const html = await ejs.renderFile(
      templatePath,
      {
        feuilleRouteNumber,
        date: formatDateFr(dateValue),
        dateArrivee: formatDateFr(dateArriveeValue),
        transporteur: transporteur || '',
        vehicle: vehicle || '',
        paysProvenance,
        immatriculation,
        paysImmatriculation,
        registreCommerceNumber,
        registreCommerceCentre,
        adresseMaroc,
        villeDepart,
        villeArrivee: cityName,
        direction: direction || '',
        logoDataUri,
        contacts: {
          france: '+33 6 58 88 18 09',
          maroc1: '+212 6 00 43 42 01',
          maroc2: '+212 6 01 95 42 24',
        },
        colis: orders.map((o) => ({
          reference: `${String(o.orderNumber || '').trim() || 'N/A'}/${Number(o.parcelsCount) || 1}`,
          nombre: Number(o.parcelsCount) || 1,
          nature: String(o.dimensions || '').trim() || 'Colis',
          description: o.description || '—',
          poids: o.weightKg !== undefined && o.weightKg !== null ? Number(o.weightKg) : '',
          valeur: o.paidAmount !== undefined && o.paidAmount !== null ? Number(o.paidAmount) : (o.price !== undefined && o.price !== null ? Number(o.price) : ''),
          expediteur: { nom: o.senderName || '—', telephone: o.senderPhone || '', ville: o.senderCity || '' },
          destinataire: { nom: o.receiverName || '—', telephone: o.receiverPhone || '', ville: o.receiverCity || cityName },
          villeProvenance: o.senderCity || '',
          villeDestination: o.receiverCity || cityName,
        })),
        totalColis,
        poidsTotal,
      },
      { async: true }
    );

    const pdfBuffer = await generatePdfBufferFromHtml(html, {
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      scale: 0.99,
    });

    const filename = `feuille-route-${slugify(cityName)}-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return next(err);
    return res.status(500).send(`Erreur PDF: ${err && err.message ? err.message : 'Erreur serveur'}`);
  }
});

router.get('/pdf/:city', ensureAuth, async (req, res, next) => {
  try {
    const cityName = String(req.params.city || '').trim();
    if (!cityName) return res.status(400).send('Ville requise');

    const direction = String(req.query.direction || '').trim();
    const transporteur = String(req.query.transporteur || '').trim();
    const vehicle = String(req.query.vehicle || '').trim();
    const dateValue = req.query.date ? new Date(req.query.date) : new Date();
    const dateArriveeValue = req.query.dateArrivee ? new Date(req.query.dateArrivee) : dateValue;
    const immatriculation = String(req.query.immatriculation || '').trim();
    const paysImmatriculation = String(req.query.paysImmatriculation || '').trim();
    const registreCommerceNumber = String(req.query.registreCommerceNumber || '').trim();
    const registreCommerceCentre = String(req.query.registreCommerceCentre || '').trim();
    const adresseMaroc = String(req.query.adresseMaroc || '').trim();
    const villeDepart = direction === 'FR-MA' ? 'France' : direction === 'MA-FR' ? 'Maroc' : '';
    const paysProvenance = String(req.query.paysProvenance || '').trim() || villeDepart;

    const cities = await City.find({}).lean();
    const cityById = new Map(cities.map((c) => [String(c._id), String(c.name || '').trim()]));
    const cityNameKeys = new Set(cities.map((c) => normalizeCityKey(c.name)).filter(Boolean));
    const cityKey = normalizeCityKey(cityName);

    const cityDoc = cities.find((c) => normalizeCityKey(c.name) === cityKey) || null;
    const query = {};
    if (direction === 'MA-FR' || direction === 'FR-MA') query.direction = direction;
    query.$or = [
      ...(cityDoc ? [{ toCity: cityDoc._id }] : []),
      { receiverCity: cityName },
    ];

    const ordersRaw = await Order.find(query).sort({ createdAt: 1 }).lean();
    const orders = ordersRaw.filter((o) => {
      if (cityDoc && o.toCity && String(o.toCity) === String(cityDoc._id)) return true;
      const k = normalizeCityKey(o.receiverCity);
      if (!k) return false;
      if (k === cityKey) return true;
      if (cityNameKeys.has(k) && k === cityKey) return true;
      return false;
    });

    if (!orders.length) return res.status(404).send('Aucun colis à exporter');

    const totalColis = orders.reduce((acc, o) => acc + (Number(o.parcelsCount) || 1), 0);
    const poidsTotal = orders.reduce((acc, o) => acc + (Number(o.weightKg) || 0), 0);

    const templatePath = path.join(__dirname, '..', 'views', 'exports', 'feuille-route.ejs');
    const todayIso = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rowsPerPage = 28;
    const pages = chunkArray(orders, rowsPerPage);

    const feuilles = pages.map((pageOrders) => ({
      feuilleRouteNumber: `FR-${todayIso}-${slugify(cityName)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      date: formatDateFr(dateValue),
      dateArrivee: formatDateFr(dateArriveeValue),
      transporteur: transporteur || '',
      vehicle: vehicle || '',
      paysProvenance,
      immatriculation,
      paysImmatriculation,
      registreCommerceNumber,
      registreCommerceCentre,
      adresseMaroc,
      villeDepart,
      villeArrivee: cityName,
      direction: direction || '',
      colis: pageOrders.map((o) => {
        const refNumber = String(o.orderNumber || '').trim() || 'N/A';
        const quantity = Number(o.parcelsCount) || 1;
        const refWithQuantity = `${refNumber}/${quantity}`;
        const destName =
          (o.toCity && cityById.get(String(o.toCity))) ||
          String(o.receiverCity || '').trim() ||
          cityName;
        return {
          reference: refWithQuantity,
          nombre: quantity,
          nature: String(o.dimensions || '').trim() || 'Colis',
          description: o.description || '—',
          poids: o.weightKg !== undefined && o.weightKg !== null ? Number(o.weightKg) : '',
          valeur: o.paidAmount !== undefined && o.paidAmount !== null ? Number(o.paidAmount) : (o.price !== undefined && o.price !== null ? Number(o.price) : ''),
          expediteur: { nom: o.senderName || '—', telephone: o.senderPhone || '', ville: o.senderCity || '' },
          destinataire: { nom: o.receiverName || '—', telephone: o.receiverPhone || '', ville: destName },
          villeProvenance: o.senderCity || '',
          villeDestination: destName,
        };
      }),
      totalColis,
      poidsTotal,
    }));

    const logoDataUri = getLogoDataUri();
    const html = await ejs.renderFile(
      templatePath,
      {
        feuilles,
        logoDataUri,
        contacts: {
          france: '+33 6 58 88 18 09',
          maroc1: '+212 6 00 43 42 01',
          maroc2: '+212 6 01 95 42 24',
        },
      },
      { async: true }
    );
    const pdfBuffer = await generatePdfBufferFromHtml(html, {
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      scale: 0.99,
    });

    const filename = `feuille-route-${slugify(cityName)}-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
