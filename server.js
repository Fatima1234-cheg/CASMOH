const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.default || connectMongo.MongoStore || connectMongo;
const dotenv = require('dotenv');
const methodOverride = require('method-override');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { ensureAuth, ensureAdmin, ensureClient } = require('./middleware/auth');
const orderController = require('./controllers/orderController');
const {
  getCountryFlag,
  getCountryName,
  getCountryDisplay,
  getDirectionDisplay,
  getCountryPairDisplay,
} = require('./utils/countryDisplay');

dotenv.config();

const app = express(); // <-- Déclaration de app AVANT de l'utiliser

// ===== CORS CONFIGURATION =====
const isProduction = process.env.NODE_ENV === 'production';
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;
const envAllowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  ...(process.env.BASE_URL ? [process.env.BASE_URL] : []),
  ...envAllowedOrigins,
]);

const corsOptions = {
  origin: function(origin, callback) {
    // Same-origin / server-side requests (curl, Postman sans Origin)
    if (!origin) return callback(null, true);

    if (!isProduction && origin === 'null') {
      return callback(null, true);
    }

    // Dev mode: allow localhost origins (http/https, any port)
    if (!isProduction && localOriginPattern.test(origin)) {
      return callback(null, true);
    }

    // Prod (or explicit allow-list): only configured origins
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(cors(corsOptions));

// ===== MIDDLEWARES AJOUTÉS APRÈS LA DÉCLARATION DE app =====
// En développement local uniquement, on désactive HSTS.
// En production (Render/Railway/etc.), il faut laisser HTTPS fonctionner.
app.use((req, res, next) => {
  if (!isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=0');
  }
  next();
});

// Route pour favicon
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});
// ===== FIN DES MIDDLEWARES AJOUTÉS =====

// Database
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/casmoh';
mongoose
  .connect(MONGO_URI, { dbName: process.env.MONGO_DB || 'casmoh' })
  .then(async () => {
    console.log('MongoDB connected');

    try {
      const Order = require('./models/Order');
      const missingFilter = {
        $or: [{ trackingCode: { $exists: false } }, { trackingCode: null }, { trackingCode: '' }],
      };

      let processed = 0;
      while (true) {
        const batch = await Order.find(missingFilter).select('_id').limit(200).lean();
        if (!batch.length) break;

        for (const item of batch) {
          for (let attempt = 0; attempt < 6; attempt++) {
            const code = Order.generateTrackingCode();
            try {
              await Order.updateOne({ _id: item._id, ...missingFilter }, { $set: { trackingCode: code } });
              processed += 1;
              break;
            } catch (err) {
              if (err && err.code === 11000) {
                continue;
              }
              throw err;
            }
          }
        }
      }

      if (processed > 0) {
        console.log(`[TRACKING] trackingCode généré pour ${processed} colis existant(s).`);
      }
    } catch (err) {
      console.error('[TRACKING] Backfill trackingCode échoué:', err?.message || err);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static
app.use('/public', express.static(path.join(__dirname, 'public')));

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Security & performance - MODIFIÉ POUR LE DÉVELOPPEMENT
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }));
} else {
  // Désactiver CSP en développement pour permettre les requêtes AJAX
  console.log('⚠️  Development mode: CSP disabled for AJAX requests');
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
}

app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
});
app.use(limiter);

// Session
const SESSION_SECRET = process.env.SESSION_SECRET || 'change_this_in_env';
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      dbName: process.env.MONGO_DB || 'casmoh',
      collectionName: 'sessions',
      ttl: 7 * 24 * 60 * 60,
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());

const Admin = require('./models/Admin');
const Client = require('./models/Client');
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await Admin.findById(id);
    done(null, user);
  } catch (e) {
    done(e);
  }
});

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const HAS_GOOGLE = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const HAS_FACEBOOK = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);

