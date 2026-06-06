import React, { createContext, useContext, useState, useCallback } from 'react';

// Create the Form Context
const FormContext = createContext();

/**
 * FormProvider - Provides global state management for multi-step form
 * 
 * Features:
 * - Manages form data across 3 steps
 * - Provides step navigation
 * - Handles validation
 * - Enables data sharing between steps
 */
export function FormProvider({ children }) {
  // Form Data State
  const [formData, setFormData] = useState({
    // Step 1 - Sender
    orderNumber: '',
    senderName: '',
    senderCity: '',
    senderPhone: '',
    senderCountry: '',
    
    // Step 2 - Receiver
    receiverName: '',
    receiverCity: '',
    receiverPhone: '',
    receiverCountry: '',
    
    // Step 3 - Parcel
    parcelNumber: '1',
    direction: 'MA-FR', // MA→FR or FR→MA
    parcelImage: null,
    parcelImagePreview: null,
    description: '',
    weightKg: '',
    paidAmount: '',
    notes: '',
  });

  // Step Management
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Update form field
   * @param {string} field - Field name
   * @param {any} value - Field value
   */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  }, [errors]);

  /**
   * Update multiple fields at once
   * @param {Object} fields - Object with field:value pairs
   */
  const updateFields = useCallback((fields) => {
    setFormData(prev => ({
      ...prev,
      ...fields
    }));
  }, []);

  /**
   * Move to next step with validation
   */
  const nextStep = useCallback((validation) => {
    if (validation) {
      const stepErrors = validation();
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return false;
      }
    }
    setErrors({});
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      return true;
    }
    return false;
  }, [currentStep]);

  /**
   * Move to previous step
   */
  const previousStep = useCallback(() => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      return true;
    }
    return false;
  }, [currentStep]);

  /**
   * Go to specific step
   */
  const goToStep = useCallback((step) => {
    if (step >= 1 && step <= 3) {
      setErrors({});
      setCurrentStep(step);
      return true;
    }
    return false;
  }, []);

  /**
   * Validate and submit form
   */
  const submitForm = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    try {
      const result = await onSubmit(formData);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData({
      orderNumber: '',
      senderName: '',
      senderCity: '',
      senderPhone: '',
      senderCountry: '',
      receiverName: '',
      receiverCity: '',
      receiverPhone: '',
      receiverCountry: '',
      parcelNumber: '1',
      direction: 'MA-FR',
      parcelImage: null,
      parcelImagePreview: null,
      description: '',
      weightKg: '',
      paidAmount: '',
      notes: '',
    });
    setCurrentStep(1);
    setErrors({});
  }, []);

  /**
   * Get step data for context awareness
   */
  const getStepData = useCallback((step) => {
    switch (step) {
      case 1:
        return {
          orderNumber: formData.orderNumber,
          senderName: formData.senderName,
          senderCity: formData.senderCity,
          senderPhone: formData.senderPhone,
          senderCountry: formData.senderCountry,
        };
      case 2:
        return {
          receiverName: formData.receiverName,
          receiverCity: formData.receiverCity,
          receiverPhone: formData.receiverPhone,
          receiverCountry: formData.receiverCountry,
        };
      case 3:
        return {
          parcelNumber: formData.parcelNumber,
          direction: formData.direction,
          parcelImage: formData.parcelImage,
          description: formData.description,
          weightKg: formData.weightKg,
          paidAmount: formData.paidAmount,
          notes: formData.notes,
        };
      default:
        return {};
    }
  }, [formData]);

  const value = {
    // Data
    formData,
    currentStep,
    errors,
    isSubmitting,
    
    // Methods
    updateField,
    updateFields,
    nextStep,
    previousStep,
    goToStep,
    submitForm,
    resetForm,
    getStepData,
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
}

/**
 * Custom hook to use Form Context
 */
export function useForm() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within FormProvider');
  }
  return context;
}
