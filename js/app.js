'use strict';

// ── State ──────────────────────────────────────────────────────────────────

const state = {
  complaintType: 'noise',      // 'noise' | 'pollution'
  equipment: 'gas-backpack',   // equipment key
  count: 1,
  location: null,              // { address, lat, lng }
  locationStatus: 'idle',      // 'idle' | 'loading' | 'ok' | 'error'
  complaintTime: new Date(),   // Date object
  notes: '',
  formal: true,
  anonymous: false,
  profile: loadProfile(),
};

const EQUIPMENT_OPTIONS = [
  { value: 'gas-backpack',  label: 'Gas backpack leaf blower' },
  { value: 'gas-handheld',  label: 'Gas handheld leaf blower' },
  { value: 'gas-wheeled',   label: 'Gas wheeled leaf blower' },
  { value: 'gas-other',     label: 'Other gas-powered equipment' },
];

const RESIDENT_OPTIONS = [
  { value: 'resident',        label: 'Portland resident' },
  { value: 'property-owner',  label: 'Property owner in Portland' },
  { value: 'business',        label: 'Business operator in Portland' },
];

// ── Capacitor WebForm plugin (native WKWebView for in-app form) ────────────

let WebFormPlugin = null;

function getWebFormPlugin() {
  if (!WebFormPlugin && window.Capacitor && window.Capacitor.registerPlugin) {
    WebFormPlugin = window.Capacitor.registerPlugin('WebFormPlugin', {
      web: {
        openForm: () => {
          window.open('https://www.portland.gov/ppd/noise/noise-concerns', '_blank');
          return Promise.resolve();
        }
      }
    });
  }
  return WebFormPlugin;
}

// ── Profile persistence ────────────────────────────────────────────────────

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem('pdx_profile') || '{}');
  } catch {
    return {};
  }
}

function saveProfile() {
  localStorage.setItem('pdx_profile', JSON.stringify(state.profile));
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  buildComplaintView();
  buildProfileView();
  bindTabs();
  bindRefCard();
  getLocation();
  startClock();
});

