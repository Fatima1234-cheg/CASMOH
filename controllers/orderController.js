const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Client = require('../models/Client');
const City = require('../models/City');

async function generateOrderNumber() {
  const lastOrder = await Order.findOne().sort({ orderNumber: -1 });
  if (!lastOrder) return 1;
  // Convertir en entier de base 10
  const lastNumber = parseInt(lastOrder.orderNumber, 10);
  // Si la conversion échoue (NaN), repartir de 1
  return isNaN(lastNumber) ? 1 : lastNumber + 1;
}

function resolveDirectionConfig(direction, citiesMA, citiesFR) {
  const safeDirection = direction === 'FR-MA' ? 'FR-MA' : 'MA-FR';
  if (safeDirection === 'FR-MA') {
    return {
      direction: safeDirection,
      defaultDialSender: '+33',
      defaultDialReceiver: '+212',
      senderCities: citiesFR,
      receiverCities: citiesMA,
    };
  }
  return {
    direction: safeDirection,
    defaultDialSender: '+212',
    defaultDialReceiver: '+33',
    senderCities: citiesMA,
    receiverCities: citiesFR,
  };
}

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function buildClientAutocompleteData(clients) {
  if (!Array.isArray(clients) || !clients.length) {
    return [];
  }

  const orders = await Order.find()
    .select(
      'client senderName senderPhone senderCity receiverName receiverPhone receiverCity homeDelivery description weightKg paid paidAmount parcelsCount'
    )
    .sort({ createdAt: -1 })
    .lean();

  return clients.map((client) => {
    const clientId = client && client._id ? String(client._id) : '';
    const clientPhoneDigits = normalizeDigits(client && client.phone);
    const lastOrder = orders.find((order) => {
      const orderClientId = order && order.client ? String(order.client) : '';
      if (clientId && orderClientId && orderClientId === clientId) {
        return true;
      }
      if (!clientPhoneDigits) {
        return false;
      }
      return normalizeDigits(order && order.senderPhone) === clientPhoneDigits;
    });

    return {
      _id: client._id,
      name: client.name,
      phone: client.phone,
      city: client.city,
      address: client.address,
      senderName: client.name || '',
      senderCity: client.city || lastOrder?.senderCity || '',
      senderPhone: client.phone || lastOrder?.senderPhone || '',
      receiverName: lastOrder?.receiverName || '',
      receiverPhone: lastOrder?.receiverPhone || '',
      receiverCity: lastOrder?.receiverCity || '',
      homeDelivery:
        typeof lastOrder?.homeDelivery === 'boolean' ? lastOrder.homeDelivery : true,
      description: lastOrder?.description || '',
      weightKg:
        typeof lastOrder?.weightKg === 'number' && !Number.isNaN(lastOrder.weightKg)
          ? lastOrder.weightKg
          : '',
      paid: Boolean(lastOrder?.paid),
      paidAmount:
        typeof lastOrder?.paidAmount === 'number' && !Number.isNaN(lastOrder.paidAmount)
          ? lastOrder.paidAmount
          : 0,
      parcelsCount:
        typeof lastOrder?.parcelsCount === 'number' && !Number.isNaN(lastOrder.parcelsCount)
          ? lastOrder.parcelsCount
          : 1,
    };
  });
}

