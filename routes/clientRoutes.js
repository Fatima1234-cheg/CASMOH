const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const clients = require('../controllers/clientController');

router.get('/', ensureAuth, clients.list);
router.get('/new', ensureAuth, clients.form);
router.get('/lookup-by-phone', ensureAuth, clients.lookupByPhone);
router.post('/', ensureAuth, clients.validators, clients.create);
router.get('/:id/edit', ensureAuth, clients.editForm);
router.put('/:id', ensureAuth, clients.validators, clients.update);
router.delete('/:id', ensureAuth, clients.remove);

module.exports = router;
