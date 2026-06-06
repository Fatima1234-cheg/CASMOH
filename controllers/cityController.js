const { body, validationResult } = require('express-validator');
const City = require('../models/City');

exports.list = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const pageMA = parseInt(req.query.pageMA) || 1;
    const pageFR = parseInt(req.query.pageFR) || 1;
    const skipMA = (pageMA - 1) * limit;
    const skipFR = (pageFR - 1) * limit;

    // Requêtes pour le Maroc
    const totalMA = await City.countDocuments({ country: 'Morocco' });
    const citiesMA = await City.find({ country: 'Morocco' })
      .sort({ name: 1 })
      .skip(skipMA)
      .limit(limit);

    // Requêtes pour la France
    const totalFR = await City.countDocuments({ country: 'France' });
    const citiesFR = await City.find({ country: 'France' })
      .sort({ name: 1 })
      .skip(skipFR)
      .limit(limit);

    const paginationMA = {
      page: pageMA,
      limit,
      totalItems: totalMA,
      totalPages: Math.ceil(totalMA / limit),
      prevPage: pageMA > 1 ? pageMA - 1 : null,
      nextPage: pageMA < Math.ceil(totalMA / limit) ? pageMA + 1 : null,
    };
    const paginationFR = {
      page: pageFR,
      limit,
      totalItems: totalFR,
      totalPages: Math.ceil(totalFR / limit),
      prevPage: pageFR > 1 ? pageFR - 1 : null,
      nextPage: pageFR < Math.ceil(totalFR / limit) ? pageFR + 1 : null,
    };

    res.render('cities/list', {
      title: 'Villes',
      citiesMA,
      citiesFR,
      errors: [],
      paginationMA,
      paginationFR,
    });
  } catch (err) {
    next(err);
  }
};

exports.validators = [
  body('name').trim().notEmpty().withMessage('Nom de ville requis'),
  body('country')
    .trim()
    .customSanitizer((value) => {
      const v = String(value || '').trim().toLowerCase();
      if (v === 'maroc' || v === 'morocco') return 'Morocco';
      if (v === 'france') return 'France';
      return value;
    })
    .isIn(['Morocco', 'France'])
    .withMessage('Pays invalide'),
];

exports.create = async (req, res, next) => {
  const errors = validationResult(req);
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';

  // 1. Gestion des erreurs de validation (champ vide, etc.)
  if (!errors.isEmpty()) {
    if (isAjax) {
      // Pour AJAX : retourner les erreurs en JSON (toast)
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    // Pour les requêtes classiques (formulaire standard)
    const citiesMA = await City.find({ country: 'Morocco' }).sort({ name: 1 });
    const citiesFR = await City.find({ country: 'France' }).sort({ name: 1 });
    return res.status(422).render('cities/list', {
      title: 'Villes',
      citiesMA,
      citiesFR,
      errors: errors.array(),
    });
  }

  // 2. Création de la ville
  try {
    await City.create(req.body);
    if (isAjax) {
      return res.status(201).json({ success: true });
    }
    res.redirect('/cities');
  } catch (err) {
    // 3. Gestion des erreurs de doublon (code 11000)
    if (err.code === 11000) {
      if (isAjax) {
        return res.status(400).json({ success: false, error: 'Ville déjà existante pour ce pays' });
      }
      err.status = 400;
      err.message = 'Ville déjà existante pour ce pays';
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.redirect('/cities');
  } catch (err) {
    next(err);
  }
};
