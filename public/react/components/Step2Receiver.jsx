import React, { useState } from 'react';
import { useForm } from '../contexts/FormContext';
import {
  createWhatsAppHandler,
  WHATSAPP_MESSAGE_TYPES,
  generateConfirmationMessage,
  generateReceiverNotificationMessage,
} from '../utils/whatsappUtils';
import CountryFlag, { getCountryFlag, getCountryName, getDirectionFlags } from './CountryFlag';

/**
 * Step 2 Component - Receiver Information
 * 
 * Collects:
 * - Receiver name
 * - Receiver city
 * - Receiver phone
 * 
 * Features:
 * - Display sender info from Step 1
 * - WhatsApp integration:
 *   - Confirmation message to sender
 *   - Receiver notification with full data (including step 3)
 */
export function Step2Receiver({ cities = [], onNext, onBack }) {
  const { formData, updateField, updateFields, errors, nextStep, previousStep } = useForm();
  const [cities_list] = useState(cities);
  const [showPhonePreview, setShowPhonePreview] = useState(false);

  // Validate Step 2 data
  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.receiverName?.trim()) {
      newErrors.receiverName = 'Veuillez entrer le nom du destinataire';
    }

    if (!formData.receiverCity?.trim()) {
      newErrors.receiverCity = 'Veuillez sélectionner une ville';
    }

    if (!formData.receiverPhone?.trim()) {
      newErrors.receiverPhone = 'Veuillez entrer le numéro du destinataire';
    } else if (!/^[\d\s\-\+\(\)]{8,}$/.test(formData.receiverPhone.replace(/\s/g, ''))) {
      newErrors.receiverPhone = 'Format de téléphone invalide';
    }

    return newErrors;
  };

  const handleCityChange = (e) => {
    const selectedCity = cities_list.find(c => c.name === e.target.value);
    if (selectedCity) {
      updateFields({
        receiverCity: selectedCity.name,
        receiverCountry: selectedCity.country === 'France' ? '+33' : '+212',
      });
    }
  };

  const handleNext = () => {
    if (nextStep(validateStep2)) {
      if (onNext) onNext();
    }
  };

  const handleBack = () => {
    previousStep();
    if (onBack) onBack();
  };

  const handleSenderConfirmationWhatsApp = createWhatsAppHandler({
    messageType: WHATSAPP_MESSAGE_TYPES.CONFIRMATION,
    formData,
  });

  const handleReceiverWhatsApp = createWhatsAppHandler({
    messageType: WHATSAPP_MESSAGE_TYPES.RECEIVER_NOTIFICATION,
    formData,
  });

  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-icon">📦</div>
        <h2>Destinataire</h2>
        <p>Informations sur le destinataire</p>
      </div>

      {/* Sender Info Summary */}
      <div className="info-summary sender-summary">
        <h3 className="summary-title">📤 Récapitulatif Expéditeur</h3>
        <div className="summary-content">
          <div className="summary-item">
            <span className="label">Nom:</span>
            <span className="value">{formData.senderName}</span>
          </div>
          <div className="summary-item">
            <span className="label">Numéro de colis:</span>
            <span className="value badge">{formData.orderNumber}</span>
          </div>
          <div className="summary-item">
            <span className="label">Direction:</span>
            <span className="value badge">
              {getDirectionFlags(formData.direction)}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-whatsapp-summary"
          onClick={handleSenderConfirmationWhatsApp}
          disabled={!formData.senderPhone}
        >
          Envoyer confirmation WhatsApp a l'expediteur
        </button>
      </div>

      <form className="step-form" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
        
        {/* Receiver Name */}
        <div className="form-group">
          <label htmlFor="receiverName">
            Nom Complet du Destinataire <span className="label-ar">(الاسم الكامل للمستقبل)</span>
          </label>
          <input
            id="receiverName"
            type="text"
            value={formData.receiverName}
            onChange={(e) => updateField('receiverName', e.target.value)}
            placeholder="Ex: Mohamed Karim"
            className={`form-control ${errors.receiverName ? 'is-invalid' : ''}`}
            required
          />
          {errors.receiverName && <span className="error-message">{errors.receiverName}</span>}
        </div>

        {/* Receiver City */}
        <div className="form-group">
          <label htmlFor="receiverCity">
            Ville de Destination <span className="label-ar">(المدينة)</span>
          </label>
          <select
            id="receiverCity"
            value={formData.receiverCity}
            onChange={handleCityChange}
            className={`form-control ${errors.receiverCity ? 'is-invalid' : ''}`}
            required
          >
            <option value="">Sélectionnez une ville</option>
            {cities_list.map((city) => (
              <option key={city._id} value={city.name}>
                {getCountryFlag(city.country)} {city.name} ({getCountryName(city.country)})
              </option>
            ))}
          </select>
          {errors.receiverCity && <span className="error-message">{errors.receiverCity}</span>}
        </div>

        {/* Receiver Phone */}
        <div className="form-group">
          <label htmlFor="receiverPhone">
            Numéro de Téléphone <span className="label-ar">(رقم الهاتف)</span>
          </label>
          <div className="phone-input-group">
            <input
              id="receiverPhone"
              type="tel"
              value={formData.receiverPhone}
              onChange={(e) => updateField('receiverPhone', e.target.value)}
              placeholder={formData.receiverCountry === '+33' ? '+33 6XX XXX XXX' : '+212 6XX XXX XXX'}
              className={`form-control ${errors.receiverPhone ? 'is-invalid' : ''}`}
              required
            />
            {/* WhatsApp Button */}
            <button
              type="button"
              className="btn-whatsapp"
              onClick={handleReceiverWhatsApp}
              title="Envoyer un message WhatsApp au destinataire"
              disabled={!formData.receiverPhone}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-3.055 2.116-3.905 5.900-1.914 8.986 2.32 3.472 6.480 4.755 10.321 3.015 3.841-1.740 5.471-5.922 3.813-9.506-1.658-3.584-5.814-5.181-9.186-3.873M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0Z"/>
              </svg>
            </button>
          </div>
          {errors.receiverPhone && <span className="error-message">{errors.receiverPhone}</span>}
          <small className="form-text-muted">
            Inclure l'indicatif international (<CountryFlag code="MA" /> +212, <CountryFlag code="FR" /> +33)
          </small>
        </div>

        {/* WhatsApp Message Preview */}
        <div className="whatsapp-preview">
          <button
            type="button"
            className="preview-toggle"
            onClick={() => setShowPhonePreview(!showPhonePreview)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Aperçu du message WhatsApp
          </button>
          {showPhonePreview && (
            <div className="preview-box whatsapp-message">
              <div className="preview-content">
                <strong>Message de confirmation (expediteur):</strong>
                <p>{generateConfirmationMessage(formData)}</p>
                <strong>Message de notification (destinataire):</strong>
                <p>{generateReceiverNotificationMessage(formData)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="step-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBack}
          >
            ← Précédent
          </button>
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

export default Step2Receiver;
