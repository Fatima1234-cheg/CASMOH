const mongoose = require('mongoose');
const City = require('../models/City');

const moroccoCities = [
  'Safi', 'Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Tanger',
  'Agadir', 'Meknès', 'Oujda', 'Kenitra', 'Tetouan', 'Salé',
  'Nador', 'Beni Mellal', 'Mohammedia', 'Khouribga', 'El Jadida',
  'Taza', 'Settat', 'Larache', 'Khemisset', 'Guelmim', 'Inezgane',
  'Azrou', 'Sefrou', 'Benslimane', 'Martil', 'Berrechid', 'Fquih Ben Salah'
];

const franceCities = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes',
  'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes',
  'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble',
  'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Le Mans', 'Aix-en-Provence',
  'Clermont-Ferrand', 'Brest', 'Limoges', 'Tours', 'Amiens',
  'Metz', 'Besançon', 'Orléans', 'Mulhouse', 'Rouen', 'Caen',
  'Nancy', 'Saint-Denis', 'Argenteuil', 'Montreuil', 'Roubaix',
  'Dunkerque', 'Tourcoing', 'Nanterre', 'Créteil', 'Avignon',
  'Poitiers', 'Versailles', 'Courbevoie', 'Vitry-sur-Seine',
  'Colmar', 'Pau', 'La Rochelle', 'Beauvais', 'Calais', 'Valence'
];

async function seedCities() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/casmoh');

    // Clear existing cities
    await City.deleteMany({});

    // Add Morocco cities
    for (const cityName of moroccoCities) {
      await City.create({ name: cityName, country: 'Morocco' });
    }

    // Add France cities
    for (const cityName of franceCities) {
      await City.create({ name: cityName, country: 'France' });
    }

    console.log('Cities seeded successfully!');
    console.log(`Morocco cities: ${moroccoCities.length}`);
    console.log(`France cities: ${franceCities.length}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding cities:', error);
    process.exit(1);
  }
}

seedCities();