exports.list = async (req, res, next) => {
  try {
    // 1. Redirection des clients (ne doivent pas voir l'admin)
    if (req.session.user && req.session.user.type === 'client') {
      return res.redirect('/client-dashboard');
    }

    // 2. Récupération des paramètres de requête
    const direction = req.query.direction;
    const q = (req.query.q || '').trim();
    const from = req.query.from;
    const to = req.query.to;
    const location = req.query.location;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 3. Construction du filtre MongoDB
    const query = {};
    if (direction) {
      query.direction = direction;
    }
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { senderName: regex },
        { receiverName: regex },
        { senderPhone: regex },
        { receiverPhone: regex },
        { senderCity: regex },
        { receiverCity: regex },
        // conversion du champ orderNumber si la recherche est numérique
        isNaN(Number(q)) ? undefined : { orderNumber: Number(q) }
      ].filter(c => c !== undefined);
    }
    if (from || to) {
      query.createdAt = {};
      if (from) {
        query.createdAt.$gte = new Date(from);
      }
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        query.createdAt.$lte = d;
      }
    }
    if (location) {
      query.localisation = location;
    }

    // 4. Requêtes avec pagination
    const totalItems = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('client')
      .populate('fromCity')
      .populate('toCity')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    // 5. Rendu final (toujours avec pagination, même si une seule page)
    return res.render('orders/list', {
      title: 'Liste des commandes',
      orders,
      direction,
      q,
      from,
      to,
      location,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null
      }
    }, (err, html) => {
      if (err) {
        return next(err);
      }
      return res.send(html);
    });
  } catch (err) {
    return next(err);
  }
};

exports.bulkUpdateLocation = async (req, res, next) => {
  try {
    const { location, from, to, direction } = req.body || {};
    if (!location) {
      return res.status(400).json({ success: false, error: 'La localisation est requise.' });
    }
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'Une période complète est requise.' });
    }

    const query = {};
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Dates invalides.' });
    }

    toDate.setHours(23, 59, 59, 999);
    query.createdAt = { $gte: fromDate, $lte: toDate };

    if (direction) {
      query.direction = direction;
    }

    const result = await Order.updateMany(query, { localisation: String(location).trim() });
    return res.json({ success: true, modifiedCount: result.modifiedCount || 0 });
  } catch (err) {
    return next(err);
  }
};