// ── Tab navigation ─────────────────────────────────────────────────────────

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${target}`));
      if (target === 'profile') renderProfileView();
    });
  });
}

// ── Clock ──────────────────────────────────────────────────────────────────

let timeOffset = 0; // minutes offset from now

function startClock() {
  updateTimeDisplay();
  setInterval(() => {
    if (timeOffset === 0) {
      state.complaintTime = new Date();
      updateTimeDisplay();
    }
  }, 30000);
}

function updateTimeDisplay() {
  const el = document.getElementById('time-display');
  if (el) el.textContent = formatTime(state.complaintTime);
}

function formatTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// ── GPS ────────────────────────────────────────────────────────────────────

function getLocation() {
  state.locationStatus = 'loading';
  renderLocationRow();

  const opts = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 };

  if (!navigator.geolocation) {
    state.locationStatus = 'error';
    state.location = null;
    renderLocationRow();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const address = await reverseGeocode(lat, lng);
      state.location = { lat, lng, address };
      state.locationStatus = 'ok';
      renderLocationRow();
    },
    () => {
      state.locationStatus = 'error';
      renderLocationRow();
    },
    opts
  );
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    const a = data.address || {};
    const street = [a.house_number, a.road].filter(Boolean).join(' ');
    const city = a.city || a.town || a.village || 'Portland';
    const state_abbr = a.state_code || a.state || 'OR';
    return [street, city, state_abbr].filter(Boolean).join(', ');
  } catch {
    return null;
  }
}

function renderLocationRow() {
  const disp = document.getElementById('location-display');
  const coords = document.getElementById('gps-coords');
  if (!disp) return;

  if (state.locationStatus === 'loading') {
    disp.textContent = 'Detecting…';
    coords.textContent = '';
  } else if (state.locationStatus === 'ok' && state.location) {
    disp.textContent = state.location.address || 'Location set';
    coords.textContent = `${state.location.lat.toFixed(5)}°N, ${Math.abs(state.location.lng).toFixed(5)}°W`;
  } else {
    disp.textContent = 'Tap to set location';
    coords.textContent = '';
  }
}

// ── Build complaint view ───────────────────────────────────────────────────

function buildComplaintView() {
  const view = document.getElementById('view-complaint');

  view.innerHTML = `
    <div class="section-header">Complaint Type</div>
    <div class="card">
      <div class="card-row">
        <div class="segmented-control" id="type-seg">
          <button class="seg-btn active" data-type="noise">Noise</button>
          <button class="seg-btn" data-type="pollution">Pollution</button>
        </div>
      </div>
    </div>

    <div class="section-header">Equipment</div>
    <div class="card">
      <div class="card-row">
        <span class="row-label">Type</span>
        <select class="ios-select" id="equipment-select">
          ${EQUIPMENT_OPTIONS.map(o => `<option value="${o.value}"${o.value === state.equipment ? ' selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
      <div class="card-row">
        <span class="row-label">Count</span>
        <div class="stepper">
          <button class="stepper-btn" id="count-minus">−</button>
          <span class="stepper-value" id="count-val">${state.count}</span>
          <button class="stepper-btn" id="count-plus">+</button>
        </div>
      </div>
    </div>

    <div class="section-header">Location &amp; Time</div>
    <div class="card">
      <div class="card-row tappable" id="location-row">
        <span class="row-label">Location</span>
        <div style="text-align:right;display:flex;align-items:center;gap:6px">
          <div>
            <div id="location-display" style="font-size:14px;color:var(--text-secondary);max-width:180px">Detecting…</div>
            <div id="gps-coords" style="font-size:11px;color:var(--text-tertiary);margin-top:2px"></div>
          </div>
          <span style="color:var(--text-tertiary);font-size:20px;line-height:1;flex-shrink:0">›</span>
        </div>
      </div>
      <div class="card-row">
        <span class="row-label">Date</span>
        <span class="row-value" id="date-display">${formatDate(state.complaintTime)}</span>
      </div>
      <div class="card-row">
        <span class="row-label">Time</span>
        <span id="time-display" style="font-size:15px;color:var(--text-secondary);cursor:pointer;border-bottom:1px solid var(--accent-color);padding-bottom:1px">${formatTime(state.complaintTime)}</span>
      </div>
    </div>

    <div class="section-header">Options</div>
    <div class="card">
      <div class="toggle-row">
        <span class="toggle-label">Formal complaint</span>
        <label class="toggle">
          <input type="checkbox" id="formal-toggle" ${state.formal ? 'checked' : ''}>
          <span class="toggle-track"></span>
        </label>
      </div>
      <div class="toggle-row">
        <span class="toggle-label">Wish to be anonymous</span>
        <label class="toggle">
          <input type="checkbox" id="anon-toggle" ${state.anonymous ? 'checked' : ''}>
          <span class="toggle-track"></span>
        </label>
      </div>
    </div>

    <div class="section-header">Notes (optional)</div>
    <div class="card">
      <textarea class="notes-area" id="notes-area" placeholder="Additional details about the violation…" rows="3"></textarea>
    </div>

    <button id="submit-btn">Submit Complaint</button>
  `;

  bindComplaintEvents();
}

function bindComplaintEvents() {
  // Type segmented control
  document.querySelectorAll('#type-seg .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.complaintType = btn.dataset.type;
      document.querySelectorAll('#type-seg .seg-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Equipment
  document.getElementById('equipment-select').addEventListener('change', e => {
    state.equipment = e.target.value;
  });

  // Count stepper
  document.getElementById('count-minus').addEventListener('click', () => {
    if (state.count > 1) { state.count--; document.getElementById('count-val').textContent = state.count; }
    document.getElementById('count-minus').disabled = state.count <= 1;
  });
  document.getElementById('count-plus').addEventListener('click', () => {
    if (state.count < 10) { state.count++; document.getElementById('count-val').textContent = state.count; }
    document.getElementById('count-minus').disabled = false;
  });
  document.getElementById('count-minus').disabled = state.count <= 1;

  // Location row → open picker
  document.getElementById('location-row').addEventListener('click', openLocationPicker);

  // Time tap
  document.getElementById('time-display').addEventListener('click', openTimePicker);

  // Toggles
  document.getElementById('formal-toggle').addEventListener('change', e => { state.formal = e.target.checked; });
  document.getElementById('anon-toggle').addEventListener('change', e => { state.anonymous = e.target.checked; });

  // Notes
  document.getElementById('notes-area').addEventListener('input', e => { state.notes = e.target.value; });

  // Submit
  document.getElementById('submit-btn').addEventListener('click', submitComplaint);
}

// ── Time picker ────────────────────────────────────────────────────────────

function openTimePicker() {
  const overlay = document.getElementById('time-picker-overlay');
  const input = document.getElementById('time-input');
  // Set current time as HH:MM for input
  const h = state.complaintTime.getHours().toString().padStart(2, '0');
  const m = state.complaintTime.getMinutes().toString().padStart(2, '0');
  input.value = `${h}:${m}`;
  // Clear active offset buttons
  document.querySelectorAll('.time-offset-btn').forEach(b => b.classList.remove('active'));
  overlay.classList.add('visible');
}

function bindTimePicker() {
  document.querySelectorAll('.time-offset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.dataset.offset, 10);
      const now = new Date();
      state.complaintTime = new Date(now.getTime() + mins * 60000);
      timeOffset = mins;
      document.getElementById('time-input').value =
        state.complaintTime.getHours().toString().padStart(2,'0') + ':' +
        state.complaintTime.getMinutes().toString().padStart(2,'0');
      document.querySelectorAll('.time-offset-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('time-input').addEventListener('change', e => {
    const [h, m] = e.target.value.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    state.complaintTime = d;
    timeOffset = null; // manual
    document.querySelectorAll('.time-offset-btn').forEach(b => b.classList.remove('active'));
  });

  document.getElementById('time-confirm-btn').addEventListener('click', () => {
    updateTimeDisplay();
    document.getElementById('date-display').textContent = formatDate(state.complaintTime);
    document.getElementById('time-picker-overlay').classList.remove('visible');
  });
}

// ── Location picker ────────────────────────────────────────────────────────

const PORTLAND_CENTER = [45.5051, -122.6750];

let locMap = null;
let locMarker = null;
let pickerLocation = null;

function openLocationPicker() {
  const overlay = document.getElementById('location-picker-overlay');
  overlay.classList.add('visible');
  document.getElementById('lp-address-input').value = '';

  const center = state.location
    ? [state.location.lat, state.location.lng]
    : PORTLAND_CENTER;

  pickerLocation = state.location ? { ...state.location } : null;

  if (!locMap) {
    locMap = L.map('lp-map', { zoomControl: true }).setView(center, 17);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(locMap);

    locMarker = L.marker(center, { draggable: true }).addTo(locMap);

    locMarker.on('dragend', async () => {
      const pos = locMarker.getLatLng();
      updatePickerAddressDisplay('Looking up address…', null, null);
      const address = await reverseGeocode(pos.lat, pos.lng);
      pickerLocation = { lat: pos.lat, lng: pos.lng, address };
      updatePickerAddressDisplay(address, pos.lat, pos.lng);
    });

    locMap.on('click', async e => {
      locMarker.setLatLng(e.latlng);
      updatePickerAddressDisplay('Looking up address…', null, null);
      const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      pickerLocation = { lat: e.latlng.lat, lng: e.latlng.lng, address };
      updatePickerAddressDisplay(address, e.latlng.lat, e.latlng.lng);
    });
  } else {
    locMap.setView(center, 17);
    locMarker.setLatLng(center);
  }

  if (pickerLocation) {
    updatePickerAddressDisplay(pickerLocation.address, pickerLocation.lat, pickerLocation.lng);
  } else {
    updatePickerAddressDisplay(null, null, null);
  }

  setTimeout(() => { if (locMap) locMap.invalidateSize(); }, 120);
}

function updatePickerAddressDisplay(address, lat, lng) {
  const el = document.getElementById('lp-address-display');
  if (!el) return;
  if (!address && lat === null) {
    el.textContent = address || 'Tap the map or drag the pin to set location';
    return;
  }
  const coordStr = (lat !== null && lng !== null)
    ? `${lat.toFixed(5)}°N, ${Math.abs(lng).toFixed(5)}°W`
    : '';
  el.innerHTML = address
    ? `<strong>${address}</strong>${coordStr ? `<br><span style="font-size:12px;color:var(--text-tertiary)">${coordStr}</span>` : ''}`
    : coordStr || 'Tap the map or drag the pin to set location';
}

function bindLocationPicker() {
  document.getElementById('lp-cancel').addEventListener('click', () => {
    document.getElementById('location-picker-overlay').classList.remove('visible');
  });

  document.getElementById('lp-done').addEventListener('click', () => {
    if (pickerLocation) {
      state.location = { ...pickerLocation };
      state.locationStatus = 'ok';
      renderLocationRow();
    }
    document.getElementById('location-picker-overlay').classList.remove('visible');
  });

  document.getElementById('lp-gps-btn').addEventListener('click', () => {
    updatePickerAddressDisplay('Getting GPS location…', null, null);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        updatePickerAddressDisplay('Looking up address…', null, null);
        const address = await reverseGeocode(lat, lng);
        pickerLocation = { lat, lng, address };
        updatePickerAddressDisplay(address, lat, lng);
        if (locMap && locMarker) {
          locMap.setView([lat, lng], 17);
          locMarker.setLatLng([lat, lng]);
        }
      },
      () => { updatePickerAddressDisplay('GPS unavailable. Tap map to place pin manually.', null, null); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  document.getElementById('lp-search-btn').addEventListener('click', searchAddress);
  document.getElementById('lp-address-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.target.blur(); searchAddress(); }
  });
}

async function searchAddress() {
  const query = document.getElementById('lp-address-input').value.trim();
  if (!query) return;
  updatePickerAddressDisplay('Searching…', null, null);
  try {
    const q = encodeURIComponent(query.includes('Portland') ? query : query + ', Portland, OR');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (!data.length) {
      updatePickerAddressDisplay('Address not found. Try a different search.', null, null);
      return;
    }
    const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
    const address = await reverseGeocode(lat, lng);
    pickerLocation = { lat, lng, address };
    updatePickerAddressDisplay(address, lat, lng);
    if (locMap && locMarker) {
      locMap.setView([lat, lng], 17);
      locMarker.setLatLng([lat, lng]);
    }
  } catch {
    updatePickerAddressDisplay('Search failed. Check your connection.', null, null);
  }
}

// ── Build profile view ─────────────────────────────────────────────────────

function buildProfileView() {
  const view = document.getElementById('view-profile');

  view.innerHTML = `
    <div class="section-header">Your Information</div>
    <div class="card" id="profile-card">
      <div class="card-row">
        <span class="row-label">First name</span>
        <input class="profile-input" type="text" id="p-first" placeholder="Required" autocomplete="given-name">
      </div>
      <div class="card-row">
        <span class="row-label">Last name</span>
        <input class="profile-input" type="text" id="p-last" placeholder="Required" autocomplete="family-name">
      </div>
      <div class="card-row">
        <span class="row-label">Email</span>
        <input class="profile-input" type="email" id="p-email" placeholder="Required" autocomplete="email" inputmode="email">
      </div>
      <div class="card-row">
        <span class="row-label">Phone</span>
        <input class="profile-input" type="tel" id="p-phone" placeholder="Required" autocomplete="tel" inputmode="tel">
      </div>
      <div class="card-row">
        <span class="row-label">Home address</span>
        <input class="profile-input" type="text" id="p-address" placeholder="Portland address" autocomplete="street-address">
      </div>
    </div>

    <div class="section-header">Portland Residency</div>
    <div class="card">
      <div class="card-row">
        <span class="row-label">Status</span>
        <select class="ios-select" id="p-resident">
          ${RESIDENT_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="profile-saved">Saved ✓</div>
  `;

  renderProfileView();
  bindProfileEvents();
}

function renderProfileView() {
  const p = state.profile;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('p-first', p.firstName);
  set('p-last', p.lastName);
  set('p-email', p.email);
  set('p-phone', p.phone);
  set('p-address', p.address);
  const res = document.getElementById('p-resident');
  if (res && p.resident) res.value = p.resident;
}

function bindProfileEvents() {
  const fields = {
    'p-first':    v => state.profile.firstName = v,
    'p-last':     v => state.profile.lastName = v,
    'p-email':    v => state.profile.email = v,
    'p-phone':    v => state.profile.phone = v,
    'p-address':  v => state.profile.address = v,
    'p-resident': v => state.profile.resident = v,
  };

  let saveTimer;
  Object.entries(fields).forEach(([id, setter]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      setter(el.value);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveProfile();
        showProfileSaved();
      }, 800);
    });
    el.addEventListener('change', () => {
      setter(el.value);
      saveProfile();
      showProfileSaved();
    });
  });
}

