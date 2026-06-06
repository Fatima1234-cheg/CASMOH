const express = require('express');
const router = express.Router();
const transporteurController = require('../controllers/transporteurController');

// Routes principales
router.get('/', transporteurController.list);
router.post('/', transporteurController.create);
router.put('/:id', transporteurController.update);
router.delete('/:id', transporteurController.delete);

// Routes alternatives pour POST (si méthode PUT/DELETE ne fonctionne pas)
router.post('/:id/update', transporteurController.update);
router.post('/:id/delete', transporteurController.delete);

module.exports = router;