// STEEP — Tasarım ayarları. Deneyin davranışını buradan değiştirebilirsin.
const DESIGN = {
  maxMemory: 5,                 // Rafta saklanacak en fazla fincan sayısı.
  maxVisibleSeconds: 15,        // İlerleme çubuğunun tam dolduğu süre.
  overSteepSeconds: 12,         // Bu süreden sonra çay fazla demlenmiş sayılır.
  thresholds: [2, 5, 8, 12],    // Çay yoğunluğu etiketlerinin değiştiği saniyeler.
  updateIntervalMs: 50,         // Ekranın ne sıklıkla güncelleneceği.
  teaColors: {                  // Süre aralıklarına göre çay renkleri.
    veryLight: '#ead9b7',
    light: '#d8b27c',
    medium: '#b77a43',
    strong: '#87502d',
    overSteeped: '#51301f'
  },
  cupColor: '#fffdf8',
  accentColor: '#a45c32'
};

// STATE — Uygulamanın mevcut ve geçmiş durumu.
const state = {
  brewing: false,
  startedAt: 0,
  elapsed: 0,
  intervalId: null,
  cups: [],
  activePointerId: null,
  keyboardHeld: false
};

// INPUT — Fare, dokunmatik ekran ve klavye girişleri.
const teaBag = document.getElementById('teaBag');
const resetButton = document.getElementById('resetButton');

function startBrewing(event) {
  if (state.brewing) return;
  if (event && event.button !== undefined && event.button !== 0) return;

  state.brewing = true;
  state.startedAt = performance.now();
  state.elapsed = 0;
  state.activePointerId = event && event.pointerId !== undefined ? event.pointerId : null;
  teaBag.classList.add('is-held');
  document.getElementById('statusLabel').textContent = 'STEEPING NOW';
  document.getElementById('instruction').textContent = 'Keep holding for a stronger brew';
  updateDisplay();

  state.intervalId = window.setInterval(() => {
    state.elapsed = (performance.now() - state.startedAt) / 1000;
    updateDisplay();
  }, DESIGN.updateIntervalMs);
}

function stopBrewing() {
  if (!state.brewing) return;
  state.elapsed = (performance.now() - state.startedAt) / 1000;
  state.brewing = false;
  window.clearInterval(state.intervalId);
  state.intervalId = null;
  teaBag.classList.remove('is-held');
  state.cups.unshift({
    duration: state.elapsed,
    strength: getStrength(state.elapsed).label,
    color: getTeaColor(state.elapsed)
  });
  state.cups = state.cups.slice(0, DESIGN.maxMemory);
  state.elapsed = 0;
  renderShelf();
  resetCurrentCup('CUP SAVED');
}

function cancelBrewing() {
  // İptal edilen dokunma/işaretçi hareketi fincanı geçmişe kaydetmez.
  if (!state.brewing) return;
  state.brewing = false;
  window.clearInterval(state.intervalId);
  state.intervalId = null;
  state.elapsed = 0;
  state.activePointerId = null;
  teaBag.classList.remove('is-held');
  resetCurrentCup('BREW CANCELLED');
}

function onPointerDown(event) {
  event.preventDefault();
  if (state.brewing) return;
  teaBag.setPointerCapture(event.pointerId);
  startBrewing(event);
}
function onPointerUp(event) {
  if (state.activePointerId !== null && event.pointerId !== state.activePointerId) return;
  stopBrewing();
}
function onPointerCancel(event) {
  if (state.activePointerId !== null && event.pointerId !== state.activePointerId) return;
  cancelBrewing();
}

teaBag.addEventListener('pointerdown', onPointerDown);
teaBag.addEventListener('pointerup', onPointerUp);
teaBag.addEventListener('pointercancel', onPointerCancel);
teaBag.addEventListener('lostpointercapture', () => {
  if (state.brewing && state.activePointerId !== null) cancelBrewing();
});

teaBag.addEventListener('keydown', event => {
  if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) {
    event.preventDefault();
    state.keyboardHeld = true;
    startBrewing(null);
  }
});
teaBag.addEventListener('keyup', event => {
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    if (state.keyboardHeld) {
      state.keyboardHeld = false;
      stopBrewing();
    }
  }
});
window.addEventListener('blur', () => {
  if (state.brewing) cancelBrewing();
  state.keyboardHeld = false;
});