if (HAS_GOOGLE) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails && profile.emails[0] && profile.emails[0].value) ? profile.emails[0].value.toLowerCase() : null;
          const name =
            profile.displayName ||
            [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ') ||
            'Utilisateur';
          const avatar = profile.photos && profile.photos[0] && profile.photos[0].value ? profile.photos[0].value : null;
          let user = await Admin.findOne({ provider: 'google', providerId: profile.id });
          if (!user && email) {
            user = await Admin.findOne({ email });
          }
          if (user) {
            user.provider = 'google';
            user.providerId = profile.id;
            if (!user.fullname && name) user.fullname = name;
            if (!user.avatar && avatar) user.avatar = avatar;
            await user.save();
          } else {
            user = await Admin.create({
              fullname: name,
              email: email || `no-email-${profile.id}@google.local`,
              provider: 'google',
              providerId: profile.id,
              avatar,
            });
          }

          if (email) {
            await Client.findOneAndUpdate(
              { email },
              { name, email },
              { upsert: true, setDefaultsOnInsert: true }
            );
          }

          done(null, user);
        } catch (e) {
          done(e);
        }
      }
    )
  );
}

if (HAS_FACEBOOK) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${BASE_URL}/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'emails', 'photos'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails && profile.emails[0] && profile.emails[0].value) ? profile.emails[0].value.toLowerCase() : null;
          const name = profile.displayName || 'Utilisateur';
          const avatar = profile.photos && profile.photos[0] && profile.photos[0].value ? profile.photos[0].value : null;
          let user = await Admin.findOne({ provider: 'facebook', providerId: profile.id });
          if (!user && email) {
            user = await Admin.findOne({ email });
          }
          if (user) {
            user.provider = 'facebook';
            user.providerId = profile.id;
            if (!user.fullname && name) user.fullname = name;
            if (!user.avatar && avatar) user.avatar = avatar;
            await user.save();
          } else {
            user = await Admin.create({
              fullname: name,
              email: email || `no-email-${profile.id}@facebook.local`,
              provider: 'facebook',
              providerId: profile.id,
              avatar,
            });
          }

          if (email) {
            await Client.findOneAndUpdate(
              { email },
              { name, email },
              { upsert: true, setDefaultsOnInsert: true }
            );
          }

          done(null, user);
        } catch (e) {
          done(e);
        }
      }
    )
  );
}

// Locals for views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.title = '';
  res.locals.errors = [];
  res.locals.old = {};
  res.locals.oauth = { google: HAS_GOOGLE, facebook: HAS_FACEBOOK };
  res.locals.countryFlag = getCountryFlag;
  res.locals.countryName = getCountryName;
  res.locals.countryDisplay = getCountryDisplay;
  res.locals.directionDisplay = getDirectionDisplay;
  res.locals.countryPairDisplay = getCountryPairDisplay;
  next();
});

// Routes
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const clientRoutes = require('./routes/clientRoutes');
const cityRoutes = require('./routes/cityRoutes');
const backupRoutes = require('./routes/backupRoutes');
const transporteurRoutes = require('./routes/transporteurs');
const exportRoutes = require('./routes/exportRoutes');
const demandRoutes = require('./routes/demandRoutes');


app.get('/', (req, res) => {
  return res.render('home', { title: 'Accueil', navActive: 'home' });
});

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/transporteurs', ensureAuth, ensureAdmin, transporteurRoutes);
app.get('/orders/details/:id', ensureAuth, orderController.getById);
app.use('/orders', ensureAuth, orderRoutes);
app.use('/clients', ensureAuth, ensureAdmin, clientRoutes);
app.use('/cities', ensureAuth, ensureAdmin, cityRoutes);
app.use('/demandes', ensureAuth, demandRoutes);
app.use('/backup', ensureAuth, ensureAdmin, backupRoutes);
app.use('/export', ensureAuth, ensureAdmin, exportRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page non trouvée',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                 (req.headers.accept && req.headers.accept.includes('application/json')) ||
                 req.headers['content-type']?.includes('application/json');
  
  if (isAjax) {
    return res.status(status).json({ error: err.message || 'Server error' });
  }
  res.status(status).render('error', {
    title: 'Erreur',
    error: err.message || 'Erreur du serveur',
  });
});

// Seed admin if none exists
async function seedAdmin() {
  const count = await Admin.countDocuments();
  if (count === 0) {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (email && password) {
      await Admin.create({ email, password });
      console.log('Admin user created from env email:', email);
    } else {
      console.log(
        'No admin user exists. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to seed one.'
      );
    }
  }
}
seedAdmin().catch(console.error);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CASMOH SARL running at http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️  CSP disabled for development - AJAX requests allowed');
  }
});
