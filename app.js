/* ═══════════════════════════════════════════════════
   FIXORA AI – Application Logic
   ═══════════════════════════════════════════════════ */

'use strict';

// ── Storage Key ────────────────────────────────────────
const STORAGE_KEY = 'fixora_solutions';

// ── DOM References ─────────────────────────────────────
const screens = {
  splash:   document.getElementById('screen-splash'),
  register: document.getElementById('screen-register'),
  scan:     document.getElementById('screen-scan'),
  app:      document.getElementById('screen-app'),
};
const regForm      = document.getElementById('register-form');
const mobileInput  = document.getElementById('mobile');
const emailInput   = document.getElementById('email');
const modelSelect  = document.getElementById('mobile-model');
const chatInput    = document.getElementById('chat-input');
const generateBtn  = document.getElementById('generate-btn');
const clearBtn     = document.getElementById('clear-btn');
const loadingWrap  = document.getElementById('loading-wrap');
const outputCard   = document.getElementById('output-card');
const copyBtn      = document.getElementById('copy-btn');
const searchInput  = document.getElementById('search-input');
const historyList  = document.getElementById('history-list');
const emptyState   = document.getElementById('empty-state');
const historyCount = document.getElementById('history-count');
const scanFill     = document.getElementById('scan-fill');
const navDevice    = document.getElementById('nav-device');

// Result DOM
const resultTitle    = document.getElementById('result-title');
const resultCategory = document.getElementById('result-category');
const resultProblem  = document.getElementById('result-problem');
const resultSteps    = document.getElementById('result-steps');

// Scan messages
const scanMessages = [
  document.getElementById('sm1'),
  document.getElementById('sm2'),
  document.getElementById('sm3'),
  document.getElementById('sm4'),
];

// ── State ──────────────────────────────────────────────
let currentResult = null;
let userData = {};

// ══════════════════════════════════════════════════════
//  SCREEN TRANSITIONS
// ══════════════════════════════════════════════════════
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (key === name) {
      el.classList.remove('exit');
      el.classList.add('active');
    } else {
      el.classList.remove('active');
      el.classList.add('exit');
      setTimeout(() => el.classList.remove('exit'), 600);
    }
  });
}

// ══════════════════════════════════════════════════════
//  SCREEN 1: SPLASH (3 seconds)
// ══════════════════════════════════════════════════════
showScreen('splash');
setTimeout(() => showScreen('register'), 3000);

// ══════════════════════════════════════════════════════
//  SCREEN 2: REGISTRATION VALIDATION
// ══════════════════════════════════════════════════════
function setError(input, errEl, show) {
  if (show) {
    input.classList.add('error');
    errEl.classList.add('visible');
  } else {
    input.classList.remove('error');
    errEl.classList.remove('visible');
  }
}

function validateForm() {
  const mobile = mobileInput.value.trim();
  const email  = emailInput.value.trim();
  const model  = modelSelect.value;

  // Mobile: 7-15 digits, optional leading +
  const mobileOk = /^\+?\d{7,15}$/.test(mobile.replace(/\s/g, ''));
  // Email: must end with @gmail.com
  const emailOk  = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/.test(email);
  const modelOk  = model !== '';

  setError(mobileInput, document.getElementById('mobile-error'), !mobileOk);
  setError(emailInput,  document.getElementById('email-error'),  !emailOk);
  setError(modelSelect, document.getElementById('model-error'),  !modelOk);

  return mobileOk && emailOk && modelOk;
}

// Live validation clear on input
[mobileInput, emailInput, modelSelect].forEach(el => {
  el.addEventListener('input', () => {
    el.classList.remove('error');
    const errId = el.id + '-error';
    const errEl = document.getElementById(errId) || document.getElementById('model-error');
    if (errEl) errEl.classList.remove('visible');
  });
});

regForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  // Save user data
  userData = {
    mobile: mobileInput.value.trim(),
    email:  emailInput.value.trim(),
    model:  modelSelect.value,
  };

  // Go to scan screen
  showScreen('scan');
  startScanAnimation();
});

