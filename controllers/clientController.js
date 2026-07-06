const { body, validationResult } = require('express-validator');
const Client = require('../models/Client');

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function getPhoneVariants(value) {
  const digits = normalizeDigits(value);
  if (!digits) {
    return [];
  }

  const variants = new Set([digits, digits.replace(/^0+/, '')]);
  const knownCountryCodes = ['212', '33', '34', '39', '49', '44', '1', '32', '31'];

  knownCountryCodes.forEach((code) => {
    if (!digits.startsWith(code)) {
      return;
    }

    const national = digits.slice(code.length).replace(/^0+/, '');
    if (!national) {
      return;
    }

    variants.add(national);
    variants.add(`0${national}`);
  });

  return Array.from(variants).filter(Boolean);
}

function findClientByPhone(clients, phone) {
  const inputVariants = getPhoneVariants(phone);
  if (!inputVariants.length) {
    return null;
  }

  return (
    clients.find((client) => {
      const clientVariants = getPhoneVariants(client.phone);
      return inputVariants.some((inputVariant) => clientVariants.includes(inputVariant));
    }) || null
  );
}

// Générer un mot de passe aléatoire
function generatePassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

exports.list = async (req, res, next) => {
  try {
    const City = require('../models/City');
    const direction = req.query.direction === 'FR-MA' ? 'FR-MA' : 'MA-FR';
    const cityCountry = direction === 'FR-MA' ? 'France' : 'Morocco';
    const q = (req.query.q || '').trim();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Construction du filtre
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { phone: { $regex: q, $options: 'i' } },
            { passport: { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    // Requêtes avec pagination
    const totalItems = await Client.countDocuments(filter);
    const clients = await Client.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);
    const cities = await City.find({ country: cityCountry }).sort({ name: 1 });

    res.render('clients/list', {
      title: 'Clients',
      direction,
      clients,
      cities,
      q,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.form = async (req, res, next) => {
  try {
    const City = require('../models/City');
    const cities = await City.find().sort({ name: 1 });
    res.render('clients/form', {
      title: 'Ajouter un client',
      action: '/clients',
      method: 'POST',
      client: {},
      cities,
      errors: [],
    });
  } catch (err) {
    next(err);
  }
};

exports.lookupByPhone = async (req, res, next) => {
  try {
    const phone = String(req.query.phone || req.body?.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Numero de telephone requis' });
    }

    const clients = await Client.find()
      .select('_id name phone city address')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const client = findClientByPhone(clients, phone);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client introuvable' });
    }

    return res.json({
      success: true,
      client: {
        _id: client._id,
        name: client.name || '',
        phone: client.phone || '',
        city: client.city || '',
        address: client.address || '',
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.validators = [
  body('name').trim().notEmpty().withMessage('Nom requis'),
  body('phone').trim().notEmpty().withMessage('Téléphone requis'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email invalide'),
];

exports.create = async (req, res, next) => {
  const errors = validationResult(req);
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' || 
                 req.headers.accept?.includes('application/json') || 
                 req.headers['content-type']?.includes('application/json');
  
  console.log('CREATE - isAjax:', isAjax, 'Headers:', {
    'x-requested-with': req.headers['x-requested-with'],
    'content-type': req.headers['content-type'],
    'accept': req.headers['accept']
  });
  
  if (!errors.isEmpty()) {
    if (isAjax) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const City = require('../models/City');
      const cities = await City.find().sort({ name: 1 });
      return res.status(422).render('clients/form', {
        title: 'Ajouter un client',
        action: '/clients',
        method: 'POST',
        client: req.body,
        cities,
        errors: errors.array(),
      });
    } catch (err) {
      return next(err);
    }
  }
  try {
    // Générer un password automatiquement si vide
    if (!req.body.password) {
      req.body.password = generatePassword();
    }
    
    const newClient = await Client.create(req.body);
    
    if (isAjax) {
      return res.status(201).json({ success: true, client: newClient });
    }
    
    res.redirect('/clients');
  } catch (err) {
    const errorMessage = err.code === 11000 
      ? 'Client en double (téléphone/passport déjà utilisé)'
      : err.message;
    
    console.log('CREATE ERROR - isAjax:', isAjax, 'Error:', errorMessage);
    
    if (isAjax) {
      return res.status(400).json({ success: false, error: errorMessage });
    }
    
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Client en double (téléphone/passport déjà utilisé)';
    }
    next(err);
  }
};

exports.editForm = async (req, res, next) => {
  try {
    const City = require('../models/City');
    const client = await Client.findById(req.params.id);
    if (!client) return res.redirect('/clients');
    const cities = await City.find().sort({ name: 1 });
    res.render('clients/form', {
      title: 'Modifier un client',
      action: `/clients/${client._id}?_method=PUT`,
      method: 'POST',
      client,
      cities,
      errors: [],
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  const errors = validationResult(req);
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' || 
                 req.headers.accept?.includes('application/json') || 
                 req.headers['content-type']?.includes('application/json');
  
  console.log('UPDATE - isAjax:', isAjax, 'Headers:', {
    'x-requested-with': req.headers['x-requested-with'],
    'content-type': req.headers['content-type'],
    'accept': req.headers['accept']
  });
  
  if (!errors.isEmpty()) {
    if (isAjax) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const City = require('../models/City');
      const cities = await City.find().sort({ name: 1 });
      const client = { ...req.body, _id: req.params.id };
      return res.status(422).render('clients/form', {
        title: 'Modifier un client',
        action: `/clients/${req.params.id}?_method=PUT`,
        method: 'POST',
        client,
        cities,
        errors: errors.array(),
      });
    } catch (err) {
      return next(err);
    }
  }
  try {
    const updated = await Client.findByIdAndUpdate(req.params.id, req.body, { runValidators: true, new: true });
    
    if (isAjax) {
      return res.json({ success: true, client: updated });
    }
    
    res.redirect('/clients');
  } catch (err) {
    const errorMessage = err.code === 11000 
      ? 'Client en double (téléphone/passport déjà utilisé)'
      : err.message;
    
    console.log('UPDATE ERROR - isAjax:', isAjax, 'Error:', errorMessage);
    
    if (isAjax) {
      return res.status(400).json({ success: false, error: errorMessage });
    }
    
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Client en double (téléphone/passport déjà utilisé)';
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' || 
                 req.headers.accept?.includes('application/json') || 
                 req.headers['content-type']?.includes('application/json');
  
  try {
    await Client.findByIdAndDelete(req.params.id);
    
    if (isAjax) {
      return res.json({ success: true, message: 'Client supprimé avec succès' });
    }
    
    res.redirect('/clients');
  } catch (err) {
    console.error('DELETE ERROR - isAjax:', isAjax, 'Error:', err.message);
    
    if (isAjax) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    next(err);
  }
};
