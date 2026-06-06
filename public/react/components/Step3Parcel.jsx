import React, { useState, useRef } from 'react';
import { useForm } from '../contexts/FormContext';
import {
  createWhatsAppHandler,
  WHATSAPP_MESSAGE_TYPES,
  generateStep3Message,
} from '../utils/whatsappUtils';
import CountryFlag, { getDirectionFlags } from './CountryFlag';

/**
 * Step 3 Component - Parcel Information
 * 
 * Collects:
 * - Parcel image
 * - Number of parcels
 * - Additional notes
 * 
 * Features:
 * - Display full order summary (Steps 1 & 2)
 * - Image upload with preview
 * - WhatsApp integration with full details
 * - Message includes all parcel information
 */
export function Step3Parcel({ onBack, onSubmit }) {
  const { formData, updateField, updateFields, errors, previousStep } = useForm();
  const fileInputRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [imageError, setImageError] = useState('');

  const parcelQuantity = String(formData.parcelNumber || '').trim() || '1';
  const parcelReference = String(formData.orderNumber || '').trim() || 'N/A';
  const parcelReferenceWithQuantity = `${parcelReference}/${parcelQuantity}`;

  const incrementQuantityString = (value) => {
    const digits = String(value || '').replace(/\D/g, '') || '0';
    const next = String(Math.min(100, (Number(digits) || 0) + 1));
    return next;
  };

  const decrementQuantityString = (value) => {
    const digits = String(value || '').replace(/\D/g, '') || '1';
    const next = String(Math.max(1, (Number(digits) || 1) - 1));
    return next;
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Veuillez sélectionner une image valide');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('L\'image doit faire moins de 5MB');
      return;
    }

    setImageError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      updateFields({
        parcelImage: file,
        parcelImagePreview: event.target.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    updateFields({
      parcelImage: null,
      parcelImagePreview: null,
    });
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBack = () => {
    previousStep();
    if (onBack) onBack();
  };

  // WhatsApp handler for Step 3
  const handleStep3WhatsApp = createWhatsAppHandler({
    messageType: WHATSAPP_MESSAGE_TYPES.RECEIVER_NOTIFICATION,
    formData,
  });

  // Validate before submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (onSubmit) {
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Submission error:', error);
      }
    }
  };

  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-icon">📷</div>
        <h2>Détails du Colis</h2>
        <p>Informations sur le colis et confirmation finale</p>
      </div>

      {/* Complete Order Summary */}
      <div className="complete-summary">
        <div className="summary-columns">
          
          {/* Sender Info */}
          <div className="info-summary sender-summary">
            <h3 className="summary-title">📤 Expéditeur</h3>
            <div className="summary-content">
              <div className="summary-item">
                <span className="label">Nom:</span>
                <span className="value">{formData.senderName}</span>
              </div>
              <div className="summary-item">
                <span className="label">Ville:</span>
                <span className="value">{formData.senderCity}</span>
              </div>
              <div className="summary-item">
                <span className="label">Téléphone:</span>
                <span className="value">{formData.senderPhone}</span>
              </div>
            </div>
          </div>

          {/* Receiver Info */}
          <div className="info-summary receiver-summary">
            <h3 className="summary-title">📥 Destinataire</h3>
            <div className="summary-content">
              <div className="summary-item">
                <span className="label">Nom:</span>
                <span className="value">{formData.receiverName}</span>
              </div>
              <div className="summary-item">
                <span className="label">Ville:</span>
                <span className="value">{formData.receiverCity}</span>
              </div>
              <div className="summary-item">
                <span className="label">Téléphone:</span>
                <span className="value">{formData.receiverPhone}</span>
              </div>
            </div>
          </div>

          {/* Parcel Info */}
          <div className="info-summary parcel-summary">
            <h3 className="summary-title">📦 Colis</h3>
            <div className="summary-content">
              <div className="summary-item">
                <span className="label">Numéro:</span>
                <span className="value badge">
                  {parcelReferenceWithQuantity}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Direction:</span>
                <span className="value badge direction-badge">
                  {getDirectionFlags(formData.direction)}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Quantité:</span>
                <span className="value">{parcelQuantity} colis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form className="step-form" onSubmit={handleSubmit}>
        {/* Direction */}
        <div className="form-group direction-selector">
          <label>Direction de Livraison</label>
          <div className="direction-options">
            <button
              type="button"
              className={`direction-btn ${formData.direction === 'MA-FR' ? 'active' : ''}`}
              onClick={() => updateField('direction', 'MA-FR')}
            >
              <span className="flag"><CountryFlag code="MA" /></span>
              <span className="arrow">→</span>
              <span className="flag"><CountryFlag code="FR" /></span>
              <span className="text"><CountryFlag code="MA" showName /> → <CountryFlag code="FR" showName /></span>
            </button>
            <button
              type="button"
              className={`direction-btn ${formData.direction === 'FR-MA' ? 'active' : ''}`}
              onClick={() => updateField('direction', 'FR-MA')}
            >
              <span className="flag"><CountryFlag code="FR" /></span>
              <span className="arrow">→</span>
              <span className="flag"><CountryFlag code="MA" /></span>
              <span className="text"><CountryFlag code="FR" showName /> → <CountryFlag code="MA" showName /></span>
            </button>
          </div>
        </div>

        {/* Parcel Quantity */}
        <div className="form-group">
          <label htmlFor="parcelNumber">
            Nombre de Colis <span className="label-ar">(عدد الطرود)</span>
          </label>
          <div className="quantity-selector">
            <button
              type="button"
              className="qty-btn"
              onClick={() => updateField('parcelNumber', decrementQuantityString(formData.parcelNumber))}
              disabled={parcelQuantity === '1'}
            >
              −
            </button>
            <input
              id="parcelNumber"
              type="text"
              inputMode="numeric"
              value={formData.parcelNumber}
              onChange={(e) => {
                const raw = e.target.value;
                const digits = raw.replace(/\D/g, '');
                if (!digits) {
                  updateField('parcelNumber', '');
                  return;
                }
                if (digits.length < 3 || digits === '100') {
                  updateField('parcelNumber', digits);
                }
              }}
              onBlur={() => {
                const digits = String(formData.parcelNumber || '').replace(/\D/g, '');
                updateField('parcelNumber', digits ? String(Math.max(1, Math.min(100, Number(digits)))) : '1');
              }}
              className="qty-input"
            />
            <button
              type="button"
              className="qty-btn"
              onClick={() => updateField('parcelNumber', incrementQuantityString(formData.parcelNumber))}
              disabled={parcelQuantity === '100'}
            >
              +
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">
            Description du Contenu <span className="label-ar">(وصف المحتوى)</span>
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Ex: vêtements, documents, électronique..."
            className="form-control textarea"
            rows="2"
          />
        </div>

        {/* Weight */}
        <div className="form-group">
          <label htmlFor="weightKg">
            Poids du Colis (Kg) <span className="label-ar">(وزن الطرد)</span>
          </label>
          <div className="input-with-unit">
            <input
              id="weightKg"
              type="number"
              value={formData.weightKg}
              onChange={(e) => updateField('weightKg', e.target.value)}
              placeholder="Ex: 5"
              className="form-control"
              min="0"
              step="0.1"
            />
            <span className="unit">Kg</span>
          </div>
        </div>

        {/* Payment Amount (Valeur) */}
        <div className="form-group">
          <label htmlFor="paidAmount">
            Montant Payé / Valeur <span className="label-ar">(المبلغ المدفوع)</span>
          </label>
          <div className="input-with-unit">
            <input
              id="paidAmount"
              type="number"
              value={formData.paidAmount}
              onChange={(e) => updateField('paidAmount', e.target.value)}
              placeholder="Ex: 100"
              className="form-control"
              min="0"
              step="0.01"
            />
            <span className="unit">MAD/EUR</span>
          </div>
        </div>

        {/* Image Upload */}
        <div className="form-group">
          <label>
            Photo du Colis (Optionnel) <span className="label-ar">(صورة الطرد)</span>
          </label>
          
          {!formData.parcelImagePreview ? (
            <div className="image-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Cliquez pour télécharger une image</span>
                <small>ou glissez-déposez une image ici</small>
              </button>
              {imageError && <span className="error-message">{imageError}</span>}
            </div>
          ) : (
            <div className="image-preview-container">
              <img src={formData.parcelImagePreview} alt="Aperçu du colis" className="image-preview" />
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleRemoveImage}
              >
                ✕ Retirer l'image
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="notes">
            Notes Additionnelles (Optionnel) <span className="label-ar">(ملاحظات إضافية)</span>
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Ajouter des notes ou des instructions spéciales..."
            className="form-control textarea"
            rows="3"
          />
        </div>

        {/* WhatsApp Button */}
        <div className="whatsapp-section">
          <h3 className="section-title">📱 Envoyer les Détails par WhatsApp</h3>
          <p className="section-description">
            Envoyez les détails complets du colis au destinataire via WhatsApp
          </p>
          
          <div className="whatsapp-preview">
            <button
              type="button"
              className="preview-toggle"
              onClick={() => setShowPreview(!showPreview)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Aperçu du message WhatsApp
            </button>
            
            {showPreview && (
              <div className="preview-box whatsapp-message">
                <div className="preview-content">
                  <strong>📱 Message complètement formaté:</strong>
                  <p>{generateStep3Message(formData)}</p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-whatsapp-large"
            onClick={handleStep3WhatsApp}
            disabled={!formData.receiverPhone}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-3.055 2.116-3.905 5.900-1.914 8.986 2.32 3.472 6.480 4.755 10.321 3.015 3.841-1.740 5.471-5.922 3.813-9.506-1.658-3.584-5.814-5.181-9.186-3.873M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0Z"/>
            </svg>
            Envoyer via WhatsApp au Destinataire
          </button>
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
            className="btn btn-success"
          >
            ✓ Confirmer et Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

export default Step3Parcel;
