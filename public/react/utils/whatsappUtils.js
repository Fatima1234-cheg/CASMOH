/**
 * WhatsApp Utils - generation centralisee des messages et URLs WhatsApp.
 * Cette couche est independante de l'UI et fonctionne avec le state global du formulaire.
 */

export const WHATSAPP_MESSAGE_TYPES = {
  CONFIRMATION: 'confirmation',
  RECEIVER_NOTIFICATION: 'receiver_notification',
};

/**
 * Format phone number for WhatsApp
 * Removes spaces, dashes, and adds country code if needed
 * 
 * @param {string} phone - Phone number
 * @param {string} countryCode - Country code (e.g., '+212' or '+33')
 * @returns {string} Formatted phone number
 */
export function formatPhoneForWhatsApp(phone, countryCode = '+212') {
  const raw = String(phone || '').trim();
  if (!raw) return '';

  const countryDigits = String(countryCode || '+212').replace(/\D/g, '') || '212';
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  const knownCountryCodes = ['212', '33', '34', '39', '49'];
  const matchedCc = knownCountryCodes.find((cc) => digits.startsWith(cc));
  const looksInternational = raw.startsWith('+') || raw.startsWith('00') || (!raw.startsWith('0') && digits.length >= 11);

  if (matchedCc && looksInternational) {
    const national = digits.slice(matchedCc.length).replace(/^0+/, '');
    return national ? `${matchedCc}${national}` : '';
  }

  let nationalNumber = digits.startsWith(countryDigits)
    ? digits.slice(countryDigits.length)
    : digits;

  nationalNumber = nationalNumber.replace(/^0+/, '');

  if (!nationalNumber) return '';
  return `${countryDigits}${nationalNumber}`;
}

export function generateConfirmationMessage(formData) {
  const {
    senderName = 'Client',
    orderNumber = 'N/A',
    parcelsCount,
    parcelNumber,
  } = formData;

  const refNumber = String(orderNumber || 'N/A').trim() || 'N/A';
  const quantity = Number(parcelsCount || parcelNumber) || 1;
  const refWithQuantity = `${refNumber}/${quantity}`;

  return [
  `Bonjour ${senderName},`,
  `Nous vous remercions pour la confiance que vous nous accordez.`,
  `Votre colis a ete enregistre avec succes sous la reference ${refWithQuantity}.`,
  `Nous prenons en charge votre envoi avec attention et professionnalisme.`,
  `Notre équipe reste à votre disposition pour toute information complémentaire.`,
  `Cordialement,`,
  `Service Logistique-Cashmoh`
].join('\n');
}

/**
 * Message detaille au destinataire base sur les donnees des 3 etapes.
 */
export function generateReceiverNotificationMessage(formData) {
  const {
    receiverName = 'Destinataire',
    senderName = 'Expéditeur',
    senderCity = 'Ville expéditeur',
    orderNumber = 'N/A',
    parcelsCount,
    parcelNumber,
  } = formData;

  const refNumber = String(orderNumber || 'N/A').trim() || 'N/A';
  const quantity = Number(parcelsCount || parcelNumber) || 1;
  const refWithQuantity = `${refNumber}/${quantity}`;

  return [
    `Bonjour ${receiverName},`,
    `Nous vous informons qu'un colis vous sera livre de la part de ${senderName}, depuis ${senderCity}.`,
    `Reference colis : ${refWithQuantity}`,
    'Merci de votre confiance.',
    'Cordialement,',
    'Service Logistique-Cashmoh',
  ].join('\n');
}

/**
 * Encode message for URL - handles special characters
 * 
 * @param {string} message - Message to encode
 * @returns {string} URL-encoded message
 */
export function encodeMessageForURL(message) {
  return encodeURIComponent(message);
}

/**
 * Generate WhatsApp App URL
 * Opens WhatsApp App with pre-filled message
 * 
 * @param {string} phone - Phone number (with country code)
 * @param {string} message - Message text
 * @returns {string} WhatsApp URL
 */
export function generateWhatsAppWebURL(phone, message) {
  const encoded = encodeMessageForURL(message);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
}

/**
 * Generate WhatsApp App URL (for mobile and desktop)
 * Uses native WhatsApp scheme
 * 
 * @param {string} phone - Phone number (with country code)
 * @param {string} message - Message text
 * @returns {string} WhatsApp URL
 */
export function generateWhatsAppAPIURL(phone, message) {
  const encoded = encodeMessageForURL(message);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
}

/**
 * Main function to open WhatsApp with message
 * Uses WhatsApp App URL (works on mobile and desktop)
 * 
 * @param {string} phone - Phone number with country code
 * @param {string} message - Message to send
 * @param {Object} options - Additional options
 * @returns {void}
 */
export function openWhatsAppChat(phone, message, options = {}) {
  const {
    target = '_blank'
  } = options;

  // Validate phone number
  if (!phone || !message) {
    console.error('Phone and message are required');
    return;
  }

  // Use wa.me URL which opens WhatsApp app directly
  const url = generateWhatsAppAPIURL(phone, message);

  // Open in new window/tab
  window.open(url, target);
}

/**
 * Generate message with optional image link
 * 
 * @param {string} baseMessage - Base message text
 * @param {string} imageUrl - Optional image URL
 * @returns {string} Complete message
 */
export function addImageToMessage(baseMessage, imageUrl) {
  if (!imageUrl) return baseMessage;
  return `${baseMessage}\n\nImage: ${imageUrl}`;
}

/**
 * Selectionne le message en fonction d'un type metier.
 */
export function generateWhatsAppMessageByType(messageType, formData) {
  if (messageType === WHATSAPP_MESSAGE_TYPES.RECEIVER_NOTIFICATION) {
    return generateReceiverNotificationMessage(formData);
  }
  return generateConfirmationMessage(formData);
}

/**
 * Construit la cible telephone + message selon le type de message.
 */
export function buildWhatsAppPayload(messageType, formData) {
  const isReceiverNotification = messageType === WHATSAPP_MESSAGE_TYPES.RECEIVER_NOTIFICATION;
  const phone = isReceiverNotification ? formData.receiverPhone : formData.senderPhone;
  const countryCode = isReceiverNotification
    ? (formData.receiverCountry || '+212')
    : (formData.senderCountry || '+212');
  const formattedPhone = formatPhoneForWhatsApp(phone, countryCode);

  let message = generateWhatsAppMessageByType(messageType, formData);
  if (isReceiverNotification && formData.parcelImage) {
    // WhatsApp n'envoie pas le binaire, on ajoute un rappel textuel.
    message = addImageToMessage(message, 'Photo jointe dans le dossier de la commande');
  }

  return { phone: formattedPhone, message };
}

/**
 * Handler WhatsApp centralise.
 */
export function createWhatsAppHandler({
  messageType = WHATSAPP_MESSAGE_TYPES.CONFIRMATION,
  formData,
  options = {},
} = {}) {
  return () => {
    const { phone, message } = buildWhatsAppPayload(messageType, formData);

    if (!phone) {
      console.error('Phone number not available');
      alert('Veuillez entrer un numéro de téléphone');
      return;
    }

    // Open WhatsApp
    openWhatsAppChat(phone, message, options);
  };
}

/**
 * Compatibilite retroactive.
 */
export function generateStep2Message(formData) {
  return generateConfirmationMessage(formData);
}

export function generateStep3Message(formData) {
  return generateReceiverNotificationMessage(formData);
}

/**
 * Export utilities object for convenience
 */
export const WhatsAppUtils = {
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
};

export default WhatsAppUtils;