// ══════════════════════════════════════════════════════
//  SCREEN 3: SCANNING ANIMATION (3.5 seconds)
// ══════════════════════════════════════════════════════
function startScanAnimation() {
  // Reset
  scanMessages.forEach(m => m.classList.remove('active'));
  scanFill.style.width = '0%';

  const steps = [
    { msg: 0, progress: 20, delay: 200 },
    { msg: 1, progress: 50, delay: 900 },
    { msg: 2, progress: 80, delay: 1700 },
    { msg: 3, progress: 100, delay: 2500 },
  ];

  steps.forEach(({ msg, progress, delay }) => {
    setTimeout(() => {
      scanMessages.forEach(m => m.classList.remove('active'));
      scanMessages[msg].classList.add('active');
      scanFill.style.width = progress + '%';
    }, delay);
  });

  // Go to main app after 3.6 seconds
  setTimeout(() => {
    navDevice.textContent = userData.model || 'Device';
    showScreen('app');
    loadHistory();
  }, 3600);
}

// ══════════════════════════════════════════════════════
//  AI SIMULATION ENGINE
// ══════════════════════════════════════════════════════

// Category detection keywords
const CATEGORIES = {
  'Battery':      ['battery','charging','charge','power','drain','plugged'],
  'Display':      ['screen','display','touch','flicker','brightness','dark','blank'],
  'Connectivity': ['wifi','wi-fi','internet','network','bluetooth','signal','connection','data'],
  'Performance':  ['slow','lag','hang','freeze','speed','RAM','storage','heat','hot','temperature','restart','reboot','crash'],
  'Camera':       ['camera','photo','picture','video','selfie','flash','lens','blurry'],
  'Software':     ['app','update','install','error','bug','glitch','notification','OS','system'],
  'Audio':        ['sound','speaker','microphone','mic','headphone','volume','earphone','audio','mute'],
  'Account':      ['account','password','login','sign in','sign up','email','google','icloud','apple id'],
};

function detectCategory(text) {
  const lower = text.toLowerCase();
  let best = { cat: 'General', score: 0 };
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > best.score) best = { cat, score };
  }
  return best.cat;
}

// Problem extraction helpers
function extractProblem(chat) {
  const linesRaw = chat.split('\n').filter(l => l.trim());
  // Look for customer lines
  const customerLines = linesRaw
    .filter(l => /customer|user|client|me:|i |my |help|issue|problem|error|doesn'?t|can'?t|not (work|charge|turn|open|connect)/i.test(l))
    .slice(0, 4);
  if (customerLines.length > 0) return customerLines.join(' ').replace(/^(customer|user|client)\s*:\s*/gi, '').trim();
  return linesRaw.slice(0, 3).join(' ').trim();
}

function generateTitle(problem, category) {
  const upper = problem.charAt(0).toUpperCase() + problem.slice(1);
  const short = upper.length > 80 ? upper.substring(0, 80) + '…' : upper;
  return `${category} Issue: ${short}`;
}

