/**
 * Index file for React Multi-Step Form Components
 * 
 * Exports all components and utilities for easy importing
 * 
 * Usage:
 * import { FormProvider, useForm, MultiStepForm } from './react/index.js';
 */

// ===== CONTEXT =====
export { FormProvider, useForm } from './contexts/FormContext';

// ===== COMPONENTS =====
export { Step1Sender } from './components/Step1Sender';
export { Step2Receiver } from './components/Step2Receiver';
export { Step3Parcel } from './components/Step3Parcel';
export { MultiStepForm } from './components/MultiStepForm';
export { CountryFlag, getCountryFlag, getCountryName, getDirectionFlags } from './components/CountryFlag';

// ===== UTILITIES =====
export {
  WHATSAPP_MESSAGE_TYPES,
  formatPhoneForWhatsApp,
  generateConfirmationMessage,
  generateReceiverNotificationMessage,
  generateWhatsAppMessageByType,
  buildWhatsAppPayload,
  generateStep2Message,
  generateStep3Message,
  encodeMessageForURL,
  generateWhatsAppWebURL,
  generateWhatsAppAPIURL,
  openWhatsAppChat,
  addImageToMessage,
  createWhatsAppHandler,
  WhatsAppUtils,
} from './utils/whatsappUtils';

/**
 * Quick Start Example
 * 
 * import React from 'react';
 * import {
 *   FormProvider,
 *   MultiStepForm
 * } from './react/index.js';
 * import './react/styles/form-styles.css';
 * 
 * function App() {
 *   return (
 *     <FormProvider>
 *       <MultiStepForm cities={citiesData} />
 *     </FormProvider>
 *   );
 * }
 * 
 * export default App;
 */