// Dans orderController.js, assurez-vous que cette méthode existe
exports.getById = async (req, res, next) => {
  try {
    console.log('=== GET BY ID ===');
    console.log('Order ID:', req.params.id);
    
    const order = await Order.findById(req.params.id)
      .populate('client')
      .populate('fromCity')
      .populate('toCity')
      .lean();
      
    if (!order) {
      console.log('Order not found');
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    if (req.session.user && req.session.user.type === 'client') {
      const clientId = order.client && order.client._id ? order.client._id.toString() : (order.client ? order.client.toString() : null);
      if (!clientId || clientId !== String(req.session.user.id)) {
        console.log('[ORDER] Client access denied for order', req.params.id);
        return res.status(403).json({ error: 'Accès refusé' });
      }
    }
    
    console.log('Order found:', order.orderNumber);
    const orderDetails = {
      _id: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      senderName: order.senderName,
      senderPhone: order.senderPhone,
      senderCity: order.senderCity,
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverCity: order.receiverCity,
      direction: order.direction,
      parcelsCount: order.parcelsCount || 1,
      status: order.status,
      fromCity: order.fromCity,
      toCity: order.toCity,
    };
    res.json(orderDetails);
  } catch (err) {
    console.error('Error in getById:', err.message);
    return next(err);
  }
};

exports.createForm = async (req, res, next) => {
  try {
    console.log('DEBUG: createForm called with query:', req.query);
    const clients = await Client.find().sort({ name: 1 });
    const clientsAutocomplete = await buildClientAutocompleteData(clients);
    const citiesMA = await City.find({ country: 'Morocco' }).sort({ name: 1 });
    const citiesFR = await City.find({ country: 'France' }).sort({ name: 1 });
    const nextNumber = await generateOrderNumber();
    const direction = req.query.direction || 'MA-FR';
    console.log('DEBUG: direction from query:', direction);
    const {
      direction: safeDirection,
      defaultDialSender,
      defaultDialReceiver,
      senderCities,
      receiverCities,
    } = resolveDirectionConfig(direction, citiesMA, citiesFR);
    res.render('orders/form', {
      title: 'Ajouter une commande',
      action: '/orders',
      method: 'POST',
      order: { orderNumber: nextNumber },
      clients,
      clientsAutocomplete,
      citiesMA,
      citiesFR,
      senderCities,
      receiverCities,
      direction: safeDirection,
      errors: [],
      defaultDialSender,
      defaultDialReceiver,
    });
    console.log('DEBUG: senderCities length:', senderCities.length);
    console.log('DEBUG: first few senderCities:', senderCities.slice(0, 3).map(c => c.name));
  } catch (err) {
    return next(err);
  }
};

exports.validators = [
  body('orderNumber').optional().isInt({ min: 1 }),
  body('senderName').trim().notEmpty().withMessage('Nom expéditeur requis'),
  body('senderPhone').trim().notEmpty().withMessage('Téléphone expéditeur requis'),
  body('senderCity').trim().notEmpty().withMessage('Ville expéditeur requise'),
  body('receiverName').trim().notEmpty().withMessage('Nom destinataire requis'),
  body('receiverPhone').trim().notEmpty().withMessage('Téléphone destinataire requis'),
  body('receiverCity').trim().notEmpty().withMessage('Ville destinataire requise'),
  body('parcelsCount').optional().isInt({ min: 1 }),
  body('description').optional().trim(),
  body('paidAmount').optional().isFloat({ min: 0 }),
  body('weightKg').optional().isFloat({ min: 0 }),
  body('price').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['pending', 'shipped', 'delivered']).withMessage('Statut invalide'),
];
exports.create = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    try {
      const clients = await Client.find().sort({ name: 1 });
      const clientsAutocomplete = await buildClientAutocompleteData(clients);
      const citiesMA = await City.find({ country: 'Morocco' }).sort({ name: 1 });
      const citiesFR = await City.find({ country: 'France' }).sort({ name: 1 });
      const direction = req.body.direction || 'MA-FR';
      const {
        direction: safeDirection,
        defaultDialSender,
        defaultDialReceiver,
        senderCities,
        receiverCities,
      } = resolveDirectionConfig(direction, citiesMA, citiesFR);
      return res.status(422).render('orders/form', {
        title: 'Ajouter une commande',
        action: '/orders',
        method: 'POST',
        order: req.body,
        clients,
        clientsAutocomplete,
        citiesMA,
        citiesFR,
        senderCities,
        receiverCities,
        direction: safeDirection,
        defaultDialSender,
        defaultDialReceiver,
        errors: errors.array(),
      });
    } catch (e) {
      return next(e);
    }
  }
  try {
    let orderNumber = parseInt(req.body.orderNumber, 10);
    if (!orderNumber || Number.isNaN(orderNumber)) {
      orderNumber = await generateOrderNumber();
    }
    const photos = [];
    if (req.files && req.files.length) {
      const base = '/public/uploads/orders/';
      req.files.forEach(f => photos.push(base + f.filename));
    }
    const orderData = {
      orderNumber,
      senderName: req.body.senderName?.trim(),
      senderPhone: req.body.senderPhone?.trim(),
      senderCity: req.body.senderCity?.trim(),
      senderAddress: req.body.senderAddress?.trim() || '',
      receiverName: req.body.receiverName?.trim(),
      receiverPhone: req.body.receiverPhone?.trim(),
      receiverCity: req.body.receiverCity?.trim(),
      receiverAddress: req.body.receiverAddress?.trim() || '',
      homeDelivery: req.body.homeDelivery === 'true' || req.body.homeDelivery === true,
      description: req.body.description?.trim(),
      weightKg: req.body.weightKg ? Number(req.body.weightKg) : undefined,
      price: req.body.price ? Number(req.body.price) : undefined,
      paid: req.body.paid === 'true' || req.body.paid === true,
      paidAmount: req.body.paidAmount ? Number(req.body.paidAmount) : 0,
      parcelsCount: req.body.parcelsCount ? Number(req.body.parcelsCount) : 1,
      dimensions: req.body.dimensions?.trim() || '',
      localisation: req.body.localisation?.trim() || undefined,
      photos,
      status: 'pending',
      direction: req.body.direction === 'FR-MA' ? 'FR-MA' : 'MA-FR',
    };

    if (req.session.user && (req.session.user.type === 'client' || req.session.user.role === 'client')) {
      orderData.client = req.session.user.id;
      orderData.origin = 'client';
      orderData.newOrderAlert = true;
    } else if (req.body.client && req.body.client.trim()) {
      orderData.client = req.body.client.trim();
    }

    await Order.create(orderData);
    
    // ========== REDIRECTION ROBUSTE POUR CLIENTS ==========
    const user = req.session.user;
    let isClient = false;
    
    if (user) {
      // Vérifier plusieurs champs possibles
      const userType = (user.type || user.role || '').toString().toLowerCase();
      if (userType === 'client') {
        isClient = true;
      }
      // Si isAdmin est explicitement false, c'est aussi un client
      if (user.isAdmin === false) {
        isClient = true;
      }
    }
    
    if (isClient) {
      console.log(`[ORDER] Client ${user.id} → redirection vers /client-dashboard`);
      return res.redirect('/client-dashboard?success=1');
    }
    
    console.log(`[ORDER] Utilisateur (type: ${user ? (user.type || user.role) : 'none'}) → redirection vers /orders`);
    return res.redirect(`/orders?direction=${encodeURIComponent(orderData.direction || 'MA-FR')}`);
    // ========== FIN CORRECTION ==========
    
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Numéro de commande déjà utilisé';
    }
    return next(err);
  }
};
// Exemple dans votre contrôleur (ordersController.js)
exports.newOrderForm = (req, res) => {
  const direction = req.query.direction || 'MA-FR'; // valeur par défaut

  // Calculer les indicatifs selon la direction
  let defaultDialSender, defaultDialReceiver;
  if (direction === 'MA-FR') {
    defaultDialSender = '+212';   // Maroc
    defaultDialReceiver = '+33';   // France
  } else {
    defaultDialSender = '+33';     // France
    defaultDialReceiver = '+212';  // Maroc
  }

  res.render('orders/form', {
    order: null, // ou un objet vide si création
    direction: direction,
    defaultDialSender: defaultDialSender,
    defaultDialReceiver: defaultDialReceiver,
    // autres données nécessaires (villes, clients, etc.)
  });
};
exports.editForm = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.redirect('/orders');
    const clients = await Client.find().sort({ name: 1 });
    const clientsAutocomplete = await buildClientAutocompleteData(clients);
    const citiesMA = await City.find({ country: 'Morocco' }).sort({ name: 1 });
    const citiesFR = await City.find({ country: 'France' }).sort({ name: 1 });
    const direction = order.direction || 'MA-FR';
    const {
      direction: safeDirection,
      defaultDialSender,
      defaultDialReceiver,
      senderCities,
      receiverCities,
    } = resolveDirectionConfig(direction, citiesMA, citiesFR);
    res.render('orders/form', {
      title: 'Modifier la commande',
      action: `/orders/${order._id}?_method=PUT`,
      method: 'POST',
      order,
      clients,
      clientsAutocomplete,
      citiesMA,
      citiesFR,
      senderCities,
      receiverCities,
      direction: safeDirection,
      defaultDialSender,
      defaultDialReceiver,
      errors: [],
    });
  } catch (err) {
    return next(err);
  }
};

