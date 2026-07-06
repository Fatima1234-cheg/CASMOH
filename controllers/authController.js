const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Client = require('../models/Client');
const Order = require('../models/Order');
const Counter = require('../models/Counter');

function destroySessionAndRedirect(req, res, redirectTo = '/') {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect(redirectTo);
  });
}

exports.loginForm = (req, res) => {
  res.render('auth/login', { title: 'Connexion', errors: [], old: {} });
};

exports.loginValidators = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe requis'),
];

exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(422)
      .render('auth/login', { title: 'Connexion', errors: errors.array(), old: req.body });
  }
  try {
    let user = await Admin.findOne({ email: req.body.email.toLowerCase().trim() });
    let userType = 'admin';
    let userName = user ? user.fullname : null;

    if (!user) {
      user = await Client.findOne({ email: req.body.email.toLowerCase().trim() });
      if (user) {
        // If the email matches the configured admin email, treat as admin even if stored as client
        const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
        const isAdminEmail = adminEmail && adminEmail === user.email;
        userType = isAdminEmail ? 'admin' : user.role === 'admin' ? 'admin' : 'client';
        userName = user.name;
      }
    }

    if (!user) {
      return res
        .status(401)
        .render('auth/login', { title: 'Connexion', errors: [{ msg: 'Identifiants invalides' }], old: req.body });
    }

    const ok = await user.comparePassword(req.body.password);
    if (!ok) {
      return res
        .status(401)
        .render('auth/login', { title: 'Connexion', errors: [{ msg: 'Identifiants invalides' }], old: req.body });
    }

    req.session.user = { id: user._id, email: user.email, name: userName, type: userType };
    // Redirect based on user type
    if (userType === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    res.redirect('/client-dashboard');
  } catch (err) {
    next(err);
  }
};
// controllers/authController.js

exports.registerForm = (req, res) => {
  res.render('auth/register', { title: 'Inscription', errors: [], old: {} });
};

exports.registerValidators = [
  body('fullname').notEmpty().withMessage('Le nom est requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe trop court (min 6 caractères)'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password)
    .withMessage('Les mots de passe ne correspondent pas')
];

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Inscription',
      errors: errors.array(),
      old: req.body
    });
  }

  try {
    // Vérifier si l'email est déjà utilisé par un client ou un admin
    const email = req.body.email.toLowerCase().trim();
    const existingClient = await Client.findOne({ email });
    const existingAdmin = await Admin.findOne({ email });
    if (existingClient || existingAdmin) {
      return res.render('auth/register', {
        title: 'Inscription',
        errors: [{ msg: 'Cet email est déjà utilisé' }],
        old: req.body
      });
    }

    // Si c'est l'email admin unique défini en .env, créer l'admin et le connecter
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    if (adminEmail && email === adminEmail) {
      const admin = new Admin({
        fullname: req.body.fullname,
        email,
        password: req.body.password
      });
      await admin.save();

      const client = new Client({
        name: req.body.fullname,
        email,
        password: req.body.password,
        role: 'admin',
        phone: req.body.phone && req.body.phone.trim() ? req.body.phone.trim() : undefined
      });
      await client.save();

      req.session.user = { id: admin._id, email: admin.email, name: admin.fullname, type: 'admin' };
      return res.redirect('/admin/dashboard');
    }

    // Créer le client (le mot de passe sera haché par le modèle Client)
    const client = new Client({
      name: req.body.fullname,
      email,
      password: req.body.password,
      phone: req.body.phone && req.body.phone.trim() ? req.body.phone.trim() : undefined
    });
    await client.save();

    // Connecter automatiquement le client
    req.session.user = { id: client._id, email: client.email, name: client.name, type: 'client' };
    res.redirect('/client-dashboard');
  } catch (error) {
    console.error(error);
    res.render('auth/register', {
      title: 'Inscription',
      errors: [{ msg: 'Erreur lors de l\'inscription' }],
      old: req.body
    });
  }
};
exports.logout = (req, res) => {
  destroySessionAndRedirect(req, res, '/');
};

const RESET_SECURITY_CODE = '12345@';

exports.resetOrders = async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim();

    if (!code) {
      return res.status(400).json({ success: false, error: 'Veuillez saisir le code' });
    }

    if (code !== RESET_SECURITY_CODE) {
      return res.status(403).json({ success: false, error: 'Mot de passe incorrect' });
    }

    const ordersCount = await Order.countDocuments();
    if (!ordersCount) {
      return res.status(400).json({ success: false, error: 'Aucune commande à supprimer' });
    }

    await Order.deleteMany({});
    await Counter.updateMany({}, { $set: { seq: 0 } });
    
    // Si c'est une requête AJAX (fetch)
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, message: 'Vos commandes sont supprimées' });
    }
    
    const redirectTo = req.get('referer') || '/admin/dashboard';
    res.redirect(redirectTo);
  } catch (error) {
    next(error);
  }
};
