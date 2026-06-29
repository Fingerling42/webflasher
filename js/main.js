document.addEventListener("DOMContentLoaded", () => {


  // description message
  const msgContainer = document.querySelector('.description');
  const msg = document.querySelector('.msg');
  const langSelect = document.querySelector('#lang-select');
  const unsupportedMain = document.querySelector('#unsupported-main');
  const unsupportedSub = document.querySelector('#unsupported-sub');
  const docsLink = document.querySelector('#docs-link');
  const unsupportedConnectBtn = document.querySelector('.btn-unsupported');
  const connectBtn = document.querySelector('.select-wrapper esp-web-install-button .btn');

  // select with chips
  const chips = document.querySelector('select[name="chip"]');

  // select with firmware 
  const firmware = document.querySelector('select[name="firmware"]');
  const firmwareOptions = document.querySelectorAll('option[data-firmware-key]');

  let unsupported = false;
  let currentLang = 'en';
  let activeManifestKey = '';
  let activeManifestDefaultDescription = '';
  let activeManifestMetadata = {};
  const i18n = window.WEBFLASHER_I18N || {
    en: { selectChip: 'Select chip', manifestDescriptions: {}, firmwareLabels: {} }
  };

  const setChipPlaceholder = () => {
    chips.innerHTML = `<option class="placeholder" value="" disabled selected>${i18n[currentLang].selectChip}</option>`;
  };

  const updateChipPlaceholderText = () => {
    const placeholder = chips.querySelector('option.placeholder');
    if (placeholder) {
      placeholder.textContent = i18n[currentLang].selectChip;
    }
  };

  const isLocalizedFirmware = (firmwareKey) => firmwareKey.includes('_EN') || firmwareKey.includes('_RU');

  const isFirmwareAllowedForLang = (firmwareKey, lang) => {
    if (!isLocalizedFirmware(firmwareKey)) {
      return true;
    }

    if (lang === 'ru') {
      return firmwareKey.includes('_RU');
    }

    return firmwareKey.includes('_EN');
  };

  const resetFirmwareSelectionUI = () => {
    firmware.selectedIndex = 0;
    msgContainer.textContent = '';
    msg.classList.add('invisible');
    activeManifestKey = '';
    activeManifestDefaultDescription = '';
    activeManifestMetadata = {};
    setChipPlaceholder();
    chips.style.display = "block";
    document.querySelector('.select-wrapper').querySelector('esp-web-install-button').classList.remove('ready');
  };

  const applyFirmwareVisibilityByLang = (lang) => {
    let hasSelectedAllowedOption = false;
    const selectedKey = firmware.value;

    firmwareOptions.forEach((option) => {
      const key = option.getAttribute('data-firmware-key');
      const allowed = isFirmwareAllowedForLang(key, lang);
      option.hidden = !allowed;
      option.disabled = !allowed;

      if (allowed && key === selectedKey) {
        hasSelectedAllowedOption = true;
      }
    });

    if (selectedKey && !hasSelectedAllowedOption) {
      resetFirmwareSelectionUI();
    }
  };

  const applyLanguage = (lang) => {
    currentLang = i18n[lang] ? lang : 'en';
    const t = i18n[currentLang];

    document.documentElement.lang = t.htmlLang;
    document.querySelector('label[for="lang-select"]').textContent = t.languageLabel;
    firmware.options[0].textContent = t.selectFirmware;
    updateChipPlaceholderText();
    unsupportedMain.textContent = t.unsupportedMain;
    unsupportedSub.textContent = t.unsupportedSub;
    unsupportedConnectBtn.textContent = t.connect;
    connectBtn.textContent = t.connect;
    docsLink.textContent = t.docs;

    firmwareOptions.forEach((option) => {
      const key = option.getAttribute('data-firmware-key');
      option.textContent = t.firmwareLabels[key] || option.textContent;
    });
    applyFirmwareVisibilityByLang(currentLang);
    renderManifestMessage();

    localStorage.setItem('webflasher-lang', currentLang);
    if (langSelect.value !== currentLang) {
      langSelect.value = currentLang;
    }
  };

  const resolveInitialLang = () => {
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang && i18n[urlLang]) {
      return urlLang;
    }

    const savedLang = localStorage.getItem('webflasher-lang');
    if (savedLang && i18n[savedLang]) {
      return savedLang;
    }

    const browserLang = (navigator.language || '').toLowerCase();
    return browserLang.startsWith('ru') ? 'ru' : 'en';
  };

  const getLocalizedManifestDescription = (manifest, defaultDescription) => {
    const description = i18n[currentLang].manifestDescriptions[manifest];
    return description || defaultDescription;
  };

  const shouldShowUrbanC3Notice = () => {
    const isUrbanFirmware = activeManifestKey.startsWith('Altruist_URBAN');
    return isUrbanFirmware && chips.value === 'ESP32-C3';
  };

  const normalizeManifestMetadata = (manifestResult) => {
    const normalizeValue = (value, ignoredValues = []) => {
      const text = typeof value === 'string' ? value.trim() : '';
      if (!text || ignoredValues.includes(text.toLowerCase())) {
        return '';
      }
      return text;
    };

    return {
      channel: normalizeValue(manifestResult.channel),
      version: normalizeValue(manifestResult.version, ['legacy build']),
      commit: normalizeValue(manifestResult.commit, ['unknown']),
    };
  };

  const renderManifestMessage = () => {
    if (!activeManifestKey || unsupported) {
      return;
    }

    const baseDescription = getLocalizedManifestDescription(activeManifestKey, activeManifestDefaultDescription);
    const notice = shouldShowUrbanC3Notice() ? i18n[currentLang].urbanC3Notice : '';
    const lines = [baseDescription];

    if (activeManifestMetadata.channel === 'testing') {
      lines.push(i18n[currentLang].testingWarning);
    }

    const buildInfo = [];
    if (activeManifestMetadata.version) {
      buildInfo.push(`${i18n[currentLang].versionLabel}: ${activeManifestMetadata.version}`);
    }
    if (activeManifestMetadata.commit) {
      buildInfo.push(`${i18n[currentLang].commitLabel}: ${activeManifestMetadata.commit}`);
    }
    if (buildInfo.length) {
      lines.push(buildInfo.join(' | '));
    }
    if (notice) {
      lines.push(notice);
    }

    msgContainer.textContent = lines.join('\n\n');
  };



  firmware.addEventListener("change", (e) => {
    addManifestInfo(e.target.value)
  });

  chips.addEventListener("change", (e) => {
    const button = document.querySelector('.select-wrapper').querySelector('esp-web-install-button');
    button.classList.add('ready');
    renderManifestMessage();
  });


  // displaying all needed information
  const addManifestInfo = async (manifest) => {

    const manifestJSON = await fetch(`./manifest/${manifest}.manifest.json`, { cache: 'no-store' })
    const manifestResult = await manifestJSON.json();
    const manifestMetadata = normalizeManifestMetadata(manifestResult);
    const manifestCacheKey = [manifestMetadata.version, manifestMetadata.commit]
      .filter(Boolean)
      .join('-');
    const manifestURL = `./manifest/${manifest}.manifest.json`;
    const button = document.querySelector('.select-wrapper').querySelector('esp-web-install-button');
    button.manifest = manifestCacheKey
      ? `${manifestURL}?v=${encodeURIComponent(manifestCacheKey)}`
      : manifestURL;

    setChipPlaceholder();
    chips.style.display="block"
    button.classList.remove('ready')

    // adding chip options
    const options = manifestResult.builds;
    if(options.length) {
      options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.chipFamily;
        opt.textContent = option.chipLabel || option.chipFamily;
        chips.appendChild(opt);
      })
    } else {
      button.classList.add('ready')
      chips.style.display="none";
    }

    // display information above selects
    activeManifestKey = manifest;
    activeManifestDefaultDescription = manifestResult.description;
    activeManifestMetadata = manifestMetadata;

    msg.classList.remove('invisible');


    if(!unsupported) {
      renderManifestMessage();

      // if need to add some specific styling or additional tag to specific manifest
      if(manifest === 'airrohr-firmware_en') {
        const a = document.createElement('a');
        a.innerText = i18n[currentLang].readWiki;
        a.href = "#"
        msgContainer.append(a)
      }

      
    }
 
  }

  const checkSupport = () => {
    const btn = msg.querySelector('esp-web-install-button');
    const btnAttrs = btn.getAttributeNames();


    btnAttrs.map(attr => {
      if(attr === 'install-unsupported') {
        unsupported = true;

        chips.setAttribute('disabled', true)
        firmware.setAttribute('disabled', true)
        msg.classList.add('unsupported')
        msg.classList.remove('invisible')
        btn.classList.remove('invisible');
        document.querySelector('.btn-unsupported').style.display = 'block';
      }
    })
  }


  // custom scroll bar initialization
  new SimpleBar(document.getElementById('customBar'), {
    autoHide: false,
  });

  applyLanguage(resolveInitialLang());
  langSelect.addEventListener('change', (e) => {
    applyLanguage(e.target.value);
  });
  checkSupport();

})
