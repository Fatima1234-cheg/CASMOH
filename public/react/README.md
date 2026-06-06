# 🏗️ React Multi-Step Form Architecture & Integration Guide

## 📋 Overview

This is a professional, scalable React solution for a multi-step parcel management form with WhatsApp integration. The architecture uses **Context API** for state management and provides seamless data sharing across all form steps.

---

## 🎯 Architecture Overview

### Structure

```
public/react/
├── contexts/
│   └── FormContext.jsx          # Global state management
├── components/
│   ├── Step1Sender.jsx          # Sender information form
│   ├── Step2Receiver.jsx        # Receiver information + WhatsApp
│   ├── Step3Parcel.jsx          # Parcel details + WhatsApp
│   └── MultiStepForm.jsx        # Main form orchestrator
├── utils/
│   └── whatsappUtils.js         # WhatsApp message generation
└── styles/
    └── form-styles.css          # Complete styling
```

---

## 🔧 Installation & Setup

### Step 1: Install React Dependencies

```bash
npm install react react-dom
# Or if using Webpack/Bundler:
npm install --save-dev @babel/preset-react
```

### Step 2: Copy React Files

All React components are in `public/react/`. Make sure your build process includes them.

### Step 3: Include CSS

Add to your main HTML or CSS import:

```html
<link rel="stylesheet" href="/react/styles/form-styles.css">
```

---

## 📱 Features

### ✅ Step 1: Sender Information
- Sender name
- Sender city (with country code auto-detection)
- Sender phone
- Direction selection (MA→FR or FR→MA)
- Order number (auto-generated)

### ✅ Step 2: Receiver Information
- Receiver name
- Receiver city (with country code)
- Receiver phone
- **WhatsApp button** to send order confirmation
- **Message preview** showing what will be sent
- **Summary** of sender info from Step 1

### ✅ Step 3: Parcel Details
- Parcel quantity (with +/- buttons)
- Image upload with preview
- Optional notes
- **WhatsApp button** to send complete details
- **Full order summary** from Steps 1 & 2
- **Complete order summary** with all data
- **Message preview** with actual message text
- Form submission to backend

---

## 🎮 State Management with Context API

### FormContext Structure

```javascript
{
  // Data
  formData: {
    orderNumber,
    senderName,
    senderCity,
    senderPhone,
    senderCountry,
    receiverName,
    receiverCity,
    receiverPhone,
    receiverCountry,
    parcelNumber,
    direction,
    parcelImage,
    parcelImagePreview,
    notes,
  },
  
  // State
  currentStep,
  errors,
  isSubmitting,
  
  // Methods
  updateField(field, value),
  updateFields(fields),
  nextStep(validation),
  previousStep(),
  goToStep(step),
  submitForm(onSubmit),
  resetForm(),
  getStepData(step),
}
```

### Using the Hook

```javascript
import { useForm } from './contexts/FormContext';

function MyComponent() {
  const { formData, updateField, nextStep } = useForm();
  
  // Use formData and methods
}
```

---

## 🌐 WhatsApp Integration

### How It Works

1. **Message Generation**: Creates formatted messages with all relevant data
2. **Phone Formatting**: Automatically formats phone numbers with country codes
3. **URL Encoding**: Properly encodes special characters for URLs
4. **Platform Detection**: Uses WhatsApp API URL (works on mobile and desktop)

### WhatsApp Utils

#### Functions

```javascript
// Format phone numbers
formatPhoneForWhatsApp(phone, countryCode)

// Generate messages
generateStep2Message(formData)    // Sender confirmation
generateStep3Message(formData)    // Full parcel details

// Create WhatsApp URLs
generateWhatsAppAPIURL(phone, message)
generateWhatsAppWebURL(phone, message)

// Open WhatsApp
openWhatsAppChat(phone, message, options)

// Convenient handler
createWhatsAppHandler(step, formData, options)
```

### Example: Send Message on Button Click

```javascript
import { createWhatsAppHandler } from './utils/whatsappUtils';

function MyForm() {
  const { formData } = useForm();
  
  const handleWhatsApp = createWhatsAppHandler(2, formData);
  
  return (
    <button onClick={handleWhatsApp}>
      Send via WhatsApp
    </button>
  );
}
```