function showProfileSaved() {
  const el = document.getElementById('profile-saved');
  if (!el) return;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1500);
}

// ── Submit complaint via native WKWebView ──────────────────────────────────

async function submitComplaint() {
  const plugin = getWebFormPlugin();
  const loc = state.location;
  const p = state.profile;

  const data = {
    firstName:       p.firstName || '',
    lastName:        p.lastName  || '',
    email:           p.email     || '',
    phone:           p.phone     || '',
    address:         p.address   || '',
    locationAddress: loc ? (loc.address || '') : '',
    locationLat:     loc ? loc.lat : 0,
    locationLng:     loc ? loc.lng : 0,
    count:           state.count,
    complaintType:   state.complaintType,
    equipment:       equipmentLabel(),
    date:            state.complaintTime.toISOString().split('T')[0],
    time:            state.complaintTime.getHours().toString().padStart(2,'0') + ':' +
                     state.complaintTime.getMinutes().toString().padStart(2,'0'),
    notes:           state.notes,
    formal:          state.formal,
    anonymous:       state.anonymous,
  };

  if (plugin) {
    try {
      await plugin.openForm({ data });
    } catch (e) {
      console.error('WebFormPlugin error:', e);
      window.open('https://www.portland.gov/ppd/noise/noise-concerns', '_blank');
    }
  } else {
    // Running in browser — fall back to opening in tab
    window.open('https://www.portland.gov/ppd/noise/noise-concerns', '_blank');
  }
}

