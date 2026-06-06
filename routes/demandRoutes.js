const express = require('express');
const router = express.Router();
const { ensureAdmin, ensureClient } = require('../middleware/auth');
const demandController = require('../controllers/demandController');

router.get('/', ensureAdmin, demandController.list);
router.post('/', ensureClient, demandController.validators, demandController.create);
router.post('/reset-all', ensureAdmin, demandController.deleteAll);
router.post('/delete-all', ensureAdmin, demandController.deleteAll);
router.patch('/:id/status', ensureAdmin, demandController.updateStatus);
router.delete('/:id', ensureAdmin, demandController.deleteOne);
router.post('/:id/delete', ensureAdmin, demandController.deleteOne);

module.exports = router;
