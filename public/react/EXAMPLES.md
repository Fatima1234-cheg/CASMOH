/**
 * EXAMPLE: How to use the React Multi-Step Form
 * This file shows practical integration examples
 */

// ============================================================
// EXAMPLE 1: Simple Implementation with Cities Data
// ============================================================

/**
 * In your server.js or routes:
 */
app.get('/orders/new', async (req, res) => {
  try {
    const cities = await City.find({ country: { $in: ['Morocco', 'France'] } });
    
    res.render('orders/form-react', {
      title: 'Create Parcel',
      cities: cities, // Pass cities as JSON
    });
  } catch (error) {
    res.status(500).render('error', { error });
  }
});

// ============================================================
// EXAMPLE 2: EJS Template Integration
// ============================================================

/**
 * File: views/orders/form-react.ejs
 * 
 * This is a new version of the form that uses React
 * instead of traditional EJS form
 */

/*
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> - Cashmoh</title>
  
  <!-- Existing Styles -->
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/admin.css">
  
  <!-- React Form Styles -->
  <link rel="stylesheet" href="/react/styles/form-styles.css">
</head>
<body>
  <%- include('../partials/header') %>
  
  <div class="admin-page">
    <%- include('../partials/sidebar') %>
    
    <main class="admin-main">
      <header class="admin-topbar">
        <h1 class="page-title">Créer un nouveau colis</h1>
        <a href="/orders" class="btn btn-round">← Retour à la liste</a>
      </header>

      <!-- React Form Container -->
      <div id="react-form-root" style="padding: 2rem;"></div>
    </main>
  </div>

  <!-- React and Babel from CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- React Components (in order) -->
  <script type="text/babel" src="/react/contexts/FormContext.jsx"></script>
  <script type="text/babel" src="/react/utils/whatsappUtils.js"></script>
  <script type="text/babel" src="/react/components/Step1Sender.jsx"></script>
  <script type="text/babel" src="/react/components/Step2Receiver.jsx"></script>
  <script type="text/babel" src="/react/components/Step3Parcel.jsx"></script>
  <script type="text/babel" src="/react/components/MultiStepForm.jsx"></script>

  <!-- Initialize React Form -->
  <script type="text/babel">
    // Get cities data from EJS
    const citiesData = <%- JSON.stringify(cities) %>;

    // Destructure what we need
    const { FormProvider } = window.FormContext || {};
    const { MultiStepForm } = window.MultiStepForm || {};

    // Main App Component
    function OrderFormApp() {
      const [successMessage, setSuccessMessage] = React.useState('');

      const handleSubmitSuccess = (result) => {
        setSuccessMessage(`✓ Colis ${result.orderNumber} enregistré avec succès!`);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = '/orders';
        }, 2000);
      };

      const handleSubmitError = (error) => {
        console.error('Form error:', error);
        // Error is handled within MultiStepForm
      };

      return (
        <FormProvider>
          {successMessage && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              {successMessage}
            </div>
          )}
          <MultiStepForm 
            cities={citiesData}
            onSubmitSuccess={handleSubmitSuccess}
            onSubmitError={handleSubmitError}
          />
        </FormProvider>
      );
    }

    // Render app
    const root = ReactDOM.createRoot(document.getElementById('react-form-root'));
    root.render(<OrderFormApp />);
  </script>
</body>
</html>
*/

// ============================================================
// EXAMPLE 3: Generate Order Number in Backend
// ============================================================

/**
 * Utility function to generate order numbers
 */
async function generateOrderNumber() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  
  // Get count of orders today
  const count = await Order.countDocuments({
    createdAt: {
      $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    }
  });

  return `CASMOH-${dateStr}-${String(count + 1).padStart(3, '0')}`;
}

