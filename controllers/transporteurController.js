const Transporteur = require('../models/Transporteur');

// Afficher la liste des transporteurs
exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // transporteurs par page
    const skip = (page - 1) * limit;

    const totalItems = await Transporteur.countDocuments();
    const transporteurs = await Transporteur.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    res.render('transporteur/list', {
      transporteurs,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur serveur');
  }
};
// Créer un transporteur
exports.create = async (req, res) => {
  try {
    const { nom, telephone, paysOrigine, paysDestination } = req.body;
    const transporteur = new Transporteur({ nom, telephone, paysOrigine, paysDestination });
    await transporteur.save();
    
    // Pour AJAX
    if (req.xhr || req.headers['content-type'] === 'application/json') {
      return res.json({ success: true, transporteur });
    }
    res.redirect('/transporteurs');
  } catch (error) {
    console.error(error);
    if (req.xhr || req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: 'Erreur lors de la création' });
    }
    res.status(500).send('Erreur lors de la création');
  }
};

// Mettre à jour un transporteur
exports.update = async (req, res) => {
  try {
    const { nom, telephone, paysOrigine, paysDestination } = req.body;
    const transporteur = await Transporteur.findByIdAndUpdate(
      req.params.id, 
      { nom, telephone, paysOrigine, paysDestination },
      { new: true, runValidators: true }
    );
    
    if (!transporteur) {
      return res.status(404).json({ error: 'Transporteur non trouvé' });
    }
    
    // Pour AJAX
    if (req.xhr || req.headers['content-type'] === 'application/json') {
      return res.json({ success: true, transporteur });
    }
    res.redirect('/transporteurs');
  } catch (error) {
    console.error(error);
    if (req.xhr || req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
    res.status(500).send('Erreur lors de la mise à jour');
  }
};

// Supprimer un transporteur
exports.delete = async (req, res) => {
  try {
    const transporteur = await Transporteur.findByIdAndDelete(req.params.id);
    
    if (!transporteur) {
      return res.status(404).json({ error: 'Transporteur non trouvé' });
    }
    
    // Pour AJAX
    if (req.xhr || req.headers['content-type'] === 'application/json') {
      return res.json({ success: true });
    }
    res.redirect('/transporteurs');
  } catch (error) {
    console.error(error);
    if (req.xhr || req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
    res.status(500).send('Erreur lors de la suppression');
  }
};