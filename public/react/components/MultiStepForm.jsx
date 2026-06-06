import React, { useState } from 'react';
import { useForm } from '../contexts/FormContext';
import Step1Sender from './Step1Sender';
import Step2Receiver from './Step2Receiver';
import Step3Parcel from './Step3Parcel';

/**
 * MultiStepForm Component - Main form controller
 * 
 * Manages:
 * - Step navigation and progression
 * - Form state via Context API
 * - Data persistence between steps
 * - Submission handling
 */
export function MultiStepForm({ cities = [], onSubmitSuccess, onSubmitError }) {
  const { currentStep, formData, resetForm } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Handle form submission
  const handleFormSubmit = async (data) => {
    setIsLoading(true);
    setSubmitError(null);

    try {
      // Prepare form data for backend
      const formDataToSubmit = new FormData();
      
      // Add all fields
      formDataToSubmit.append('orderNumber', data.orderNumber);
      formDataToSubmit.append('senderName', data.senderName);
      formDataToSubmit.append('senderCity', data.senderCity);
      formDataToSubmit.append('senderPhone', data.senderPhone);
      formDataToSubmit.append('senderCountry', data.senderCountry);
      
      formDataToSubmit.append('receiverName', data.receiverName);
      formDataToSubmit.append('receiverCity', data.receiverCity);
      formDataToSubmit.append('receiverPhone', data.receiverPhone);
      formDataToSubmit.append('receiverCountry', data.receiverCountry);
      
      formDataToSubmit.append('parcelsCount', data.parcelNumber);
      formDataToSubmit.append('direction', data.direction);
      formDataToSubmit.append('description', data.description);
      formDataToSubmit.append('weightKg', data.weightKg);
      formDataToSubmit.append('paidAmount', data.paidAmount);
      formDataToSubmit.append('notes', data.notes);
      
      // Add image if present
      if (data.parcelImage) {
        formDataToSubmit.append('image', data.parcelImage);
      }

      // Send to backend
      const response = await fetch('/orders', {
        method: 'POST',
        body: formDataToSubmit,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const result = await response.json();

      // Success
      if (onSubmitSuccess) {
        onSubmitSuccess(result);
      }

      // Reset form for next submission
      resetForm();

      return result;
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error.message || 'Une erreur est survenue lors de la soumission';
      setSubmitError(errorMessage);

      if (onSubmitError) {
        onSubmitError(error);
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="multi-step-form-container">
      
      {/* Stepper Header */}
      <div className="stepper-container">
        <div className="stepper">
          {[1, 2, 3].map((step) => (
            <div key={step} className={`step-indicator ${currentStep >= step ? 'completed' : ''} ${currentStep === step ? 'active' : ''}`}>
              <div className="step-circle">
                {currentStep > step ? '✓' : step}
              </div>
              <div className="step-label-text">
                {step === 1 && 'Expéditeur'}
                {step === 2 && 'Destinataire'}
                {step === 3 && 'Colis'}
              </div>
            </div>
          ))}
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(currentStep - 1) * 50}%` }}></div>
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="alert alert-danger">
          <strong>✕ Erreur:</strong> {submitError}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Enregistrement en cours...</p>
        </div>
      )}

      {/* Step Content */}
      <div className="steps-container">
        {currentStep === 1 && (
          <Step1Sender cities={cities} />
        )}

        {currentStep === 2 && (
          <Step2Receiver cities={cities} />
        )}

        {currentStep === 3 && (
          <Step3Parcel
            onSubmit={handleFormSubmit}
          />
        )}
      </div>

      {/* Form Summary (optional) */}
      <div className="form-footer">
        <small className="text-muted">
          Étape {currentStep} / 3 · Assurez-vous que toutes les informations sont correctes avant de continuer
        </small>
      </div>
    </div>
  );
}

export default MultiStepForm;
