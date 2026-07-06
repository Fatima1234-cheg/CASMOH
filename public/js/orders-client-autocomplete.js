document.addEventListener('DOMContentLoaded', () => {
  const clientsJson = document.getElementById('clients-json');
  const selectedClientId = document.getElementById('selectedClientId');
  const LOOKUP_MIN_DIGITS = 6;
  const LOOKUP_DEBOUNCE_MS = 250;

  if (!clientsJson) {
    return;
  }

  let clients = [];

  try {
    clients = JSON.parse(clientsJson.textContent || '[]');
  } catch (error) {
    clients = [];
  }

  const normalizeDigits = (value) => String(value || '').replace(/\D/g, '');
  const normalizeText = (value) => String(value || '').trim().toLowerCase();

  function getKnownDials(section) {
    const sectionDials = Array.from(
      document.querySelectorAll(`.step-content[data-step="${section.step}"] [data-country][data-dial]`)
    )
      .map((button) => button.getAttribute('data-dial') || '')
      .filter(Boolean);

    return Array.from(new Set(['+212', '+33', '+34', '+39', '+49', '+44', '+1', '+32', '+31', ...sectionDials]))
      .sort((left, right) => normalizeDigits(right).length - normalizeDigits(left).length);
  }

  function splitPhoneValue(rawPhone, section) {
    const normalized = normalizeDigits(rawPhone);
    const preferredDial = section.dialInput?.value || section.defaultDial;
    let dial = preferredDial;
    let local = normalized;

    if (!normalized) {
      return { dial, local: '' };
    }

    const matchedDial = getKnownDials(section).find((item) =>
      normalized.startsWith(normalizeDigits(item))
    );

    if (matchedDial) {
      dial = matchedDial;
      local = normalized.slice(normalizeDigits(matchedDial).length);
    }

    return { dial, local };
  }

  function buildLookupPhone(section) {
    const rawValue = String(section.localInput?.value || '').trim();
    if (!rawValue) {
      return '';
    }

    const rawDigits = normalizeDigits(rawValue);
    const preferredDialDigits = normalizeDigits(section.dialInput?.value || section.defaultDial);
    const typedAsFullNumber =
      rawValue.includes('+') ||
      getKnownDials(section).some((dial) => rawDigits.startsWith(normalizeDigits(dial))) ||
      (preferredDialDigits && rawDigits.startsWith(preferredDialDigits) && rawDigits.length > 9);

    if (typedAsFullNumber) {
      return rawValue;
    }

    const dial = (section.dialInput?.value || section.defaultDial || '').replace(/\s/g, '');
    return dial && rawDigits ? `${dial}${rawDigits}` : rawDigits;
  }

  function getPhoneVariants(value) {
    const digits = normalizeDigits(value);
    if (!digits) {
      return [];
    }

    const variants = new Set([digits, digits.replace(/^0+/, '')]);

    getKnownDials({ step: '1', defaultDial: '+212' })
      .map((dial) => normalizeDigits(dial))
      .filter(Boolean)
      .forEach((code) => {
        if (!digits.startsWith(code)) {
          return;
        }

        const national = digits.slice(code.length).replace(/^0+/, '');
        if (!national) {
          return;
        }

        variants.add(national);
        variants.add(`0${national}`);
      });

    return Array.from(variants).filter(Boolean);
  }

  function phonesMatch(inputValue, clientPhone) {
    const inputVariants = getPhoneVariants(inputValue);
    const clientVariants = getPhoneVariants(clientPhone);

    return inputVariants.some((inputVariant) =>
      clientVariants.some(
        (clientVariant) =>
          clientVariant.includes(inputVariant) || inputVariant.includes(clientVariant)
      )
    );
  }

  function setFieldValue(field, value, eventName = 'input') {
    if (!field || value === undefined || value === null) {
      return;
    }

    field.value = value;
    field.dispatchEvent(new Event(eventName, { bubbles: true }));
  }

  function setSelectValue(select, value) {
    if (!select || !value) {
      return;
    }

    const option = Array.from(select.options).find(
      (item) => normalizeText(item.value) === normalizeText(value)
    );

    if (!option) {
      return;
    }

    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setPhoneFields(section, phone) {
    if (!phone) {
      return;
    }

    const parts = splitPhoneValue(phone, section);

    if (section.dialInput) {
      section.dialInput.value = parts.dial;
      section.dialInput.dispatchEvent(new Event('dialchange', { bubbles: true }));
    }

    if (section.localInput) {
      section.localInput.value = parts.local;
      section.localInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function clearLinkedClient(section) {
    if (section.role === 'sender' && selectedClientId && selectedClientId.value === section.autoFilledClientId) {
      selectedClientId.value = '';
    }

    section.autoFilledClientId = '';
    section.lastResolvedDigits = '';
  }

  function applyClient(section, client) {
    if (!client) {
      return;
    }

    if (section.role === 'sender' && selectedClientId) {
      selectedClientId.value = client._id || '';
    }

    section.autoFilledClientId = client._id || '';
    section.lastResolvedDigits = normalizeDigits(client.phone);

    setFieldValue(section.nameInput, client.name || '');
    setSelectValue(section.citySelect, client.city || '');

    if (client.phone) {
      setPhoneFields(section, client.phone);
    }

    hideDropdown(section);
  }

  function normalizeTypedPhone(section) {
    const currentRawValue = String(section.localInput?.value || '').trim();
    if (!currentRawValue) {
      return;
    }

    const looksLikeFullNumber =
      currentRawValue.includes('+') ||
      getKnownDials(section).some((dial) =>
        normalizeDigits(currentRawValue).startsWith(normalizeDigits(dial))
      );

    if (!looksLikeFullNumber) {
      return;
    }

    setPhoneFields(section, currentRawValue);
  }

  function getMatches(section, query) {
    const normalizedQuery = normalizeDigits(query);
    if (!normalizedQuery.length) {
      return [];
    }

    return clients.filter((client) => phonesMatch(normalizedQuery, client.phone)).slice(0, 8);
  }

  function getExactLocalMatch(query) {
    const normalizedQuery = normalizeDigits(query);
    if (!normalizedQuery.length) {
      return null;
    }

    return (
      clients.find((client) =>
        getPhoneVariants(client.phone).some((variant) => variant === normalizedQuery)
      ) || null
    );
  }

  function hideDropdown(section) {
    if (!section.dropdown) {
      return;
    }

    section.dropdown.hidden = true;
    section.dropdown.innerHTML = '';
    section.activeIndex = -1;
  }

  function renderDropdown(section, matches) {
    if (!section.dropdown) {
      return;
    }

    if (!matches.length) {
      hideDropdown(section);
      return;
    }

    section.dropdown.innerHTML = '';
    section.dropdown.hidden = false;

    matches.forEach((client, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'client-phone-option';
      option.innerHTML = `
        <strong>${client.name || 'Client sans nom'}</strong>
        <span>${client.phone || ''}${client.city ? ` - ${client.city}` : ''}</span>
        ${client.address ? `<span>${client.address}</span>` : ''}
      `;
      option.addEventListener('click', () => applyClient(section, client));

      if (index === section.activeIndex) {
        option.classList.add('active');
      }

      section.dropdown.appendChild(option);
    });
  }

  async function lookupClientByPhone(section, phone) {
    const digits = normalizeDigits(phone);
    if (digits.length < LOOKUP_MIN_DIGITS) {
      return null;
    }

    const requestId = ++section.requestId;

    try {
      const response = await fetch(`/clients/lookup-by-phone?phone=${encodeURIComponent(phone)}`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
      });

      if (requestId !== section.requestId) {
        return null;
      }

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      return payload && payload.success ? payload.client : null;
    } catch (error) {
      return null;
    }
  }

  async function resolveAutofill(section) {
    const lookupPhone = buildLookupPhone(section);
    const lookupDigits = normalizeDigits(lookupPhone);

    if (lookupDigits.length < LOOKUP_MIN_DIGITS) {
      clearLinkedClient(section);
      return;
    }

    const client = (await lookupClientByPhone(section, lookupPhone)) || getExactLocalMatch(lookupPhone);
    if (!client) {
      clearLinkedClient(section);
      return;
    }

    applyClient(section, client);
  }

  function scheduleLookup(section, immediate = false) {
    window.clearTimeout(section.lookupTimer);

    if (immediate) {
      resolveAutofill(section);
      return;
    }

    section.lookupTimer = window.setTimeout(() => {
      resolveAutofill(section);
    }, LOOKUP_DEBOUNCE_MS);
  }

  const sections = [
    {
      role: 'sender',
      step: '1',
      defaultDial: '+212',
      localInput: document.querySelector('[data-client-phone-input="sender"]'),
      dialInput: document.querySelector('.step-content[data-step="1"] input[data-dial]'),
      hiddenInput: document.querySelector('input[name="senderPhone"][data-full]'),
      nameInput: document.querySelector('input[name="senderName"]'),
      citySelect: document.querySelector('select[name="senderCity"]'),
      dropdown: document.querySelector('[data-client-phone-dropdown="sender"]'),
      activeIndex: -1,
      autoFilledClientId: '',
      lastResolvedDigits: '',
      requestId: 0,
      lookupTimer: null,
    },
    {
      role: 'receiver',
      step: '2',
      defaultDial: '+33',
      localInput: document.querySelector('[data-client-phone-input="receiver"]'),
      dialInput: document.querySelector('.step-content[data-step="2"] input[data-dial]'),
      hiddenInput: document.querySelector('input[name="receiverPhone"][data-full]'),
      nameInput: document.querySelector('input[name="receiverName"]'),
      citySelect: document.querySelector('select[name="receiverCity"]'),
      dropdown: document.querySelector('[data-client-phone-dropdown="receiver"]'),
      activeIndex: -1,
      autoFilledClientId: '',
      lastResolvedDigits: '',
      requestId: 0,
      lookupTimer: null,
    },
  ].filter((section) => section.localInput && section.nameInput && section.citySelect);

  if (!sections.length) {
    return;
  }

  sections.forEach((section) => {
    section.localInput.addEventListener('input', () => {
      const lookupPhone = buildLookupPhone(section);
      const matches = getMatches(section, lookupPhone);
      const currentDigits = normalizeDigits(lookupPhone);

      if (section.lastResolvedDigits && currentDigits && currentDigits !== section.lastResolvedDigits) {
        clearLinkedClient(section);
      }

      renderDropdown(section, matches);
      scheduleLookup(section, false);
    });

    section.localInput.addEventListener('blur', () => {
      window.setTimeout(() => {
        hideDropdown(section);
        scheduleLookup(section, true);
      }, 120);
    });

    section.localInput.addEventListener('keydown', (event) => {
      const options = Array.from(section.dropdown?.querySelectorAll('.client-phone-option') || []);
      if (!options.length) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        section.activeIndex = (section.activeIndex + 1) % options.length;
        renderDropdown(section, getMatches(section, buildLookupPhone(section)));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        section.activeIndex = section.activeIndex <= 0 ? options.length - 1 : section.activeIndex - 1;
        renderDropdown(section, getMatches(section, buildLookupPhone(section)));
        return;
      }

      if (event.key === 'Enter' && section.activeIndex >= 0) {
        event.preventDefault();
        const matches = getMatches(section, buildLookupPhone(section));
        applyClient(section, matches[section.activeIndex]);
      }

      if (event.key === 'Escape') {
        hideDropdown(section);
      }
    });

    section.dialInput?.addEventListener('dialchange', () => {
      scheduleLookup(section, false);
    });

    document.addEventListener('click', (event) => {
      if (!section.dropdown?.contains(event.target) && event.target !== section.localInput) {
        hideDropdown(section);
      }
    });
  });
});