---

## 🎨 Styling System

### CSS Variables
All colors, spacing, and transitions use CSS custom properties:

```css
--primary-color: #0b2f62;
--whatsapp-color: #25d366;
--gray-100 to --gray-900: Color palette
--radius-sm/md/lg/xl: Border radius scale
--shadow-sm/md/lg/xl: Shadow scale
--transition: Default animation
```

### Customization

Override CSS variables to match your brand:

```css
:root {
  --primary-color: #your-color;
  --whatsapp-color: #your-whatsapp-green;
}
```

---

## 🚀 Integration with Existing Project

### Option 1: Webpack/Build Tool Setup

If using React with a build tool (Webpack, Vite, etc.):

```javascript
// app.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { FormProvider } from './public/react/contexts/FormContext';
import MultiStepForm from './public/react/components/MultiStepForm';
import './public/react/styles/form-styles.css';

function App() {
  const handleSubmitSuccess = (result) => {
    console.log('Form submitted:', result);
    // Redirect or show success message
  };

  const handleSubmitError = (error) => {
    console.error('Form error:', error);
  };

  return (
    <FormProvider>
      <MultiStepForm 
        cities={window.citiesData}
        onSubmitSuccess={handleSubmitSuccess}
        onSubmitError={handleSubmitError}
      />
    </FormProvider>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
```

### Option 2: Direct Script Inclusion (CDN)

If using React via CDN:

```html
<!-- React and ReactDOM from CDN -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- Babel standalone for JSX -->
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<!-- Your components -->
<script type="text/babel" src="/react/contexts/FormContext.jsx"></script>
<script type="text/babel" src="/react/utils/whatsappUtils.js"></script>
<script type="text/babel" src="/react/components/Step1Sender.jsx"></script>
<script type="text/babel" src="/react/components/Step2Receiver.jsx"></script>
<script type="text/babel" src="/react/components/Step3Parcel.jsx"></script>
<script type="text/babel" src="/react/components/MultiStepForm.jsx"></script>

<!-- Mount point -->
<div id="form-root"></div>

<!-- Initialize -->
<script type="text/babel">
  const { FormProvider } = window.FormContext;
  const { MultiStepForm } = window.MultiStepForm;

  ReactDOM.render(
    <FormProvider>
      <MultiStepForm />
    </FormProvider>,
    document.getElementById('form-root')
  );
</script>
```

### Option 3: Replace EJS Form

Replace your current EJS form with React:

```ejs
<!-- In views/orders/form.ejs -->
<%- include('../partials/header') %>

<div class="admin-page">
  <%- include('../partials/sidebar') %>
  
  <main class="admin-main">
    <header class="admin-topbar">
      <h1 class="page-title">Créer un colis</h1>
      <a href="/orders" class="btn btn-round">← Retour</a>
    </header>

    <!-- React Form Root -->
    <div id="react-form-root"></div>
  </main>
</div>

<link rel="stylesheet" href="/react/styles/form-styles.css">

<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<script type="text/babel" src="/react/contexts/FormContext.jsx"></script>
<script type="text/babel" src="/react/utils/whatsappUtils.js"></script>
<script type="text/babel" src="/react/components/Step1Sender.jsx"></script>
<script type="text/babel" src="/react/components/Step2Receiver.jsx"></script>
<script type="text/babel" src="/react/components/Step3Parcel.jsx"></script>
<script type="text/babel" src="/react/components/MultiStepForm.jsx"></script>

<script type="text/babel">
  const citiesData = <%- JSON.stringify(cities) %>;
  
  const { FormProvider } = window.FormContext || {};
  const { MultiStepForm } = window.MultiStepForm || {};

  if (FormProvider && MultiStepForm) {
    ReactDOM.render(
      <FormProvider>
        <MultiStepForm cities={citiesData} />
      </FormProvider>,
      document.getElementById('react-form-root')
    );
  }
</script>
```

---

## 💡 Advanced Features

### Validation

Each step has built-in validation. Customize by overriding validation functions:

