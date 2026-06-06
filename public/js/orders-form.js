document.addEventListener('DOMContentLoaded', () => {
  // Navigation stepper
  let currentStep = 1;
  const totalSteps = document.querySelectorAll('.step-content').length;

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

  // Gestion des téléphones
  const KNOWN_DIALS = Array.from(
    new Set(['+212', '+33', '+34', '+39', '+49', '+44', '+1', '+32', '+31'])
  );
  const KNOWN_DIAL_DIGITS = KNOWN_DIALS
    .map((dial) => String(dial).replace(/\D/g, ''))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const phoneBlocks = document.querySelectorAll('[data-phone-block]');
  phoneBlocks.forEach(block => {
    const dialEl = block.querySelector('input[data-dial]');
    const localInput = block.querySelector('input[data-local]');
    const hiddenFull = block.querySelector('input[data-full]');
    const waBtn = block.querySelector('[data-wa]');

    function update() {
      const dial = (dialEl ? dialEl.value : '').replace(/\s/g, '');
      const rawLocal = String(localInput?.value || '').trim();
      let digits = rawLocal.replace(/\D/g, '');
      if (digits.startsWith('00')) digits = digits.slice(2);

      const dialDigits = dial.replace(/\D/g, '');
      const looksInternational = rawLocal.startsWith('+') || rawLocal.startsWith('00');
      const matchesKnownDial = KNOWN_DIAL_DIGITS.some((cc) => digits.startsWith(cc));
      const matchesSelectedDial =
        dialDigits && digits.startsWith(dialDigits) && digits.length > dialDigits.length + 6;

      if (hiddenFull) {
        if (looksInternational || matchesKnownDial || matchesSelectedDial) {
          hiddenFull.value = digits ? `+${digits}` : '';
        } else {
          hiddenFull.value = dial && digits ? dial + digits : '';
        }
      }
    }

    if (dialEl) dialEl.addEventListener('change', update);
    if (localInput) localInput.addEventListener('input', update);
    if (waBtn) {
      waBtn.addEventListener('click', () => {
        update();
        if (hiddenFull && hiddenFull.value) {
          const phone = normalizePhoneForWhatsApp(dialEl?.value, localInput?.value);
          if (!phone) return;
          const step = block.dataset.step || '2';
          const text = encodeURIComponent(buildWhatsAppMessage(step));
          window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
        }
      });
    }
    update();
  });

  // Flag pickers
  document.querySelectorAll('[data-flagpicker]').forEach(picker => {
    const menu = picker.querySelector('[data-menu]');
    const toggle = picker.querySelector('[data-toggle]');
    const dialText = picker.querySelector('[data-dial-text]');
    const hiddenDial = picker.querySelector('input[data-dial]');

    function setDial(val) {
      if (hiddenDial) hiddenDial.value = val;
      if (dialText) dialText.textContent = val;
      const event = new Event('change');
      if (hiddenDial) hiddenDial.dispatchEvent(event);
    }

    if (menu) {
      menu.querySelectorAll('[data-country]').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-dial');
          setDial(val);
          menu.hidden = true;
        });
      });
    }

    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        menu.hidden = !menu.hidden;
      });
      document.addEventListener('click', (e) => {
        if (!picker.contains(e.target)) menu.hidden = true;
      });
    }
  });

  // Upload photos
  const dropZone = document.getElementById('dropZone');
  const input = document.getElementById('photoInput');
  const preview = document.getElementById('photoPreview');
  let selectedFiles = [];

  if (dropZone && input && preview) {
    function renderPreview() {
      preview.innerHTML = '';
      selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const div = document.createElement('div');
          div.style.position = 'relative';
          div.style.display = 'inline-block';
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.width = '96px';
          img.style.height = '96px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '8px';
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '×';
          removeBtn.style.position = 'absolute';
          removeBtn.style.top = '-8px';
          removeBtn.style.right = '-8px';
          removeBtn.style.width = '22px';
          removeBtn.style.height = '22px';
          removeBtn.style.borderRadius = '50%';
          removeBtn.style.background = '#ef4444';
          removeBtn.style.color = 'white';
          removeBtn.style.border = 'none';
          removeBtn.style.cursor = 'pointer';
          removeBtn.onclick = () => {
            selectedFiles.splice(index, 1);
            updateInput();
            renderPreview();
          };
          div.appendChild(img);
          div.appendChild(removeBtn);
          preview.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    }

    function updateInput() {
      const dt = new DataTransfer();
      selectedFiles.forEach(f => dt.items.add(f));
      input.files = dt.files;
    }

    input.addEventListener('change', () => {
      selectedFiles = Array.from(input.files);
      renderPreview();
    });

    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#3b82f6';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '#d1d5db';
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#d1d5db';
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      selectedFiles.push(...files);
      updateInput();
      renderPreview();
    });

    if (typeof existingPhotos !== 'undefined' && existingPhotos.length) {
      existingPhotos.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.style.width = '96px';
        img.style.height = '96px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        preview.appendChild(img);
      });
    }
  }
});