exports.updateDashboard = async (req, res, next) => {
  try {
    console.log('=== DASHBOARD UPDATE REQUEST ===');
    console.log('Order ID:', req.params.id);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    if (!req.params.id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    const updateData = {};
    
    // Mettre à jour les champs non-vides
    if (req.body.senderName) { 
      updateData.senderName = String(req.body.senderName).trim();
    }
    if (req.body.receiverName) { 
      updateData.receiverName = String(req.body.receiverName).trim();
    }
    if (req.body.senderCity) { 
      updateData.senderCity = String(req.body.senderCity).trim();
    }
    if (req.body.receiverCity) { 
      updateData.receiverCity = String(req.body.receiverCity).trim();
    }
    if (req.body.status) { 
      updateData.status = String(req.body.status).trim();
    }
    if (req.body.paid !== undefined) { 
      updateData.paid = req.body.paid === true || req.body.paid === 'true';
    }
    if (req.body.paidAmount !== undefined) { 
      updateData.paidAmount = Number(req.body.paidAmount) || 0;
    }
    if (req.body.description !== undefined) { 
      updateData.description = String(req.body.description).trim() || '';
    }
    if (req.body.weightKg !== undefined) { 
      updateData.weightKg = Number(req.body.weightKg) || undefined;
    }
    
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Effectuer la mise à jour
    const result = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!result) {
      console.log('Order not found:', req.params.id);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log('Dashboard update successful');
    return res.json({ success: true, order: result });
    
  } catch (err) {
    console.error('=== DASHBOARD UPDATE ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    return res.status(500).json({ 
      error: err.message,
      success: false
    });
  }
};