// ── Reference card ─────────────────────────────────────────────────────────

function bindRefCard() {
  document.getElementById('copy-btn').addEventListener('click', copyComplaintText);
  document.getElementById('open-form-btn').addEventListener('click', () => {
    window.open('https://www.portland.gov/ppd/noise/noise-concerns', '_blank');
  });
  document.getElementById('ref-card-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('ref-card-overlay')) {
      document.getElementById('ref-card-overlay').classList.remove('visible');
    }
  });
  document.getElementById('close-ref-btn').addEventListener('click', () => {
    document.getElementById('ref-card-overlay').classList.remove('visible');
  });
}

function equipmentLabel() {
  return EQUIPMENT_OPTIONS.find(o => o.value === state.equipment)?.label || state.equipment;
}

function residentLabel() {
  return RESIDENT_OPTIONS.find(o => o.value === state.profile.resident)?.label || 'Portland resident';
}

function buildComplaintText() {
  const p = state.profile;
  const loc = state.location;
  const lines = [
    '── YOUR INFORMATION ──────────────────────',
    `Name:     ${[p.firstName, p.lastName].filter(Boolean).join(' ') || '(not set)'}`,
    `Address:  ${p.address || '(not set)'}`,
    `Email:    ${p.email || '(not set)'}`,
    `Phone:    ${p.phone || '(not set)'}`,
    `Status:   ${residentLabel()}`,
    '',
    '── THIS COMPLAINT ────────────────────────',
    `Type:     ${state.complaintType === 'noise' ? 'Noise' : 'Pollution'}`,
    `What:     ${equipmentLabel()} × ${state.count}`,
    `Location: ${loc ? loc.address || 'See GPS' : 'Not detected'}`,
    `GPS:      ${loc ? `${loc.lat.toFixed(5)}°N, ${Math.abs(loc.lng).toFixed(5)}°W` : 'Not available'}`,
    `Date:     ${formatDate(state.complaintTime)}`,
    `Time:     ${formatTime(state.complaintTime)}`,
    `Formal:   ${state.formal ? 'Yes' : 'No'}`,
    `Anonymous: ${state.anonymous ? 'Yes' : 'No'}`,
  ];
  if (state.notes) lines.push(`Notes:    ${state.notes}`);
  lines.push('─────────────────────────────────────────');
  return lines.join('\n');
}

