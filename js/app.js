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
  const retry = document.getElementById('retry-gps');
  if (!disp) return;

  if (state.locationStatus === 'loading') {
    disp.textContent = 'Detecting location…';
    coords.textContent = '';
    retry.style.display = 'none';
  } else if (state.locationStatus === 'ok' && state.location) {
    disp.textContent = state.location.address || 'Location detected';
    coords.textContent = `${state.location.lat.toFixed(5)}°N, ${state.location.lng.toFixed(5)}°W`;
    retry.style.display = 'none';
  } else {
    disp.textContent = 'Location unavailable';
    coords.textContent = '';
    retry.style.display = 'inline';
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
      <div class="card-row">
        <span class="row-label">Location</span>
        <div style="text-align:right">
          <div id="location-display" style="font-size:14px;color:var(--text-secondary);max-width:200px">Detecting…</div>
          <div id="gps-coords" style="font-size:11px;color:var(--text-tertiary);margin-top:2px"></div>
          <button class="retry-btn" id="retry-gps" style="display:none">Retry</button>
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

    <button id="submit-btn">Open Official Complaint Form ↗</button>
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

  // Retry GPS
  document.getElementById('retry-gps').addEventListener('click', getLocation);

  // Time tap
  document.getElementById('time-display').addEventListener('click', openTimePicker);

  // Toggles
  document.getElementById('formal-toggle').addEventListener('change', e => { state.formal = e.target.checked; });
  document.getElementById('anon-toggle').addEventListener('change', e => { state.anonymous = e.target.checked; });

  // Notes
  document.getElementById('notes-area').addEventListener('input', e => { state.notes = e.target.value; });

  // Submit
  document.getElementById('submit-btn').addEventListener('click', showRefCard);
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
