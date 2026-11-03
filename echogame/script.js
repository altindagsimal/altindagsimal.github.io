/* ECHO — ayarlanabilir tasarım değerleri. Davranışı değiştirmek için bu bölümü düzenleyin. */
const DESIGN = {
  colors: {
    background: '#080b1a',
    grid: 'rgba(125, 143, 220, 0.075)',
    player: '#62e7ff',
    ghost: '#b18cff',
    playerGlow: 'rgba(98, 231, 255, 0.34)',
    ghostGlow: 'rgba(177, 140, 255, 0.25)',
    trail: 'rgba(98, 231, 255, 0.10)'
  },
  playerRadius: 9,          // Ana karakterin yarıçapı (piksel)
  ghostRadius: 8,           // Hayaletin yarıçapı (piksel)
  movementSpeed: 190,       // Hareket hızı (piksel/saniye)
  memoryDelay: 4000,        // Hayaletin geçmişi takip etme gecikmesi (milisaniye)
  historyBuffer: 1200,      // Gecikmeye ek saklanan geçmiş tamponu (milisaniye)
  gridSize: 42,             // Arka plan ızgara aralığı
  trailLength: 18,          // Ana karakterin görsel iz uzunluğu
  glowBlur: 22,             // Karakterlerin ışık parlaması
  boundaryPadding: 18,      // Oyun alanının kenar boşluğu
  initialOverlay: true      // Açılış ekranını göster/gizle
};

// STATE — oyunun o anki durumu ve geçici hareket geçmişi.
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('screenOverlay');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const elapsedTime = document.getElementById('elapsedTime');
const delayValue = document.getElementById('delayValue');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const overlayEyebrow = document.getElementById('overlayEyebrow');

const state = {
  mode: 'ready', // ready | running | paused
  player: { x: 0, y: 0 },
  ghost: { x: 0, y: 0 },
  history: [],
  trail: [],
  keys: new Set(),
  lastFrame: 0,
  elapsed: 0,
  startTime: 0,
  lastTimestamp: 0,
  width: 0,
  height: 0,
  dpr: 1,
  animationId: null
};

const directions = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right'
};

// INPUT — klavye, dokunmatik yön tuşları ve arayüz butonları.
function setStatus(label, active) {
  statusText.textContent = label;
  statusDot.classList.toggle('active', active);
}

function setOverlay(title, message, eyebrow, buttonLabel) {
  overlayTitle.innerHTML = title;
  overlayMessage.textContent = message;
  overlayEyebrow.textContent = eyebrow;
  playButton.innerHTML = `${buttonLabel} <span>→</span>`;
  overlay.classList.remove('hidden');
}

function clearInputs() {
  state.keys.clear();
  document.querySelectorAll('.touch-key').forEach(button => button.classList.remove('pressed'));
}

function startGame() {
  if (state.mode === 'running') return;
  if (state.mode === 'ready') {
    state.elapsed = 0;
    state.startTime = performance.now();
    state.lastTimestamp = state.startTime;
    state.history = [{ t: state.startTime, x: state.player.x, y: state.player.y }];
  } else {
    // Duraklatma sonrasında zaman damgalarını kaydırarak oyun içi zamanı dondur.
    const now = performance.now();
    const pausedFor = now - state.lastTimestamp;
    state.history.forEach(point => { point.t += pausedFor; });
    state.startTime += pausedFor;
    state.lastTimestamp = now;
  }
  state.mode = 'running';
  state.lastFrame = performance.now();
  overlay.classList.add('hidden');
  pauseButton.disabled = false;
  pauseButton.innerHTML = 'PAUSE <span class="button-key">P</span>';
  setStatus('LIVE', true);
  state.animationId = requestAnimationFrame(loop);
}

function pauseGame() {
  if (state.mode !== 'running') return;
  state.mode = 'paused';
  state.lastTimestamp = performance.now();
  clearInputs();
  cancelAnimationFrame(state.animationId);
  pauseButton.innerHTML = 'RESUME <span class="button-key">P</span>';
  setStatus('PAUSED', false);
  setOverlay('Take a <em>moment.</em>', 'Time is paused. Your echo and your movement history are waiting here.', 'EXPERIENCE PAUSED', 'RESUME');
}