exports.update = async (req, res, next) => {
  try {
    console.log('=== FORM UPDATE REQUEST ===');
    console.log('Order ID:', req.params.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      try {
        const order = { ...req.body, _id: req.params.id };
        const clients = await Client.find().sort({ name: 1 });
        const clientsAutocomplete = await buildClientAutocompleteData(clients);
        const citiesMA = await City.find({ country: 'Morocco' }).sort({ name: 1 });
        const citiesFR = await City.find({ country: 'France' }).sort({ name: 1 });
        return res.status(422).render('orders/form', {
          title: 'Modifier la commande',
          action: `/orders/${req.params.id}?_method=PUT`,
          method: 'POST',
          order,
          clients,
          clientsAutocomplete,
          citiesMA,
          citiesFR,
          errors: errors.array(),
          defaultDialSender: '+212',
          defaultDialReceiver: '+33',
          direction: 'MA-FR'
        });
      } catch (e) {
        return next(e);
      }
    }
    
    const updateData = {
      senderName: req.body.senderName?.trim(),
      senderPhone: req.body.senderPhone?.trim(),
      senderCity: req.body.senderCity?.trim(),
      senderAddress: req.body.senderAddress?.trim() || '',
      receiverName: req.body.receiverName?.trim(),
      receiverPhone: req.body.receiverPhone?.trim(),
      receiverCity: req.body.receiverCity?.trim(),
      receiverAddress: req.body.receiverAddress?.trim() || '',
      homeDelivery: req.body.homeDelivery === 'true' || req.body.homeDelivery === true,
      description: req.body.description?.trim(),
      weightKg: req.body.weightKg ? Number(req.body.weightKg) : undefined,
      price: req.body.price ? Number(req.body.price) : undefined,
      paid: req.body.paid === 'true' || req.body.paid === true,
      paidAmount: req.body.paidAmount ? Number(req.body.paidAmount) : 0,
      parcelsCount: req.body.parcelsCount ? Number(req.body.parcelsCount) : 1,
      dimensions: req.body.dimensions?.trim() || '',
      localisation: req.body.localisation?.trim() || undefined,
      status: req.body.status,
    };
    
    if (req.files && req.files.length) {
      const base = '/public/uploads/orders/';
      const photos = [];
      req.files.forEach(f => photos.push(base + f.filename));
      updateData.photos = photos;
    }
    
    await Order.findByIdAndUpdate(req.params.id, updateData, { runValidators: false });
    res.redirect('/orders');
  } catch (err) {
    console.error('=== FORM UPDATE ERROR ===');
    console.error('Error message:', err.message);
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    console.log('=== DELETE REQUEST ===');
    console.log('Order ID to delete:', req.params.id);
    
    if (!req.params.id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    const result = await Order.findByIdAndDelete(req.params.id);
    
    if (!result) {
      console.log('Order not found:', req.params.id);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log('Delete successful');
    
    // Retourner JSON pour AJAX
    return res.json({ success: true });
    
  } catch (err) {
    console.error('=== DELETE ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    // Toujours retourner JSON en cas d'erreur
    return res.status(500).json({ 
      error: err.message,
      success: false
    });
  }
};