function showRefCard() {
  const p = state.profile;
  const loc = state.location;

  const nameVal = [p.firstName, p.lastName].filter(Boolean).join(' ') || '<span style="color:var(--accent-red)">Not set — add in Profile tab</span>';
  const locVal = loc ? (loc.address || 'Location detected') : '<span style="color:var(--accent-orange)">Not detected</span>';
  const gpsVal = loc ? `${loc.lat.toFixed(5)}°N, ${Math.abs(loc.lng).toFixed(5)}°W` : '—';

  document.getElementById('ref-content').innerHTML = `
    <div class="ref-section">
      <div class="ref-section-title">Your Information</div>
      <div class="ref-grid">
        <span class="ref-key">Name</span><span class="ref-val">${nameVal}</span>
        <span class="ref-key">Address</span><span class="ref-val">${p.address || '<span style="color:var(--accent-red)">Not set</span>'}</span>
        <span class="ref-key">Email</span><span class="ref-val">${p.email || '<span style="color:var(--accent-red)">Not set</span>'}</span>
        <span class="ref-key">Phone</span><span class="ref-val">${p.phone || '<span style="color:var(--accent-red)">Not set</span>'}</span>
        <span class="ref-key">Status</span><span class="ref-val">${residentLabel()}</span>
      </div>
    </div>
    <div class="ref-section">
      <div class="ref-section-title">This Complaint</div>
      <div class="ref-grid">
        <span class="ref-key">Type</span><span class="ref-val">${state.complaintType === 'noise' ? 'Noise' : 'Pollution'}</span>
        <span class="ref-key">What</span><span class="ref-val">${equipmentLabel()} × ${state.count}</span>
        <span class="ref-key">Location</span><span class="ref-val">${locVal}</span>
        <span class="ref-key">GPS</span><span class="ref-val" style="font-size:13px;font-variant-numeric:tabular-nums">${gpsVal}</span>
        <span class="ref-key">Date</span><span class="ref-val">${formatDate(state.complaintTime)}</span>
        <span class="ref-key">Time</span><span class="ref-val">${formatTime(state.complaintTime)}</span>
        <span class="ref-key">Formal</span><span class="ref-val">${state.formal ? 'Yes' : 'No'}</span>
        <span class="ref-key">Anonymous</span><span class="ref-val">${state.anonymous ? 'Yes' : 'No'}</span>
        ${state.notes ? `<span class="ref-key">Notes</span><span class="ref-val">${state.notes}</span>` : ''}
      </div>
    </div>
    <p style="font-size:12px;color:var(--text-tertiary);margin-top:8px;line-height:1.5">
      Copy all info then tap "Open Form". In Safari, use Split View to keep this card visible while filling the form.
    </p>
  `;

  document.getElementById('ref-card-overlay').classList.add('visible');
}

async function copyComplaintText() {
  const text = buildComplaintText();
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard ✓');
  } catch {
    // fallback: select from a textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard ✓');
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 2000);
}