function resetGame() {
  cancelAnimationFrame(state.animationId);
  clearInputs();
  state.mode = 'ready';
  state.elapsed = 0;
  state.history = [];
  state.trail = [];
  state.player.x = state.width / 2;
  state.player.y = state.height / 2;
  state.ghost.x = state.player.x;
  state.ghost.y = state.player.y;
  state.lastTimestamp = 0;
  pauseButton.disabled = true;
  pauseButton.innerHTML = 'PAUSE <span class="button-key">P</span>';
  elapsedTime.textContent = '00:00';
  setStatus('READY', false);
  setOverlay('Make a move.<br /><em>Meet your past.</em>', 'Your movements are remembered. In four seconds, an echo will replay them.', 'A STUDY OF TEMPORALITY', 'START EXPERIENCE');
  render();
}

playButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', () => state.mode === 'running' ? pauseGame() : startGame());
resetButton.addEventListener('click', resetGame);

document.addEventListener('keydown', event => {
  if (directions[event.code]) {
    event.preventDefault();
    if (state.mode === 'running') state.keys.add(directions[event.code]);
  } else if (event.code === 'KeyP' || event.code === 'Escape') {
    event.preventDefault();
    if (state.mode === 'running') pauseGame();
    else if (state.mode === 'paused') startGame();
  } else if (event.code === 'KeyR') {
    resetGame();
  } else if (event.code === 'Enter' && state.mode !== 'running') {
    startGame();
  }
});

document.addEventListener('keyup', event => {
  if (directions[event.code]) state.keys.delete(directions[event.code]);
});
window.addEventListener('blur', () => {
  if (state.mode === 'running') pauseGame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'running') pauseGame();
});

// Dokunmatik tuşlarda pointerup, pointercancel ve pointerleave girdiyi güvenle sonlandırır.
document.querySelectorAll('.touch-key').forEach(button => {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (state.mode !== 'running') return;
    button.setPointerCapture(event.pointerId);
    state.keys.add(direction);
    button.classList.add('pressed');
  });
  const release = event => {
    if (event) event.preventDefault();
    state.keys.delete(direction);
    button.classList.remove('pressed');
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

// RULE — hareket, sınırlar ve gecikmeli geçmiş oynatımı çizimden ayrı tutulur.
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = Math.round(rect.width * state.dpr);
  canvas.height = Math.round(rect.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  if (state.mode === 'ready') {
    state.player.x = state.width / 2;
    state.player.y = state.height / 2;
    state.ghost.x = state.player.x;
    state.ghost.y = state.player.y;
  } else {
    state.player.x = clamp(state.player.x, DESIGN.boundaryPadding, state.width - DESIGN.boundaryPadding);
    state.player.y = clamp(state.player.y, DESIGN.boundaryPadding, state.height - DESIGN.boundaryPadding);
    state.ghost.x = clamp(state.ghost.x, DESIGN.boundaryPadding, state.width - DESIGN.boundaryPadding);
    state.ghost.y = clamp(state.ghost.y, DESIGN.boundaryPadding, state.height - DESIGN.boundaryPadding);
  }
  render();
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function updatePlayer(deltaSeconds) {
  let dx = 0, dy = 0;
  if (state.keys.has('left')) dx -= 1;
  if (state.keys.has('right')) dx += 1;
  if (state.keys.has('up')) dy -= 1;
  if (state.keys.has('down')) dy += 1;
  // Çapraz hareketin daha hızlı olmaması için yön vektörünü normalize et.
  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    dx /= length; dy /= length;
    state.player.x += dx * DESIGN.movementSpeed * deltaSeconds;
    state.player.y += dy * DESIGN.movementSpeed * deltaSeconds;
  }
  state.player.x = clamp(state.player.x, DESIGN.boundaryPadding, state.width - DESIGN.boundaryPadding);
  state.player.y = clamp(state.player.y, DESIGN.boundaryPadding, state.height - DESIGN.boundaryPadding);
}

function getHistoricalPosition(targetTime) {
  if (!state.history.length || targetTime <= state.history[0].t) {
    return { x: state.history[0]?.x ?? state.player.x, y: state.history[0]?.y ?? state.player.y };
  }
  let low = 0, high = state.history.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (state.history[mid].t < targetTime) low = mid + 1;
    else high = mid;
  }
  const after = state.history[low];
  const before = state.history[Math.max(0, low - 1)];
  const span = after.t - before.t;
  const mix = span > 0 ? clamp((targetTime - before.t) / span, 0, 1) : 0;
  return { x: before.x + (after.x - before.x) * mix, y: before.y + (after.y - before.y) * mix };
}

