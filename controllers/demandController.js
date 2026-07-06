const { body, validationResult } = require('express-validator');
const Demand = require('../models/Demand');
const City = require('../models/City');
const DEMAND_RESET_CODE = '12345@';

async function getReceiverCities(direction) {
  const safeDirection = direction === 'FR-MA' ? 'FR-MA' : 'MA-FR';
  const country = safeDirection === 'FR-MA' ? 'Morocco' : 'France';
  return City.find({ country }).sort({ name: 1 }).lean();
}

exports.validators = [
  body('firstName').trim().notEmpty().withMessage('Le prénom est requis'),
  body('lastName').trim().notEmpty().withMessage('Le nom est requis'),
  body('phone').trim().notEmpty().withMessage('Le numéro est requis'),
  body('parcelDescription').trim().notEmpty().withMessage('La description du coli est requise'),
  body('destination').trim().notEmpty().withMessage('La destination est requise'),
  body('direction').optional().isIn(['MA-FR', 'FR-MA']).withMessage('Direction invalide'),
];

exports.create = async (req, res, next) => {
  const errors = validationResult(req);
  const direction = req.body.direction === 'FR-MA' ? 'FR-MA' : 'MA-FR';

  if (!errors.isEmpty()) {
    try {
      const receiverCities = await getReceiverCities(direction);
      return res.status(422).render('client-order-new', {
        title: 'Nouvelle demande',
        currentDirection: direction,
        receiverCities,
        requestData: req.body,
        errors: errors.array(),
      });
    } catch (error) {
      return next(error);
    }
  }

  try {
    await Demand.create({
      client: req.session?.user?.id || undefined,
      firstName: req.body.firstName.trim(),
      lastName: req.body.lastName.trim(),
      phone: req.body.phone.trim(),
      parcelDescription: req.body.parcelDescription.trim(),
      destination: req.body.destination.trim(),
      direction,
      newRequestAlert: true,
    });

    return res.redirect('/client-dashboard?requestSuccess=1');
  } catch (error) {
    return next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const demands = await Demand.find()
      .sort({ createdAt: -1 })
      .populate('client')
      .lean();

    return res.render('demandes/list', {
      title: 'Demandes',
      demands,
      direction: req.query.direction || 'MA-FR',
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const status = req.body.status === 'contacted' ? 'contacted' : 'not_contacted';
    const demand = await Demand.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).lean();

    if (!demand) {
      return res.status(404).json({ success: false, error: 'Demande introuvable' });
    }

    return res.json({ success: true, demand });
  } catch (error) {
    return next(error);
  }
};

exports.deleteOne = async (req, res, next) => {
  try {
    const demand = await Demand.findByIdAndDelete(req.params.id);

    if (!demand) {
      return res.status(404).json({ success: false, error: 'Demande introuvable' });
    }

    return res.json({ success: true, message: 'Demande supprimee avec succes' });
  } catch (error) {
    return next(error);
  }
};

exports.deleteAll = async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim();

    if (!code) {
      return res.status(400).json({ success: false, error: 'Veuillez saisir le code' });
    }

    if (code !== DEMAND_RESET_CODE) {
      return res.status(403).json({ success: false, error: 'Mot de passe incorrecte' });
    }

    const result = await Demand.deleteMany({});
    return res.json({
      success: true,
      message: 'Toutes les demandes ont ete supprimees',
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    return next(error);
  }
};