// Add to Order Creation Route
app.post('/orders', async (req, res) => {
  try {
    const orderNumber = await generateOrderNumber();
    
    const order = new Order({
      orderNumber,
      ...req.body,
      // Add image if uploaded
      image: req.file ? req.file.filename : null,
    });

    await order.save();

    res.json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      message: 'Colis créé avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// EXAMPLE 4: WhatsApp Message Templates
// ============================================================

/**
 * You can customize WhatsApp messages in whatsappUtils.js
 * 
 * Current templates:
 */

// Step 2: Sender Confirmation
// "Bonjour [Nom Expéditeur], merci de ta confiance. 
//  Ton colis a bien été enregistré sous le numéro [Numéro Colis]."

// Step 3: Receiver Details
// "Bonjour [Nom Destinataire], vous allez recevoir un colis 
//  de la part de [Nom Expéditeur]. Numéro : [Numéro Colis]. 
//  Nombre de colis : [Nombre]. Direction : [MA→FR / FR→MA]. Merci."

/**
 * To customize messages, edit generateStep2Message() and 
 * generateStep3Message() in /react/utils/whatsappUtils.js
 */

// ============================================================
// EXAMPLE 5: Form Validation Rules
// ============================================================

/**
 * Validation is handled in each Step component
 * Edit validateStep1, validateStep2, etc. to add custom rules
 */

// Step 1 Validation (in Step1Sender.jsx)
/*
const validateStep1 = () => {
  const newErrors = {};

  if (!formData.senderName?.trim()) {
    newErrors.senderName = 'Veuillez entrer votre nom';
  }

  if (formData.senderName?.length < 3) {
    newErrors.senderName = 'Le nom doit contenir au moins 3 caractères';
  }

  if (!formData.senderCity?.trim()) {
    newErrors.senderCity = 'Veuillez sélectionner une ville';
  }

  if (!formData.senderPhone?.trim()) {
    newErrors.senderPhone = 'Veuillez entrer votre numéro de téléphone';
  }

  // Custom phone validation
  const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
  if (!phoneRegex.test(formData.senderPhone.replace(/\s/g, ''))) {
    newErrors.senderPhone = 'Format de téléphone invalide';
  }

  return newErrors;
};
*/

// ============================================================
// EXAMPLE 6: Styling Customization
// ============================================================

/**
 * Override CSS variables to match your brand
 */

/*
<style>
  :root {
    --primary-color: #your-brand-color;
    --primary-light: #your-brand-light;
    --secondary-color: #your-accent-color;
    --whatsapp-color: #25d366;
    
    --gray-100: #f9fafb;
    --gray-200: #f3f4f6;
    /* ... etc ... */
  }
</style>
*/

// ============================================================
// EXAMPLE 7: Database Schema for Order
// ============================================================

/**
 * MongoDB Order Schema
 */

/*
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Sender Info
  senderName: String,
  senderCity: String,
  senderPhone: String,
  senderCountry: String,
  
  // Receiver Info
  receiverName: String,
  receiverCity: String,
  receiverPhone: String,
  receiverCountry: String,
  
  // Parcel Info
  parcelNumber: Number,
  direction: {
    type: String,
    enum: ['MA-FR', 'FR-MA']
  },
  image: String,
  notes: String,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'delivered'],
    default: 'pending'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
*/

// ============================================================
// EXAMPLE 8: File Upload Handling
// ============================================================

/**
 * Multer configuration for image uploads
 */

/*
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/orders');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Use in route
app.post('/orders', upload.single('image'), (req, res) => {
  // Handle order creation
});
*/

// ============================================================
// EXAMPLE 9: Email Notifications
// ============================================================

/**
 * Send email after WhatsApp (optional enhancement)
 */

/*
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  }
});

async function sendOrderConfirmation(order) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `Nouveau colis: ${order.orderNumber}`,
    html: `
      <h2>Nouveau colis enregistré</h2>
      <p><strong>Numéro:</strong> ${order.orderNumber}</p>
      <p><strong>Expéditeur:</strong> ${order.senderName}</p>
      <p><strong>Destinataire:</strong> ${order.receiverName}</p>
      <p><strong>Direction:</strong> ${order.direction}</p>
    `
  };

  return transporter.sendMail(mailOptions);
}
*/

// ============================================================
// EXAMPLE 10: Testing WhatsApp URLs
// ============================================================

/**
 * Test WhatsApp functionality in browser console
 */

/*
// Test phone formatting
window.WhatsAppUtils.formatPhoneForWhatsApp('0612345678', '+212');
// Result: "+2120612345678"

// Test message generation
const testData = {
  senderName: 'Ahmed',
  receiverName: 'Mohamed',
  orderNumber: 'CASMOH-001',
  parcelNumber: 1,
  direction: 'MA-FR'
};

const message = window.WhatsAppUtils.generateStep3Message(testData);
console.log(message);

// Generate URL
const url = window.WhatsAppUtils.generateWhatsAppAPIURL('+212612345678', message);
console.log(url);

// Or open directly
window.WhatsAppUtils.openWhatsAppChat('+212612345678', message);
*/

// ============================================================
// SUMMARY
// ============================================================

/**
 * Key Points:
 * 
 * 1. ✅ All components are self-contained and reusable
 * 2. ✅ State is managed globally via Context API
 * 3. ✅ WhatsApp integration is fully automated
 * 4. ✅ Forms are fully responsive and mobile-ready
 * 5. ✅ CSS can be customized via CSS variables
 * 6. ✅ Easy to add new steps or features
 * 7. ✅ Professional, animated UI
 * 8. ✅ Full validation and error handling
 * 9. ✅ Production-ready code
 * 10. ✅ Well-documented with JSDoc comments
 * 
 * For more details, see README.md in /react directory
 */