// Per-category solution templates
const SOLUTIONS = {
  Battery: [
    'Check that you are using the original charger and cable that came with your device.',
    'Enable Battery Saver / Low Power Mode in Settings → Battery.',
    'Close all background apps and check for apps draining battery in Settings → Battery Usage.',
    'Ensure the charging port is clean and free of dust or debris.',
    'If the battery percentage jumps erratically, calibrate it: drain to 0%, charge uninterrupted to 100%.',
    'If issue persists after all steps, visit an authorised service centre for battery replacement.',
  ],
  Display: [
    'Restart your device — a simple reboot resolves most temporary display glitches.',
    'Adjust screen brightness and ensure "Auto-Brightness" or "Adaptive Brightness" is enabled.',
    'Go to Settings → Display and reset display settings to default.',
    'Remove any third-party screen protector that may interfere with touch sensitivity.',
    'Check for pending software updates in Settings → Software Update and install them.',
    'If the screen has physical damage or dead pixels, contact the manufacturer for repair.',
  ],
  Connectivity: [
    'Toggle Airplane Mode on for 10 seconds, then off to refresh all connections.',
    'Forget the Wi-Fi network in Settings → Wi-Fi, then reconnect with the correct password.',
    'Restart your router and modem (unplug for 30 seconds, then replug).',
    'Go to Settings → General → Reset → Reset Network Settings (note: this clears saved Wi-Fi).',
    'Check if the issue occurs on other networks to determine if it is device-specific.',
    'Update the device firmware and check if the carrier has any reported outages in your area.',
  ],
  Performance: [
    'Restart the device to clear the RAM and temporary cache.',
    'Uninstall unused apps and move media files to cloud storage to free up internal storage.',
    'Clear the cache for frequently used apps: Settings → Apps → [App] → Clear Cache.',
    'Check CPU/RAM usage using the built-in Device Care or a trusted diagnostic app.',
    'Disable animations: Settings → Developer Options → Window/Transition/Animator Duration Scale → Off.',
    'Perform a factory reset as last resort after backing up all important data.',
  ],
  Camera: [
    'Clean the camera lens carefully with a microfibre cloth.',
    'Force-stop the Camera app: Settings → Apps → Camera → Force Stop, then reopen.',
    'Clear the Camera app cache: Settings → Apps → Camera → Clear Cache.',
    'Ensure there is sufficient storage space, as a full device prevents photo saving.',
    'Update the Camera app and device software to the latest version.',
    'Test with a third-party camera app to determine if the issue is hardware or software.',
  ],
  Software: [
    'Force-close the problematic app and relaunch it.',
    'Clear the app cache and data: Settings → Apps → [App] → Storage → Clear Cache / Clear Data.',
    'Uninstall and reinstall the application from the official App Store or Play Store.',
    'Check for both app updates and system OS updates and install them.',
    'Boot the device in Safe Mode to check if a third-party app is causing the conflict.',
    'If system-level, perform a software repair using the official PC tool (e.g., iTunes, Smart Switch).',
  ],
  Audio: [
    'Check the physical volume buttons and ensure the device is not on Silent / DND mode.',
    'Clean the speaker grille gently with a dry soft brush to remove debris.',
    'Test audio with a different app and different content to isolate the problem.',
    'Go to Settings → Sounds and verify volume levels and sound output settings.',
    'Plug in and unplug headphones a few times to reset the audio jack detection.',
    'Check Bluetooth settings — the device may be routing audio to a paired Bluetooth device accidentally.',
  ],
  Account: [
    'Verify you are entering the correct email address and password. Check for typos.',
    'Tap "Forgot Password" and follow the account recovery steps sent to your registered email.',
    'Check if Two-Factor Authentication (2FA) is enabled and enter the OTP sent to your secondary device.',
    'Ensure the date and time on the device are set to automatic (incorrect time can block authentication).',
    'Clear the app cache or browser cookies and try logging in again on a fresh session.',
    'Contact the platform\'s official support if your account has been locked or compromised.',
  ],
  General: [
    'Restart the device to resolve any temporary software conflicts.',
    'Ensure the device software is up to date via Settings → Software Update.',
    'Check the manufacturer\'s official website or knowledge base for known issues.',
    'Clear cache of all recently used apps related to the problem.',
    'If the issue is recurring, document the steps to reproduce it for the support team.',
    'Contact the official customer support helpline with your device details and purchase proof.',
  ],
};

function generateSolution(chat) {
  const category = detectCategory(chat);
  const rawProblem = extractProblem(chat);
  const problem = rawProblem.length > 5 ? rawProblem : 'Issue described in customer chat.';
  const title = generateTitle(problem, category);
  const steps = SOLUTIONS[category] || SOLUTIONS['General'];
  return { title, problem, category, steps };
}

