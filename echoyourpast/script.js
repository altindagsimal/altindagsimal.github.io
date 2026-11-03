// ECHO — ayarlanabilir oyun ayarları
const DESIGN = {
  echoDelay: 4.0,          // Geçmişin kaç saniye sonra ortaya çıkacağı
  playerSpeed: 235,        // Oyuncu hızı (piksel/saniye)
  echoSpeedMultiplier: 1.28, // Geçmişin hareket hız çarpanı
  playerRadius: 10,
  echoRadius: 12,
  catchDistance: 22,       // Yakalanma mesafesi
  historySeconds: 14,      // Hareket geçmişinin saklanacağı süre
  startX: 450,
  startY: 260
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayKicker = document.getElementById('overlay-kicker');
const overlayTitle = document.getElementById('overlay-title');
const overlayCopy = document.getElementById('overlay-copy');
const startBtn = document.getElementById('start-btn');
const timeAliveEl = document.getElementById('time-alive');
const statusLabel = document.getElementById('status-label');
const pauseBtn = document.getElementById('pause-btn');

const W = canvas.width, H = canvas.height;
const keys = new Set();
const touchKeys = new Set();
let state;
let lastFrame = 0;
let animationId = null;

function newState() {
  const now = performance.now() / 1000;
  return {
    mode: 'ready', // ready, playing, paused, caught
    player: { x: DESIGN.startX, y: DESIGN.startY },
    echo: { x: DESIGN.startX, y: DESIGN.startY, active: false },
    history: [{ t: now, x: DESIGN.startX, y: DESIGN.startY }],
    startedAt: 0,
    elapsed: 0,
    caughtAt: 0
  };
}

function setOverlay(kicker, title, copy, buttonText) {
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  startBtn.textContent = buttonText;
  overlay.classList.remove('hidden');
}

function hideOverlay() { overlay.classList.add('hidden'); }

function startGame() {
  if (state.mode === 'paused') {
    state.mode = 'playing';
    lastFrame = 0;
    hideOverlay();
    updateStatus();
    return;
  }
  if (state.mode === 'caught' || state.mode === 'ready') {
    state = newState();
    state.mode = 'playing';
    state.startedAt = performance.now() / 1000;
    lastFrame = 0;
    hideOverlay();
    updateStatus();
  }
}

function pauseGame() {
  if (state.mode === 'playing') {
    state.mode = 'paused';
    setOverlay('TIME SUSPENDED', 'TAKE A BREATH.', 'The field is frozen. Your movement history is waiting. Resume when you are ready.', 'RESUME');
  } else if (state.mode === 'paused') {
    startGame();
  }
  updateStatus();
}

function resetGame() {
  state = newState();
  keys.clear();
  touchKeys.clear();
  timeAliveEl.textContent = '00:00';
  setOverlay('A RECORD IS BEING MADE', "DON'T LOOK BACK.", 'Move through the field. After a few seconds, your earlier movements will return as an echo. Keep moving — your past is catching up.', 'ENTER THE FIELD');
  updateStatus();
  draw();
}

function updateStatus() {
  statusLabel.textContent =
    state.mode === 'playing' ? 'ECHO ACTIVE' :
    state.mode === 'paused' ? 'TIME SUSPENDED' :
    state.mode === 'caught' ? 'MEMORY COLLISION' : 'WAITING FOR INPUT';
  pauseBtn.textContent = state.mode === 'paused' ? 'RESUME' : 'PAUSE';
}

function getDirection() {
  let x = 0, y = 0;
  if (keys.has('ArrowLeft') || keys.has('a') || touchKeys.has('left')) x--;
  if (keys.has('ArrowRight') || keys.has('d') || touchKeys.has('right')) x++;
  if (keys.has('ArrowUp') || keys.has('w') || touchKeys.has('up')) y--;
  if (keys.has('ArrowDown') || keys.has('s') || touchKeys.has('down')) y++;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function getPastPosition(targetTime) {
  const h = state.history;
  if (targetTime <= h[0].t) return { x: h[0].x, y: h[0].y };
  for (let i = 1; i < h.length; i++) {
    if (h[i].t >= targetTime) {
      const a = h[i - 1], b = h[i];
      const span = Math.max(0.0001, b.t - a.t);
      const f = Math.max(0, Math.min(1, (targetTime - a.t) / span));
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
  }
  return { x: h[h.length - 1].x, y: h[h.length - 1].y };
}

function update(dt) {
  const now = performance.now() / 1000;
  state.elapsed = now - state.startedAt;

  const dir = getDirection();
  state.player.x = Math.max(24, Math.min(W - 24, state.player.x + dir.x * DESIGN.playerSpeed * dt));
  state.player.y = Math.max(24, Math.min(H - 24, state.player.y + dir.y * DESIGN.playerSpeed * dt));

  state.history.push({ t: now, x: state.player.x, y: state.player.y });
  while (state.history.length > 2 && state.history[1].t < now - DESIGN.historySeconds) {
    state.history.shift();
  }

  const echoTargetTime = now - DESIGN.echoDelay;
  if (state.elapsed >= DESIGN.echoDelay) {
    state.echo.active = true;
    const target = getPastPosition(echoTargetTime);
    // The echo moves toward the recorded past position, slightly faster than the recording.
    const dx = target.x - state.echo.x;
    const dy = target.y - state.echo.y;
    const distance = Math.hypot(dx, dy);
    const maxStep = DESIGN.playerSpeed * DESIGN.echoSpeedMultiplier * dt;
    if (distance > 0.01) {
      const step = Math.min(distance, maxStep);
      state.echo.x += dx / distance * step;
      state.echo.y += dy / distance * step;
    }

    if (Math.hypot(state.player.x - state.echo.x, state.player.y - state.echo.y) < DESIGN.catchDistance) {
      state.mode = 'caught';
      state.caughtAt = now;
      setOverlay('MEMORY COLLISION', 'YOUR PAST CAUGHT UP.', 'Every movement left a trace. You could not outrun what you had already done.', 'TRY AGAIN');
      updateStatus();
    }
  }
  timeAliveEl.textContent = formatClock(state.elapsed);
}

function formatClock(seconds) {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(119, 145, 190, 0.09)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 45) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 45) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(115, 226, 242, 0.13)';
  ctx.strokeRect(12, 12, W - 24, H - 24);
}

function drawTrail() {
  const now = performance.now() / 1000;
  const recent = state.history.filter(p => p.t > now - 3);
  if (recent.length < 2) return;
  ctx.beginPath();
  recent.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.strokeStyle = 'rgba(115, 226, 242, 0.19)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function glowCircle(x, y, radius, color, glow, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 24;
  ctx.shadowColor = glow;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = alpha * 0.65;
  ctx.beginPath(); ctx.arc(x - radius * .25, y - radius * .25, radius * .22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#080d1b';
  ctx.fillRect(0, 0, W, H);
  drawGrid();
  drawTrail();

  // Faint traces mark the recent recorded positions.
  const now = performance.now() / 1000;
  state.history.forEach((p, i) => {
    if (i % 7 === 0 && p.t > now - 2.5) {
      ctx.fillStyle = 'rgba(115, 226, 242, 0.12)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  });

  if (state.echo.active) {
    // Echo halo
    const pulse = 1 + Math.sin(now * 5) * 0.08;
    glowCircle(state.echo.x, state.echo.y, DESIGN.echoRadius * pulse, '#9b6de8', '#bd83ff', 0.95);
    ctx.strokeStyle = 'rgba(189,131,255,.38)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(state.echo.x, state.echo.y, 22 + Math.sin(now * 4) * 3, 0, Math.PI * 2); ctx.stroke();
  }

  glowCircle(state.player.x, state.player.y, DESIGN.playerRadius, '#73e2f2', '#73e2f2', 1);

  if (state.mode === 'caught') {
    ctx.fillStyle = 'rgba(150, 80, 210, 0.12)';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      const y = (i * 47 + 13) % H;
      ctx.fillStyle = `rgba(189,131,255,${0.08 + (i % 3) * 0.035})`;
      ctx.fillRect(0, y, W, 2 + (i % 3) * 2);
    }
  }
}

function loop(timestamp) {
  if (!lastFrame) lastFrame = timestamp;
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.04);
  lastFrame = timestamp;
  if (state.mode === 'playing') update(dt);
  draw();
  animationId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  if (k === 'r') { resetGame(); return; }
  if (k === ' ' && (state.mode === 'playing' || state.mode === 'paused')) { pauseGame(); return; }
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(k)) keys.add(k);
});
document.addEventListener('keyup', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys.delete(k);
});
window.addEventListener('blur', () => { keys.clear(); touchKeys.clear(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'playing') pauseGame();
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
document.getElementById('reset-btn').addEventListener('click', resetGame);

document.querySelectorAll('[data-dir]').forEach(button => {
  const dir = button.dataset.dir;
  const down = e => { e.preventDefault(); touchKeys.add(dir); };
  const up = e => { e.preventDefault(); touchKeys.delete(dir); };
  button.addEventListener('pointerdown', down);
  ['pointerup','pointerleave','pointercancel'].forEach(type => button.addEventListener(type, up));
});

state = newState();
updateStatus();
draw();
animationId = requestAnimationFrame(loop);
