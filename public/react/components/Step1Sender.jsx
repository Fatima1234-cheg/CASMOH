import React, { useState } from 'react';
import { useForm } from '../contexts/FormContext';
import { getCountryFlag, getCountryName } from './CountryFlag';

/**
 * Step 1 Component - Sender Information
 * 
 * Collects:
 * - Order number
 * - Sender name
 * - Sender city
 * - Sender phone
 */
export function Step1Sender({ cities = [], onNext }) {
  const { formData, updateField, updateFields, errors, nextStep } = useForm();
  const [cities_list, setCities] = useState(cities);

  // Validate Step 1 data
  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.senderName?.trim()) {
      newErrors.senderName = 'Veuillez entrer votre nom';
    }

    if (!formData.senderCity?.trim()) {
      newErrors.senderCity = 'Veuillez sélectionner une ville';
    }

    if (!formData.senderPhone?.trim()) {
      newErrors.senderPhone = 'Veuillez entrer votre numéro de téléphone';
    } else if (!/^[\d\s\-\+\(\)]{8,}$/.test(formData.senderPhone.replace(/\s/g, ''))) {
      newErrors.senderPhone = 'Format de téléphone invalide';
    }

    return newErrors;
  };

  const handleCityChange = (e) => {
    const selectedCity = cities_list.find(c => c.name === e.target.value);
    if (selectedCity) {
      updateFields({
        senderCity: selectedCity.name,
        senderCountry: selectedCity.country === 'France' ? '+33' : '+212',
      });
    }
  };

  const handleNext = () => {
    if (nextStep(validateStep1)) {
      if (onNext) onNext();
    }
  };

  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-icon">👤</div>
        <h2>Expéditeur</h2>
        <p>Informations sur vous (l'expéditeur)</p>
      </div>

      <form className="step-form" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
        
        {/* Order Number - Read only */}
        <div className="form-group">
          <label htmlFor="orderNumber">Numéro de Colis</label>
          <input
            id="orderNumber"
            type="text"
            value={formData.orderNumber}
            readOnly
            className="form-control readonly"
            placeholder="Auto-généré"
          />
          <small className="form-text-muted">Généré automatiquement</small>
        </div>

        {/* Sender Name */}
        <div className="form-group">
          <label htmlFor="senderName">
            Nom Complet <span className="label-ar">(الاسم الكامل)</span>
          </label>
          <input
            id="senderName"
            type="text"
            value={formData.senderName}
            onChange={(e) => updateField('senderName', e.target.value)}
            placeholder="Ex: Ahmed Hassan"
            className={`form-control ${errors.senderName ? 'is-invalid' : ''}`}
            required
          />
          {errors.senderName && <span className="error-message">{errors.senderName}</span>}
        </div>

        {/* Sender City */}
        <div className="form-group">
          <label htmlFor="senderCity">
            Ville <span className="label-ar">(المدينة)</span>
          </label>
          <select
            id="senderCity"
            value={formData.senderCity}
            onChange={handleCityChange}
            className={`form-control ${errors.senderCity ? 'is-invalid' : ''}`}
            required
          >
            <option value="">Sélectionnez votre ville</option>
            {cities_list.map((city) => (
              <option key={city._id} value={city.name}>
                {getCountryFlag(city.country)} {city.name} ({getCountryName(city.country)})
              </option>
            ))}
          </select>
          {errors.senderCity && <span className="error-message">{errors.senderCity}</span>}
        </div>

        {/* Sender Phone */}
        <div className="form-group">
          <label htmlFor="senderPhone">
            Numéro de Téléphone <span className="label-ar">(رقم الهاتف)</span>
          </label>
          <input
            id="senderPhone"
            type="tel"
            value={formData.senderPhone}
            onChange={(e) => updateField('senderPhone', e.target.value)}
            placeholder={formData.senderCountry === '+33' ? '+33 6XX XXX XXX' : '+212 6XX XXX XXX'}
            className={`form-control ${errors.senderPhone ? 'is-invalid' : ''}`}
            required
          />
          {errors.senderPhone && <span className="error-message">{errors.senderPhone}</span>}
          <small className="form-text-muted">
            Inclure l'indicatif international (+212 pour Maroc, +33 pour France)
          </small>
        </div>

        {/* Navigation Buttons */}
        <div className="step-actions">
          <button
            type="submit"
            className="btn btn-primary"
          >
            Suivant →
          </button>
        </div>
      </form>
    </div>
  );
}

export default Step1Sender;
