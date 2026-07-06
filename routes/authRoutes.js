const express = require('express');
const router = express.Router();
const { ensureAuth, ensureAdmin, ensureGuest } = require('../middleware/auth'); // adaptez si nécessaire
const auth = require('../controllers/authController');
const passport = require('passport');

// Route GET /auth/register
router.get('/register', ensureGuest, auth.registerForm);

// Route POST /auth/register
router.post('/register', ensureGuest, auth.registerValidators, auth.register);

// Route GET /auth/login
router.get('/login', auth.loginForm);

// Route POST /auth/login
router.post('/login', auth.loginValidators, auth.login);

// Route POST /auth/logout
router.post('/logout', auth.logout);
router.post('/reset-orders', ensureAuth, ensureAdmin, auth.resetOrders);

// Google OAuth
router.get('/google', ensureGuest, (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).render('error', { title: 'Erreur', error: 'Google OAuth non configuré' });
  }
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).render('error', { title: 'Erreur', error: 'Google OAuth non configuré' });
  }
  passport.authenticate('google', { failureRedirect: '/auth/login' })(req, res, (err) => {
    if (err) return next(err);
    if (req.user) {
      req.session.user = { id: req.user._id, email: req.user.email, name: req.user.fullname, type: 'admin' };
    }
    res.redirect('/admin/dashboard');
  });
});

// Facebook OAuth
router.get('/facebook', ensureGuest, (req, res, next) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return res.status(501).render('error', { title: 'Erreur', error: 'Facebook OAuth non configuré' });
    }
  return passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});
router.get('/facebook/callback', (req, res, next) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return res.status(501).render('error', { title: 'Erreur', error: 'Facebook OAuth non configuré' });
  }
  passport.authenticate('facebook', { failureRedirect: '/auth/login' })(req, res, (err) => {
    if (err) return next(err);
    if (req.user) {
      req.session.user = { id: req.user._id, email: req.user.email, name: req.user.fullname, type: 'admin' };
    }
    res.redirect('/admin/dashboard');
  });
});

module.exports = router;
