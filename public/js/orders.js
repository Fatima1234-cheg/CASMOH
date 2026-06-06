document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  const totalSteps = document.querySelectorAll('.step-content').length;

  // Mapping des pays pour affichage amélioré
  const COUNTRIES = {
    '+212': { emoji: '🇲🇦', name_ar: 'المغرب' },
    '+33': { emoji: '🇫🇷', name_ar: 'فرنسا' },
    '+34': { emoji: '🇪🇸', name_ar: 'إسبانيا' },
    '+39': { emoji: '🇮🇹', name_ar: 'إيطاليا' },
    '+49': { emoji: '🇩🇪', name_ar: 'ألمانيا' },
    '+31': { emoji: '🇳🇱', name_ar: 'هولندا' },
    '+32': { emoji: '🇧🇪', name_ar: 'بلجيكا' },
    '+44': { emoji: '🇬🇧', name_ar: 'بريطانيا' },
    '+1': { emoji: '🇺🇸', name_ar: 'أمريكا' },
    '+213': { emoji: '🇩🇿', name_ar: 'الجزائر' },
    '+216': { emoji: '🇹🇳', name_ar: 'تونس' },
    '+93': { emoji: '🇦🇫', name_ar: 'أفغانستان' },
    '+355': { emoji: '🇦🇱', name_ar: 'ألبانيا' },
    '+20': { emoji: '🇪🇬', name_ar: 'مصر' },
    '+966': { emoji: '🇸🇦', name_ar: 'السعودية' },
    '+971': { emoji: '🇦🇪', name_ar: 'الإمارات' },
    '+90': { emoji: '🇹🇷', name_ar: 'تركيا' },
    '+962': { emoji: '🇯🇴', name_ar: 'الأردن' },
    '+961': { emoji: '🇱🇧', name_ar: 'لبنان' },
    '+218': { emoji: '🇱🇾', name_ar: 'ليبيا' },
    '+222': { emoji: '🇲🇷', name_ar: 'موريتانيا' },
    '+968': { emoji: '🇴🇲', name_ar: 'عمان' },
    '+970': { emoji: '🇵🇸', name_ar: 'فلسطين' },
    '+974': { emoji: '🇶🇦', name_ar: 'قطر' },
    '+963': { emoji: '🇸🇾', name_ar: 'سوريا' },
    '+252': { emoji: '🇸🇴', name_ar: 'الصومال' },
    '+249': { emoji: '🇸🇩', name_ar: 'السودان' },
    '+964': { emoji: '🇮🇶', name_ar: 'العراق' },
    '+98': { emoji: '🇮🇷', name_ar: 'إيران' },
    '+965': { emoji: '🇰🇼', name_ar: 'الكويت' },
    '+973': { emoji: '🇧🇭', name_ar: 'البحرين' },
    '+967': { emoji: '🇾🇪', name_ar: 'اليمن' },
    '+7': { emoji: '🇷🇺', name_ar: 'روسيا' },
    '+380': { emoji: '🇺🇦', name_ar: 'أوكرانيا' },
    '+48': { emoji: '🇵🇱', name_ar: 'بولندا' },
    '+46': { emoji: '🇸🇪', name_ar: 'السويد' },
    '+47': { emoji: '🇳🇴', name_ar: 'النرويج' },
    '+45': { emoji: '🇩🇰', name_ar: 'الدنمارك' },
    '+358': { emoji: '🇫🇮', name_ar: 'فنلندا' },
    '+351': { emoji: '🇵🇹', name_ar: 'البرتغال' },
    '+30': { emoji: '🇬🇷', name_ar: 'اليونان' },
    '+43': { emoji: '🇦🇹', name_ar: 'النمسا' },
    '+41': { emoji: '🇨🇭', name_ar: 'سويسرا' },
    '+420': { emoji: '🇨🇿', name_ar: 'التشيك' },
    '+36': { emoji: '🇭🇺', name_ar: 'المجر' },
    '+40': { emoji: '🇷🇴', name_ar: 'رومانيا' },
    '+359': { emoji: '🇧🇬', name_ar: 'بلغاريا' },
    '+385': { emoji: '🇭🇷', name_ar: 'كرواتيا' },
    '+386': { emoji: '🇸🇮', name_ar: 'سلوفينيا' },
    '+387': { emoji: '🇧🇦', name_ar: 'البوسنة' },
    '+381': { emoji: '🇷🇸', name_ar: 'صربيا' },
    '+389': { emoji: '🇲🇰', name_ar: 'مقدونيا الشمالية' },
    '+382': { emoji: '🇲🇪', name_ar: 'الجبل الأسود' },
    '+383': { emoji: '🇽🇰', name_ar: 'كوسوفو' },
    '+994': { emoji: '🇦🇿', name_ar: 'أذربيجان' },
    '+995': { emoji: '🇬🇪', name_ar: 'جورجيا' },
    '+374': { emoji: '🇦🇲', name_ar: 'أرمينيا' },
    '+84': { emoji: '🇻🇳', name_ar: 'فيتنام' },
    '+86': { emoji: '🇨🇳', name_ar: 'الصين' },
    '+81': { emoji: '🇯🇵', name_ar: 'اليابان' },
    '+82': { emoji: '🇰🇷', name_ar: 'كوريا الجنوبية' },
    '+66': { emoji: '🇹🇭', name_ar: 'تايلاند' },
    '+60': { emoji: '🇲🇾', name_ar: 'ماليزيا' },
    '+65': { emoji: '🇸🇬', name_ar: 'سنغافورة' },
    '+62': { emoji: '🇮🇩', name_ar: 'إندونيسيا' },
    '+63': { emoji: '🇵🇭', name_ar: 'الفلبين' },
    '+91': { emoji: '🇮🇳', name_ar: 'الهند' },
    '+92': { emoji: '🇵🇰', name_ar: 'باكستان' },
    '+880': { emoji: '🇧🇩', name_ar: 'بنغلاديش' },
    '+94': { emoji: '🇱🇰', name_ar: 'سريلانكا' },
    '+977': { emoji: '🇳🇵', name_ar: 'نيبال' },
    '+975': { emoji: '🇧🇹', name_ar: 'بوتان' },
    '+855': { emoji: '🇰🇭', name_ar: 'كمبوديا' },
    '+856': { emoji: '🇱🇦', name_ar: 'لاوس' },
    '+95': { emoji: '🇲🇲', name_ar: 'ميانمار' },
    '+673': { emoji: '🇧🇳', name_ar: 'بروناي' },
    '+670': { emoji: '🇹🇱', name_ar: 'تيمور الشرقية' },
    '+61': { emoji: '🇦🇺', name_ar: 'أستراليا' },
    '+64': { emoji: '🇳🇿', name_ar: 'نيوزيلندا' },
    '+27': { emoji: '🇿🇦', name_ar: 'جنوب أفريقيا' },
    '+234': { emoji: '🇳🇬', name_ar: 'نيجيريا' },
    '+254': { emoji: '🇰🇪', name_ar: 'كينيا' },
    '+255': { emoji: '🇹🇿', name_ar: 'تنزانيا' },
    '+256': { emoji: '🇺🇬', name_ar: 'أوغندا' },
    '+250': { emoji: '🇷🇼', name_ar: 'رواندا' },
    '+257': { emoji: '🇧🇮', name_ar: 'بوروندي' },
    '+243': { emoji: '🇨🇩', name_ar: 'جمهورية الكونغو الديمقراطية' },
    '+237': { emoji: '🇨🇲', name_ar: 'الكاميرون' },
    '+225': { emoji: '🇨🇮', name_ar: 'ساحل العاج' },
    '+221': { emoji: '🇸🇳', name_ar: 'السنغال' },
    '+223': { emoji: '🇲🇱', name_ar: 'مالي' },
    '+226': { emoji: '🇧🇫', name_ar: 'بوركينا فاسو' },
    '+228': { emoji: '🇹🇬', name_ar: 'توغو' },
    '+229': { emoji: '🇧🇯', name_ar: 'بنين' },
    '+227': { emoji: '🇳🇪', name_ar: 'النيجر' },
    '+235': { emoji: '🇹🇩', name_ar: 'تشاد' },
    '+236': { emoji: '🇨🇫', name_ar: 'جمهورية أفريقيا الوسطى' },
    '+231': { emoji: '🇱🇷', name_ar: 'ليبيريا' },
    '+232': { emoji: '🇸🇱', name_ar: 'سيراليون' },
    '+224': { emoji: '🇬🇳', name_ar: 'غينيا' },
    '+245': { emoji: '🇬🇼', name_ar: 'غينيا بيساو' },
    '+238': { emoji: '🇨🇻', name_ar: 'الرأس الأخضر' },
    '+240': { emoji: '🇬🇶', name_ar: 'غينيا الاستوائية' },
    '+241': { emoji: '🇬🇦', name_ar: 'الغابون' },
    '+242': { emoji: '🇨🇬', name_ar: 'جمهورية الكونغو' },
    '+244': { emoji: '🇦🇴', name_ar: 'أنغولا' },
    '+260': { emoji: '🇿🇲', name_ar: 'زامبيا' },
    '+263': { emoji: '🇿🇼', name_ar: 'زيمبابوي' },
    '+265': { emoji: '🇲🇼', name_ar: 'مالاوي' },
    '+264': { emoji: '🇳🇦', name_ar: 'ناميبيا' },
    '+267': { emoji: '🇧🇼', name_ar: 'بوتسوانا' },
    '+268': { emoji: '🇸🇿', name_ar: 'إسواتيني' },
    '+269': { emoji: '🇰🇲', name_ar: 'جزر القمر' },
    '+261': { emoji: '🇲🇬', name_ar: 'مدغشقر' },
    '+262': { emoji: '🇷🇪', name_ar: 'ريونيون' },
    '+230': { emoji: '🇲🇺', name_ar: 'موريشيوس' },
    '+248': { emoji: '🇸🇨', name_ar: 'سيشل' },
    '+290': { emoji: '🇸🇭', name_ar: 'سانت هيلانة' },
    '+247': { emoji: '🇦🇨', name_ar: 'جزيرة أسنسيون' },
    '+246': { emoji: '🇮🇴', name_ar: 'إقليم المحيط الهندي البريطاني' },
    '+500': { emoji: '🇫🇰', name_ar: 'جزر فوكلاند' },
    '+501': { emoji: '🇧🇿', name_ar: 'بليز' },
    '+502': { emoji: '🇬🇹', name_ar: 'غواتيمالا' },
    '+503': { emoji: '🇸🇻', name_ar: 'السلفادور' },
    '+504': { emoji: '🇭🇳', name_ar: 'هندوراس' },
    '+505': { emoji: '🇳🇮', name_ar: 'نيكاراغوا' },
    '+506': { emoji: '🇨🇷', name_ar: 'كوستاريكا' },
    '+507': { emoji: '🇵🇦', name_ar: 'بنما' },
    '+508': { emoji: '🇵🇲', name_ar: 'سان بيير وميكلون' },
    '+509': { emoji: '🇭🇹', name_ar: 'هايتي' },
    '+52': { emoji: '🇲🇽', name_ar: 'المكسيك' },
    '+53': { emoji: '🇨🇺', name_ar: 'كوبا' },
    '+54': { emoji: '🇦🇷', name_ar: 'الأرجنتين' },
    '+55': { emoji: '🇧🇷', name_ar: 'البرازيل' },
    '+56': { emoji: '🇨🇱', name_ar: 'تشيلي' },
    '+57': { emoji: '🇨🇴', name_ar: 'كولومبيا' },
    '+58': { emoji: '🇻🇪', name_ar: 'فنزويلا' },
    '+591': { emoji: '🇧🇴', name_ar: 'بوليفيا' },
    '+592': { emoji: '🇬🇾', name_ar: 'غيانا' },
    '+593': { emoji: '🇪🇨', name_ar: 'الإكوادور' },
    '+594': { emoji: '🇬🇫', name_ar: 'غويانا الفرنسية' },
    '+595': { emoji: '🇵🇾', name_ar: 'باراغواي' },
    '+596': { emoji: '🇲🇶', name_ar: 'مارتينيك' },
    '+597': { emoji: '🇸🇷', name_ar: 'سورينام' },
    '+598': { emoji: '🇺🇾', name_ar: 'أوروغواي' },
    '+599': { emoji: '🇧🇶', name_ar: 'هولندا الكاريبية' },
    '+672': { emoji: '🇦🇶', name_ar: 'القارة القطبية الجنوبية' },
    '+674': { emoji: '🇳🇷', name_ar: 'ناورو' },
    '+675': { emoji: '🇵🇬', name_ar: 'بابوا غينيا الجديدة' },
    '+676': { emoji: '🇹🇴', name_ar: 'تونغا' },
    '+677': { emoji: '🇸🇧', name_ar: 'جزر سليمان' },
    '+678': { emoji: '🇻🇺', name_ar: 'فانواتو' },
    '+679': { emoji: '🇫🇯', name_ar: 'فيجي' },
    '+680': { emoji: '🇵🇼', name_ar: 'بالاو' },
    '+681': { emoji: '🇼🇫', name_ar: 'واليس وفوتونا' },
    '+682': { emoji: '🇨🇰', name_ar: 'جزر كوك' },
    '+683': { emoji: '🇳🇺', name_ar: 'نيوي' },
    '+684': { emoji: '🇦🇸', name_ar: 'ساموا الأمريكية' },
    '+685': { emoji: '🇼🇸', name_ar: 'ساموا' },
    '+686': { emoji: '🇰🇮', name_ar: 'كيريباتي' },
    '+687': { emoji: '🇳🇨', name_ar: 'كاليدونيا الجديدة' },
    '+688': { emoji: '🇹🇻', name_ar: 'توفالو' },
    '+689': { emoji: '🇵🇫', name_ar: 'بولينيزيا الفرنسية' },
    '+690': { emoji: '🇹🇰', name_ar: 'توكيلاو' },
    '+691': { emoji: '🇫🇲', name_ar: 'ميكرونيزيا' },
    '+692': { emoji: '🇲🇭', name_ar: 'جزر المارشال' }
  };

  const FLAGS = {
    '+212': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23c1121f"/><polygon points="11,4 12.8,9.5 7.8,6.3 14.2,6.3 9.2,9.5" fill="%2300652b"/></svg>',
    '+33': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23ffffff"/><rect width="7.33" height="16" fill="%230053a4"/><rect x="14.67" width="7.33" height="16" fill="%23ef3340"/></svg>',
    '+34': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23aa151b"/><rect y="4" width="22" height="8" fill="%23f1bf00"/></svg>',
    '+39': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23ffffff"/><rect width="7.33" height="16" fill="%2318a999"/><rect x="14.67" width="7.33" height="16" fill="%23ce2b37"/></svg>',
    '+49': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23000000"/><rect y="5.33" width="22" height="5.33" fill="%23dd0000"/><rect y="10.67" width="22" height="5.33" fill="%23ffce00"/></svg>',
    '+31': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23ae1c28"/><rect y="5.33" width="22" height="5.33" fill="%23ffffff"/><rect y="10.67" width="22" height="5.33" fill="%232141b6"/></svg>',
    '+32': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23fdda24"/><rect width="7.33" height="16" fill="%23000000"/><rect x="14.67" width="7.33" height="16" fill="%23ef3340"/></svg>',
    '+44': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%2301246d"/><rect x="10" width="2" height="16" fill="%23ffffff"/><rect y="7" width="22" height="2" fill="%23ffffff"/><rect x="10.4" width="1.2" height="16" fill="%23c8102e"/><rect y="7.4" width="22" height="1.2" fill="%23c8102e"/></svg>',
    '+1': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%2300247c"/><rect y="4" width="22" height="8" fill="%23ffffff"/></svg>',
    '+213': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23007a3d"/><polygon points="4,4 13,8 4,12" fill="%23ffffff"/></svg>',
    '+216': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23d21034"/><circle cx="11" cy="8" r="4" fill="%23ffffff"/><circle cx="11" cy="8" r="2" fill="%23d21034"/></svg>',
    '+93': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23d32011"/><polygon points="11,2 12.8,7.5 17.8,7.5 13.8,10.5 15.6,16 11,13 6.4,16 8.2,10.5 4.2,7.5 9.2,7.5" fill="%23ffffff"/></svg>',
    '+355': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16"><rect width="22" height="16" fill="%23ed1c24"/><rect y="4" width="22" height="8" fill="%23000000"/><polygon points="11,2 11,14" stroke="%23ffffff" stroke-width="1"/></svg>'
  };

  // Fonction de navigation
  function goToStep(step) {
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step').forEach(el => {
      el.classList.remove('active');
      if (parseInt(el.dataset.step, 10) < step) el.classList.add('completed');
      else el.classList.remove('completed');
    });
    const targetContent = document.querySelector(`.step-content[data-step="${step}"]`);
    const targetStep = document.querySelector(`.step[data-step="${step}"]`);
    if (targetContent) targetContent.classList.add('active');
    if (targetStep) targetStep.classList.add('active');
    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Boutons next/back
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.next || currentStep + 1, 10);
      if (next <= totalSteps) goToStep(next);
    });
  });
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      const prev = parseInt(btn.dataset.prev || currentStep - 1, 10);
      if (prev >= 1) goToStep(prev);
    });
  });
  document.querySelectorAll('.step').forEach(stepEl => {
    stepEl.addEventListener('click', () => {
      const stepNum = parseInt(stepEl.dataset.step, 10);
      if (stepNum <= currentStep) goToStep(stepNum);
    });
  });

  function normalizePhoneForWhatsApp(dial, localValue) {
    const dialDigits = String(dial || '').replace(/\D/g, '');
    let localDigits = String(localValue || '').replace(/\D/g, '');
    localDigits = localDigits.replace(/^0+/, '');
    if (!dialDigits || !localDigits) return '';
    return `${dialDigits}${localDigits}`;
  }

  function buildWhatsAppMessage(step) {
    const senderName = (document.querySelector('[name="senderName"]')?.value || '').trim();
    const senderCity = (document.querySelector('[name="senderCity"]')?.value || '').trim();
    const orderNumber = (document.querySelector('[name="orderNumber"]')?.value || '').trim();
    const receiverName = (document.querySelector('[name="receiverName"]')?.value || '').trim();
    const parcelsCount = (document.querySelector('[name="parcelsCount"]')?.value || '1').trim();
    const reference = `${orderNumber || 'N/A'}/${parcelsCount || '1'}`;

    if (step === '1') {
      return [
        `Bonjour ${senderName || 'Client'},`,
        'Nous vous remercions pour la confiance que vous nous accordez.',
        `Votre colis a ete enregistre avec succes sous la reference ${reference}.`,
        'Nous prenons en charge votre envoi avec attention et professionnalisme.',
        'Notre equipe reste a votre disposition pour toute information complementaire.',
        'Cordialement,',
        'Service Logistique-Cashmoh',
      ].join('\n');
    }

    return [
      `Bonjour ${receiverName || 'Destinataire'},`,
      `Nous vous informons qu'un colis vous sera livre de la part de ${senderName || 'Expediteur'}, depuis ${senderCity || 'ville non renseignee'}.`,
      `Reference colis : ${reference}`,
      'Merci de votre confiance.',
      'Cordialement,',
      'Service Logistique-Cashmoh',
    ].join('\n');
  }

  // Gestion des champs téléphone
  const KNOWN_DIALS = Object.keys(COUNTRIES || {}).filter(Boolean);
  const KNOWN_DIAL_DIGITS = KNOWN_DIALS
    .map((dial) => String(dial).replace(/\D/g, ''))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const phoneBlocks = document.querySelectorAll('[data-phone-block]');
  phoneBlocks.forEach(block => {
    const dialEl = block.querySelector('input[data-dial]');
    const localInput = block.querySelector('input[data-local]');
    const hiddenFull = block.querySelector('input[type="hidden"][data-full]');
    const waBtn = block.querySelector('button[data-wa]');
    const flagImg = block.querySelector('[data-flagimg]');

    function update() {
      const dial = (dialEl && dialEl.value ? dialEl.value : '').replace(/\s/g, '');
      const rawLocal = String(localInput?.value || '').trim();
      let digits = rawLocal.replace(/\D/g, '');
      if (digits.startsWith('00')) digits = digits.slice(2);

      const dialDigits = dial.replace(/\D/g, '');
      const looksInternational = rawLocal.startsWith('+') || rawLocal.startsWith('00');
      const matchesKnownDial = KNOWN_DIAL_DIGITS.some((cc) => digits.startsWith(cc));
      const matchesSelectedDial =
        dialDigits && digits.startsWith(dialDigits) && digits.length > dialDigits.length + 6;

      if (looksInternational || matchesKnownDial || matchesSelectedDial) {
        hiddenFull.value = digits ? `+${digits}` : '';
      } else {
        hiddenFull.value = dial && digits ? dial + digits : '';
      }
      if (flagImg) flagImg.style.backgroundImage = FLAGS[dial] ? `url('${FLAGS[dial]}')` : '';
    }

    dialEl.addEventListener('dialchange', update);
    localInput.addEventListener('input', update);
    waBtn.addEventListener('click', () => {
      update();
      if (!hiddenFull.value) return;
      const step = block.dataset.step || '2';
      const n = normalizePhoneForWhatsApp(dialEl?.value, localInput?.value);
      if (!n) return;
      const text = encodeURIComponent(buildWhatsAppMessage(step));
      window.open(`https://api.whatsapp.com/send?phone=${n}&text=${text}`, '_blank');
    });
    update();
  });
  window.__ordersPhoneBlocksInitDone = true;

  // Gestion des flag pickers
  document.querySelectorAll('[data-flagpicker]').forEach(picker => {
    const menu = picker.querySelector('[data-menu]');
    const toggle = picker.querySelector('[data-toggle]');
    const dialText = picker.querySelector('[data-dial-text]');
    const flagBox = picker.querySelector('.cc-toggle .flag-svg');
    const hiddenDial = picker.querySelector('input[data-dial]');

    function setDial(val) {
      if (!hiddenDial) return;
      hiddenDial.value = val;
      const countryInfo = COUNTRIES[val];
      if (countryInfo && dialText) {
        dialText.textContent = `${countryInfo.emoji} ${countryInfo.name_ar} ${val}`;
      } else if (dialText) {
        dialText.textContent = val;
      }
      if (flagBox) flagBox.style.backgroundImage = FLAGS[val] ? `url('${FLAGS[val]}')` : '';
      const ev = new Event('dialchange');
      hiddenDial.dispatchEvent(ev);
    }

    picker.querySelectorAll('[data-country]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-dial');
        setDial(val);
        if (menu) menu.hidden = true;
      });
    });

    if (toggle && menu) {
      toggle.addEventListener('click', () => { menu.hidden = !menu.hidden; });
      document.addEventListener('click', (e) => {
        if (!picker.contains(e.target)) menu.hidden = true;
      });
    }

    if (hiddenDial) setDial(hiddenDial.value || '+212');
  });

  // ===== PHOTO PREVIEW =====
  const dropZone = document.getElementById('dropZone');
  const input = document.getElementById('photoInput');
  const preview = document.getElementById('photoPreview');

  if (dropZone && input && preview) {
    preview.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;padding:0;min-height:0;';

    let selectedFiles = [];

    function readFileAsDataURL(file, callback) {
      const reader = new FileReader();
      reader.onload = e => callback(e.target.result);
      reader.onerror = () => callback(null);
      reader.readAsDataURL(file);
    }

    function makeThumb(dataUrl, index) {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;display:inline-flex;flex-shrink:0;';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = 'width:96px;height:96px;object-fit:cover;border-radius:10px;border:2px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.12);display:block;background:#f3f4f6;';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '&times;';
      btn.style.cssText = 'position:absolute;top:-7px;right:-7px;width:22px;height:22px;border-radius:50%;background:#ef4444;color:#fff;border:none;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;z-index:5;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
      btn.addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        syncInput();
        renderAll();
      });

      wrapper.appendChild(img);
      wrapper.appendChild(btn);
      return wrapper;
    }

    function renderAll() {
      preview.innerHTML = '';
      selectedFiles.forEach((item, i) => preview.appendChild(makeThumb(item.dataUrl, i)));
    }

    function syncInput() {
      try {
        const dt = new DataTransfer();
        selectedFiles.forEach(item => dt.items.add(item.file));
        input.files = dt.files;
      } catch (e) {}
    }

    function addFiles(files) {
      const arr = Array.from(files).filter(f => /^image\//.test(f.type) && !selectedFiles.find(ex => ex.file.name === f.name && ex.file.size === f.size));
      if (!arr.length) return;

      let pending = arr.length;
      arr.forEach(file => {
        readFileAsDataURL(file, dataUrl => {
          if (dataUrl) selectedFiles.push({ file, dataUrl });
          pending--;
          if (pending === 0) {
            syncInput();
            renderAll();
          }
        });
      });
    }

    if (typeof existingPhotos !== 'undefined' && Array.isArray(existingPhotos) && existingPhotos.length) {
      existingPhotos.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:96px;height:96px;object-fit:cover;border-radius:10px;border:2px solid #e5e7eb;display:block;';
        preview.appendChild(img);
      });
    }

    input.addEventListener('change', () => addFiles(input.files));

    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.style.background = '#f0f5ff';
      dropZone.style.borderColor = '#6366f1';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.background = '#fafafa';
      dropZone.style.borderColor = '#d1d5db';
    });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.background = '#fafafa';
      dropZone.style.borderColor = '#d1d5db';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        addFiles(e.dataTransfer.files);
      }
    });
  }

 

  // ===== VALIDATION DES ÉTAPES =====
  function validateStep(step) {
    if (step === 1) {
      const name = document.querySelector('input[name="senderName"]');
      const city = document.querySelector('select[name="senderCity"]');
      const phone = document.querySelector('[data-step="1"] input[type="hidden"][data-full]');
      const nextBtn = document.getElementById('continueBtn1') || document.querySelector('.step-content[data-step="1"] .btn-next');
      const ok = !!(name && name.value.trim() && city && city.value && phone && phone.value);
      if (nextBtn) nextBtn.disabled = !ok;
      return ok;
    }
    if (step === 2) {
      const name = document.querySelector('input[name="receiverName"]');
      const city = document.querySelector('select[name="receiverCity"]');
      const phone = document.querySelector('[data-step="2"] input[type="hidden"][data-full]');
      const nextBtn = document.querySelector('.step-content[data-step="2"] .btn-next');
      const ok = !!(name && name.value.trim() && city && city.value && phone && phone.value);
      if (nextBtn) nextBtn.disabled = !ok;
      return ok;
    }
    return true;
  }

  ['senderName', 'receiverName'].forEach(n => {
    const el = document.querySelector(`input[name="${n}"]`);
    if (el) el.addEventListener('input', () => validateStep(currentStep));
  });
  ['senderCity', 'receiverCity'].forEach(n => {
    const el = document.querySelector(`select[name="${n}"]`);
    if (el) el.addEventListener('change', () => validateStep(currentStep));
  });
  document.querySelectorAll('[data-phone-block] input[data-local]').forEach(el => {
    el.addEventListener('input', () => validateStep(currentStep));
  });

  validateStep(1);
});
