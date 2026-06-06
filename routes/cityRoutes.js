const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const cities = require('../controllers/cityController');

router.get('/', ensureAuth, cities.list);
router.post('/', ensureAuth, cities.validators, cities.create);
router.delete('/:id', ensureAuth, cities.remove);

module.exports = router;