```javascript
const validateStep1 = () => {
  const newErrors = {};
  
  if (!formData.senderName?.trim()) {
    newErrors.senderName = 'Custom error message';
  }
  
  return newErrors;
};

nextStep(validateStep1);
```

### Custom Error Handling

```javascript
const handleError = (error) => {
  if (error.response?.status === 400) {
    showFieldErrors(error.response.data.errors);
  } else {
    showGeneralError('Server error occurred');
  }
};
```

### Backend Integration

The form submits to `/orders` endpoint with FormData:

```javascript
// Frontend (automatic in MultiStepForm)
const formData = new FormData();
formData.append('senderName', data.senderName);
formData.append('image', data.parcelImage);

fetch('/orders', {
  method: 'POST',
  body: formData,
});
```

### Backend Response Format

```javascript
{
  success: true,
  orderId: "123",
  orderNumber: "CASMOH-2024-001",
  message: "Order created successfully"
}
```

---

## 🔐 Security Considerations

1. **Phone Number Validation**: Validate format before sending to WhatsApp
2. **File Upload**: Server-side validation of image files (type, size)
3. **XSS Prevention**: All inputs are sanitized before rendering
4. **CSRF Protection**: Use CSRF tokens if needed for forms
5. **Rate Limiting**: Implement rate limiting on backend

---

## 📊 Performance

- **Code Splitting**: Each component can be lazy loaded
- **Memoization**: Components use React.memo where appropriate
- **CSS Variables**: Minimal repaints with CSS custom properties
- **Form State**: Efficiently managed with Context API
- **Image Compression**: Recommend compressing images before upload

---

## 🐛 Troubleshooting

### WhatsApp Not Opening

1. Check phone number format (must start with +)
2. Ensure no spaces in country code
3. Test on mobile device (WhatsApp Web may not work)
4. Verify WhatsApp is installed

### Form Data Not Persisting

1. Check FormContext provider wraps components
2. Verify useForm hook is called inside provider
3. Check browser console for errors

### Styling Issues

1. Ensure CSS file is loaded: `/react/styles/form-styles.css`
2. Check for CSS conflicts with existing stylesheets
3. Verify CSS variables are applied correctly

---

## 📝 Example Implementation

### Full Page Example

```jsx
import React, { useState } from 'react';
import { FormProvider } from './react/contexts/FormContext';
import MultiStepForm from './react/components/MultiStepForm';
import './react/styles/form-styles.css';

export default function OrderPage() {
  const [message, setMessage] = useState('');
  
  const handleSuccess = (result) => {
    setMessage(`✓ Order ${result.orderNumber} created successfully!`);
    setTimeout(() => {
      window.location.href = '/orders';
    }, 2000);
  };

  const handleError = (error) => {
    setMessage(`✗ Error: ${error.message}`);
  };

  return (
    <div className="page-container">
      <FormProvider>
        {message && (
          <div className={`alert ${message.includes('✓') ? 'alert-success' : 'alert-danger'}`}>
            {message}
          </div>
        )}
        <MultiStepForm 
          cities={window.citiesData || []}
          onSubmitSuccess={handleSuccess}
          onSubmitError={handleError}
        />
      </FormProvider>
    </div>
  );
}
```

---

## 🎓 Learning Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Context API Guide](https://react.dev/learn/passing-data-deeply-with-context)
- [WhatsApp Web Integration](https://www.whatsapp.com/business/)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

---

## 📞 Support & Maintenance

### Version: 1.0.0
### Last Updated: 2024

For issues or improvements, refer to the inline JSDoc comments in each file for detailed function documentation.

---

## ✨ Key Advantages

✅ **Modular**: Each step is a separate component  
✅ **Scalable**: Easy to add new steps or features  
✅ **State Management**: Centralized with Context API  
✅ **Mobile-Ready**: Fully responsive design  
✅ **WhatsApp Integrated**: Seamless messaging  
✅ **Type-Safe**: Well-documented with JSDoc  
✅ **Professional UI**: Modern, animated design  
✅ **Accessible**: Keyboard navigation, ARIA labels  
✅ **Performance**: Optimized React patterns  
✅ **Maintainable**: Clean, well-organized code  

---

**Happy Coding! 🚀**
