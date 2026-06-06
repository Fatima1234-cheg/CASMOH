const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { ensureAuth, ensureAdmin, ensureClient } = require('../middleware/auth');
const Order = require('../models/Order');
const Client = require('../models/Client');
const City = require('../models/City');
const Admin = require('../models/Admin');
const Demand = require('../models/Demand');
const demandController = require('../controllers/demandController');

// Utility route (dev only): set admin password to a known value
if (process.env.NODE_ENV !== 'production') {
  router.get('/dev/set-admin-password', async (req, res, next) => {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@casmoh.com';
      const admin = await Admin.findOne({ email: adminEmail });
      if (!admin) return res.status(404).send('Admin not found');
      admin.password = 'Casmoh2026@!';
      await admin.save();
      return res.send('Admin password reset to Casmoh2026@!');
    } catch (err) {
      next(err);
    }
  });
}

router.get('/dashboard', ensureAuth, (req, res) => {
  // Redirect based on user type
  if (req.session.user.type === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/client-dashboard');
});

router.get('/client-dashboard', ensureAuth, ensureClient, async (req, res, next) => {
  try {
    // 1. Récupération des paramètres de pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // 2. Compter le total des demandes du client
    const totalItems = await Demand.countDocuments({ client: req.session.user.id });

    // 3. Récupérer les demandes paginées
    const demands = await Demand.find({ client: req.session.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 4. Calcul des pages
    const totalPages = Math.ceil(totalItems / limit);

    // 5. Construction de l'objet pagination
    const pagination = {
      page,
      limit,
      totalItems,
      totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null
    };

    const totalNotContacted = await Demand.countDocuments({ client: req.session.user.id, status: 'not_contacted' });
    const totalContacted = await Demand.countDocuments({ client: req.session.user.id, status: 'contacted' });

    let orderLocation = undefined;
    let checkCodeValue = '';
    const queryCode = String(req.query.code || req.query.orderId || '').trim();

    if (queryCode) {
      checkCodeValue = queryCode;
      const searchFilter = { trackingCode: queryCode };

      const foundOrder = await Order.findOne(searchFilter).lean();
      if (foundOrder) {
        orderLocation = foundOrder.localisation ? foundOrder.localisation : 'En cours de traitement';
      } else {
        orderLocation = null;
      }
    }

    res.render('client-dashboard', { 
      title: 'Mon Espace',
      demands,
      pagination,
      navActive: 'dashboard',
      demandStats: {
        total: totalItems,
        notContacted: totalNotContacted,
        contacted: totalContacted,
      },
      orderLocation,
      checkCodeValue,
      requestSuccess: req.query.requestSuccess === '1',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/client-dashboard/choose-direction', ensureAuth, ensureClient, (req, res) => {
  const currentDirection = req.query.direction === 'FR-MA'
    ? 'FR-MA'
    : (req.query.direction === 'MA-FR' ? 'MA-FR' : '');
  res.render('client-direction-choice', { title: 'Choisir la direction', currentDirection });
});

router.get('/client-dashboard/new-demand', ensureAuth, ensureClient, async (req, res, next) => {
  try {
    const direction = req.query.direction === 'FR-MA' ? 'FR-MA' : 'MA-FR';
    const citiesMA = await City.find({ country: 'Morocco' }).sort({ name: 1 });
    const citiesFR = await City.find({ country: 'France' }).sort({ name: 1 });
    const receiverCities = direction === 'MA-FR' ? citiesFR : citiesMA;

    res.render('client-order-new', { 
      title: 'Nouvelle demande',
      currentDirection: direction,
      direction,
      receiverCities,
      requestData: {
        direction,
      },
      errors: [],
    });
  } catch (err) {
    next(err);
  }
});

router.get('/client-dashboard/new-order', ensureAuth, ensureClient, (req, res) => {
  const params = new URLSearchParams();
  if (req.query.direction) params.set('direction', req.query.direction);
  const qs = params.toString();
  return res.redirect(`/client-dashboard/new-demand${qs ? `?${qs}` : ''}`);
});

router.post(
  '/client-dashboard/new-demand',
  ensureAuth,
  ensureClient,
  demandController.validators,
  demandController.create
);

router.post(
  '/client-dashboard/new-order',
  ensureAuth,
  ensureClient,
  demandController.validators,
  demandController.create
);

router.get('/admin', ensureAuth, ensureAdmin, (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/admin/dashboard', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const inTransit = await Order.countDocuments({ status: 'shipped' });
    const delivered = await Order.countDocuments({ status: 'delivered' });
    const totalClients = await Client.countDocuments();
    const totalCities = await City.countDocuments();

    const newClientOrdersCount = await Order.countDocuments({ newOrderAlert: true, origin: 'client' });
    const newDemandsCount = await Demand.countDocuments({ newRequestAlert: true });
    let adminNotification = null;
    let notifications = [];
    let notificationCount = 0;

    if (newClientOrdersCount > 0) {
      const newestOrder = await Order.findOne({ newOrderAlert: true, origin: 'client' })
        .sort({ createdAt: -1 })
        .populate('client fromCity toCity')
        .lean();

      if (newestOrder) {
        adminNotification = {
          count: newClientOrdersCount,
          orderNumber: newestOrder.orderNumber,
          senderName: newestOrder.senderName || (newestOrder.client ? newestOrder.client.name : 'Client'),
          message: `Nouvelle commande client #${newestOrder.orderNumber} de ${newestOrder.senderName || (newestOrder.client ? newestOrder.client.name : 'client')}`,
          date: newestOrder.createdAt ? newestOrder.createdAt.toLocaleString('fr-FR') : '',
        };

        notifications.push({
          icon: '📦',
          title: `Nouvelle commande client (${adminNotification.count})`,
          message: adminNotification.message,
          date: adminNotification.date,
          href: '/orders',
        });
        notificationCount += newClientOrdersCount;
      }

      await Order.updateMany({ newOrderAlert: true, origin: 'client' }, { newOrderAlert: false });
    }

    if (newDemandsCount > 0) {
      const newestDemand = await Demand.findOne({ newRequestAlert: true })
        .sort({ createdAt: -1 })
        .populate('client')
        .lean();

      if (newestDemand) {
        const fullName = `${newestDemand.firstName || ''} ${newestDemand.lastName || ''}`.trim() || 'Client';
        notifications.push({
          icon: '📝',
          title: `Nouvelle demande client (${newDemandsCount})`,
          message: `Nouvelle demande de ${fullName} pour ${newestDemand.destination}`,
          date: newestDemand.createdAt ? new Date(newestDemand.createdAt).toLocaleString('fr-FR') : '',
          href: '/demandes',
        });
        notificationCount += newDemandsCount;
      }

      await Demand.updateMany({ newRequestAlert: true }, { newRequestAlert: false });
    }

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('client fromCity toCity');

    res.render('admin', {
      title: 'Espace Admin - Statistiques',
      direction: req.query.direction || 'MA-FR',
      totalOrders,
      inTransit,
      delivered,
      totalClients,
      totalCities,
      recentOrders,
      adminNotification,
      notifications,
      notificationCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/track', async (req, res, next) => {
  try {
    const code = (req.query.code || '').trim();
    if (!code) {
      if (req.xhr || req.query.ajax === 'true') {
        return res.json({ success: false, error: 'Code de suivi requis.' });
      }
      return res.redirect('/');
    }

    const searchFilter = { trackingCode: code };

    const order = await Order.findOne(searchFilter)
      .populate('client')
      .populate('fromCity')
      .populate('toCity');

    if (req.xhr || req.query.ajax === 'true') {
      if (!order) {
        return res.json({ success: false, error: 'Colis introuvable.' });
      }
      return res.json({
        success: true,
        localisation: order.localisation || 'En cours de traitement',
        status: order.status,
        trackingCode: order.trackingCode,
        receiverName: order.receiverName,
        createdAt: order.createdAt,
        direction: order.direction,
      });
    }

    if (order) {
      return res.redirect(`/?tracked=1&code=${encodeURIComponent(code)}`);
    }
    return res.redirect(`/?tracked=0&code=${encodeURIComponent(code)}`);
  } catch (err) {
    if (req.xhr || req.query.ajax === 'true') {
      return res.status(500).json({ success: false, error: 'Erreur serveur.' });
    }
    next(err);
  }
});

module.exports = router;
