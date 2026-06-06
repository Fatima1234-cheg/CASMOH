const express = require('express');
const router = express.Router();
const { ensureAuth, ensureAdmin } = require('../middleware/auth');
const backup = require('../controllers/backupController');

router.get('/export', ensureAuth, backup.backup);
router.post('/import', ensureAuth, backup.uploader.single('file'), backup.restore);
router.post('/reset', ensureAuth, ensureAdmin, backup.resetAll);

module.exports = router;