function update(deltaSeconds, now) {
  updatePlayer(deltaSeconds);
  state.elapsed = now - state.startTime;
  state.history.push({ t: now, x: state.player.x, y: state.player.y });
  const oldestAllowed = now - DESIGN.memoryDelay - DESIGN.historyBuffer;
  while (state.history.length > 2 && state.history[1].t < oldestAllowed) state.history.shift();

  const echoTime = now - DESIGN.memoryDelay;
  const past = getHistoricalPosition(echoTime);
  state.ghost.x = past.x;
  state.ghost.y = past.y;

  state.trail.push({ x: state.player.x, y: state.player.y });
  if (state.trail.length > DESIGN.trailLength) state.trail.shift();
  elapsedTime.textContent = formatTime(state.elapsed);
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function loop(now) {
  if (state.mode !== 'running') return;
  const deltaSeconds = Math.min((now - state.lastFrame) / 1000, 0.04);
  state.lastFrame = now;
  update(deltaSeconds, now);
  render();
  state.animationId = requestAnimationFrame(loop);
}

// OUTPUT — oyun alanı, ızgara, izler ve karakterler burada çizilir.
function drawGrid() {
  ctx.save();
  ctx.strokeStyle = DESIGN.colors.grid;
  ctx.lineWidth = 1;
  const offset = (state.elapsed / 1000 * 3) % DESIGN.gridSize;
  for (let x = -offset; x < state.width; x += DESIGN.gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, state.height); ctx.stroke();
  }
  for (let y = -offset; y < state.height; y += DESIGN.gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(state.width, y); ctx.stroke();
  }
  ctx.restore();
}

function drawTrail() {
  if (state.trail.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 1; i < state.trail.length; i++) {
    const alpha = (i / state.trail.length) * 0.35;
    ctx.strokeStyle = `rgba(98, 231, 255, ${alpha})`;
    ctx.lineWidth = 1 + (i / state.trail.length) * 2;
    ctx.beginPath();
    ctx.moveTo(state.trail[i - 1].x, state.trail[i - 1].y);
    ctx.lineTo(state.trail[i].x, state.trail[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCharacter(x, y, radius, color, glow, isGhost = false) {
  ctx.save();
  ctx.globalAlpha = isGhost ? 0.76 : 1;
  ctx.shadowBlur = DESIGN.glowBlur;
  ctx.shadowColor = glow;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = color;
  ctx.globalAlpha = isGhost ? 0.55 : 0.8;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, radius + 7, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = isGhost ? 0.18 : 0.22;
  ctx.beginPath(); ctx.arc(x, y, radius + 13, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.fillStyle = DESIGN.colors.background;
  ctx.fillRect(0, 0, state.width, state.height);
  drawGrid();
  // Hayalet önce çizilir; ana karakter görsel olarak daima ön planda kalır.
  if (state.mode !== 'ready' || state.history.length) {
    drawCharacter(state.ghost.x, state.ghost.y, DESIGN.ghostRadius, DESIGN.colors.ghost, DESIGN.colors.ghostGlow, true);
  }
  drawTrail();
  drawCharacter(state.player.x, state.player.y, DESIGN.playerRadius, DESIGN.colors.player, DESIGN.colors.playerGlow);
}

// İlk açılış ve ekran boyutu değişiklikleri.
delayValue.textContent = `${(DESIGN.memoryDelay / 1000).toFixed(1)}s`;
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
if (!DESIGN.initialOverlay) startGame();