// RULE — Süreyi yoğunluk durumuna ve çay rengine dönüştürür.
function getStrength(seconds) {
  if (seconds < DESIGN.thresholds[0]) return { label: 'Very light', status: 'VERY LIGHT' };
  if (seconds < DESIGN.thresholds[1]) return { label: 'Light', status: 'LIGHT' };
  if (seconds < DESIGN.thresholds[2]) return { label: 'Medium', status: 'MEDIUM' };
  if (seconds < DESIGN.thresholds[3]) return { label: 'Strong', status: 'STRONG' };
  return { label: 'Over-steeped', status: 'OVER-STEEPED' };
}

function getTeaColor(seconds) {
  if (seconds < DESIGN.thresholds[0]) return DESIGN.teaColors.veryLight;
  if (seconds < DESIGN.thresholds[1]) return DESIGN.teaColors.light;
  if (seconds < DESIGN.thresholds[2]) return DESIGN.teaColors.medium;
  if (seconds < DESIGN.thresholds[3]) return DESIGN.teaColors.strong;
  return DESIGN.teaColors.overSteeped;
}

// OUTPUT — Arayüzü günceller; tasarım kuralları yukarıdaki fonksiyonlardan ayrı tutulur.
function updateDisplay() {
  const strength = getStrength(state.elapsed);
  document.getElementById('timer').innerHTML = `${state.elapsed.toFixed(1)}<span>s</span>`;
  document.getElementById('strengthLabel').textContent = strength.label;
  document.getElementById('teaLiquid').style.backgroundColor = getTeaColor(state.elapsed);
  document.getElementById('progressFill').style.width =
    `${Math.min(100, (state.elapsed / DESIGN.maxVisibleSeconds) * 100)}%`;

  if (state.brewing) {
    document.getElementById('statusLabel').textContent = strength.status;
    document.getElementById('instruction').textContent =
      state.elapsed >= DESIGN.overSteepSeconds ? 'The tea is becoming bitter' : 'Keep holding for a stronger brew';
  }
}

function resetCurrentCup(message = 'READY WHEN YOU ARE') {
  document.getElementById('timer').innerHTML = `0.0<span>s</span>`;
  document.getElementById('strengthLabel').textContent = 'Very light';
  document.getElementById('teaLiquid').style.backgroundColor = DESIGN.teaColors.veryLight;
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('statusLabel').textContent = message;
  document.getElementById('instruction').textContent = 'Press and hold the tea bag to begin';
  teaBag.classList.remove('is-held');
}

function renderShelf() {
  const shelf = document.getElementById('shelf');
  shelf.innerHTML = '';
  if (state.cups.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-message';
    empty.textContent = 'Your first cup will find its place here.';
    shelf.appendChild(empty);
  } else {
    state.cups.forEach((cup, index) => {
      const item = document.createElement('div');
      item.className = 'memory-cup';
      const miniCup = document.createElement('div');
      miniCup.className = 'mini-cup';
      const tea = document.createElement('div');
      tea.className = 'mini-tea';
      tea.style.backgroundColor = cup.color;
      miniCup.appendChild(tea);

      const time = document.createElement('div');
      time.className = 'memory-time';
      time.textContent = `${cup.duration.toFixed(1)}s`;
      const strength = document.createElement('div');
      strength.className = 'memory-strength';
      strength.textContent = cup.strength;

      item.append(miniCup, time, strength);
      item.setAttribute('aria-label', `Cup ${index + 1}: ${cup.duration.toFixed(1)} seconds, ${cup.strength}`);
      shelf.appendChild(item);
    });
  }
  document.getElementById('memoryCount').textContent = `${state.cups.length} / ${DESIGN.maxMemory} cups`;
}

function resetCurrent() {
  // Reset yalnızca mevcut demlemeyi temizler; raftaki geçmiş fincanlar korunur.
  if (state.brewing) {
    state.brewing = false;
    window.clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.elapsed = 0;
  state.activePointerId = null;
  state.keyboardHeld = false;
  resetCurrentCup();
}
resetButton.addEventListener('click', resetCurrent);

renderShelf();
updateDisplay();