// ══════════════════════════════════════════════════════
//  GENERATE BUTTON
// ══════════════════════════════════════════════════════
generateBtn.addEventListener('click', async () => {
  const chat = chatInput.value.trim();
  if (!chat) {
    chatInput.style.borderColor = '#f87171';
    chatInput.style.boxShadow = '0 0 0 3px rgba(248,113,113,.15)';
    chatInput.placeholder = '⚠️  Please paste a customer chat first...';
    setTimeout(() => {
      chatInput.style.borderColor = '';
      chatInput.style.boxShadow = '';
      chatInput.placeholder = 'Paste customer chat here...';
    }, 2500);
    return;
  }

  // Show loading
  outputCard.classList.add('hidden');
  loadingWrap.classList.remove('hidden');
  generateBtn.disabled = true;

  // Simulate AI latency (1.2 – 2.2 s)
  const delay = 1200 + Math.random() * 1000;
  await new Promise(r => setTimeout(r, delay));

  // Generate
  currentResult = generateSolution(chat);
  currentResult.id   = Date.now();
  currentResult.date = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  currentResult.chat = chat;

  renderOutput(currentResult);
  saveToHistory(currentResult);
  loadHistory();

  loadingWrap.classList.add('hidden');
  outputCard.classList.remove('hidden');
  generateBtn.disabled = false;

  // Scroll to output
  outputCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── Render Output ──────────────────────────────────────
function renderOutput(result) {
  resultTitle.textContent    = result.title;
  resultCategory.textContent = result.category;
  resultProblem.textContent  = result.problem;
  resultSteps.innerHTML      = '';

  result.steps.forEach((step, i) => {
    const li  = document.createElement('li');
    li.style.animationDelay = `${i * 0.07}s`;
    const num = document.createElement('span');
    num.className   = 'step-num';
    num.textContent = i + 1;
    const txt = document.createElement('span');
    txt.textContent = step;
    li.appendChild(num);
    li.appendChild(txt);
    resultSteps.appendChild(li);
  });
}

// ── Copy Button ────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  if (!currentResult) return;
  const text = [
    `FIXORA AI – Solution`,
    `Title: ${currentResult.title}`,
    `Category: ${currentResult.category}`,
    `Problem: ${currentResult.problem}`,
    `Steps:`,
    ...currentResult.steps.map((s, i) => `${i+1}. ${s}`),
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => {
    copyBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      copyBtn.classList.remove('copied');
    }, 2000);
  });
});

// ── Clear Button ───────────────────────────────────────
clearBtn.addEventListener('click', () => {
  chatInput.value = '';
  outputCard.classList.add('hidden');
  loadingWrap.classList.add('hidden');
  currentResult = null;
  chatInput.focus();
});

// ══════════════════════════════════════════════════════
//  LOCAL STORAGE – HISTORY
// ══════════════════════════════════════════════════════
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveToHistory(result) {
  const history = getHistory();
  // Avoid duplicates (same id)
  const updated = [result, ...history.filter(h => h.id !== result.id)].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function loadHistory(filter = '') {
  const history = getHistory();
  const filtered = filter
    ? history.filter(h =>
        h.title.toLowerCase().includes(filter) ||
        h.problem.toLowerCase().includes(filter) ||
        h.category.toLowerCase().includes(filter)
      )
    : history;

  historyCount.textContent = `${history.length} saved`;

  historyList.innerHTML = '';

  if (filtered.length === 0) {
    historyList.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  filtered.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.style.animationDelay = `${i * 0.05}s`;
    div.innerHTML = `
      <div class="history-item-top">
        <span class="history-item-title">${escHtml(item.title)}</span>
        <span class="history-item-cat">${escHtml(item.category)}</span>
      </div>
      <p class="history-item-problem">${escHtml(item.problem)}</p>
      <p class="history-item-date">🕐 ${escHtml(item.date)}</p>
    `;
    div.addEventListener('click', () => {
      currentResult = item;
      renderOutput(item);
      outputCard.classList.remove('hidden');
      outputCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    historyList.appendChild(div);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// Search
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadHistory(searchInput.value.trim().toLowerCase()), 250);
});
