module.exports.ensureAuth = (req, res, next) => {
  console.log('[AUTH] Vérification auth pour:', req.path, '- Session user:', req.session?.user?.id);
  if (req.session && req.session.user) return next();
  
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                 (req.headers.accept && req.headers.accept.includes('application/json'));
  
  if (isAjax) {
    console.log('[AUTH] Requête AJAX non authentifiée');
    return res.status(401).json({ error: 'Non authentifié' });
  }
  console.log('[AUTH] Redirection vers login');
  return res.redirect('/auth/login');
};

module.exports.ensureAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.type === 'admin') {
    return next();
  }
  console.log('[AUTH] Accès admin refusé pour:', req.path, '- Utilisateur:', req.session?.user?.id);
  return res.status(403).render('error', { title: 'Accès refusé', error: 'Accès réservé aux administrateurs' });
};

module.exports.ensureClient = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.type === 'client') {
    return next();
  }
  console.log('[AUTH] Accès client refusé pour:', req.path, '- Utilisateur:', req.session?.user?.id);
  return res.status(403).render('error', { title: 'Accès refusé', error: 'Accès réservé aux clients' });
};

module.exports.ensureGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.path === '/register') {
      return next();
    }
    if (req.session.user.type === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/client-dashboard');
  }
  next();
};

