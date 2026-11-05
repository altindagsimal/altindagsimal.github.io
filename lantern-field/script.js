'use strict';

/* =========================================================
   1) DESIGN – Tüm ayarlar burada. Sayıları değiştirip sayfayı yenile.
   ========================================================= */
const DESIGN = {
  // Alan boyutu (piksel, canvas ile aynı olmalı)
  width: 800, height: 500,

  // Renkler (renk tek sinyal değil: halka kalınlığı, metin ve boyut da değişir)
  colors: { bg: '#0d1020', lantern: '#ffd27a', particle: '#e9f0ff', zone: '#5fd1c2', text: '#e9ecf5' },

  particleCount: 40,       // Sürüdeki ışık sayısı
  startCondition: 'gentle',// 'gentle' = çekim fener hızına bağlı, 'fixed' = sabit çekim

  // Hedef halka (sabit yer). reachedFraction: parçacıkların bu oranı içindeyse "reached"
  zone: { x: 650, y: 120, radius: 70, reachedFraction: 0.7 },

  // Fener
  lantern: { startX: 150, startY: 380, radius: 10, grabRadius: 60 }, // grabRadius: tutma alanı (büyütürsen tutmak kolaylaşır)
  keySpeed: 90,            // Ok tuşu hızı (px/sn). calmSpeed'in altındaysa tuşla yavaş gidilir
  keyFastSpeed: 320,       // Shift + ok hızı (px/sn). startleSpeed'in üstündeyse sürüyü ürkütür

  // Hız eşikleri (px/sn)
  calmSpeed: 120,          // Bunun altı: sakinlik artar
  startleSpeed: 260,       // Bunun üstü: sürü fenerden kaçar
  speedSmooth: 0.2,        // 0-1; küçükse hız ölçümü daha yumuşak/yavaş tepki verir

  // Sakinlik (0-1)
  calmStart: 0.1,          // Başlangıç değeri
  calmRise: 0.25,          // Yavaşken saniyede artış
  calmFall: 0.5,           // Hızlıyken saniyede düşüş
  fullObeyCalm: 0.8,       // Bu değerde ve üstünde süzülme tamamen kapanır (tam itaat)
  obeyBand: 0.2,           // Tam itaate geçiş aralığı genişliği

  // Çekim
  pullRange: 240,          // Fenerin etkisi bu uzaklıkta biter
  pullGentleMax: 260,      // Gentle: fener duruyorken çekim gücü
  pullFalloffSpeed: 260,   // Gentle: çekim bu hızda sıfıra iner
  pullFixed: 160,          // Fixed: hızdan bağımsız sabit çekim
  gather: 30,              // Parçacıkların fener çevresinde durduğu mesafe
  startleForce: 420,       // Ürkme itme gücü

  // Süzülme ve fizik
  wander: 140,             // Rastgele süzülme gücü (0 yaparsan sürü hiç sapmaz)
  wanderTurn: 4,           // Süzülme yönünün ne kadar hızlı değiştiği
  damping: 1.6,            // Sürtünme; büyükse parçacıklar çabuk yavaşlar
  maxSpeed: 220,           // Parçacık hız sınırı

  // Görsel geri bildirim
  halo: { min: 30, max: 110 },      // Sakinlikle büyüyen halka yarıçapı
  bright: { min: 0.35, max: 1 },    // Sakinlikle artan parçacık parlaklığı
  particleRadius: 3,
  calmLabels: { medium: 0.34, high: 0.67 } // "Low/Medium/High" metin sınırları
};

/* =========================================================
   2) STATE – Sistemin o anki durumu
   ========================================================= */
let state;

function makeState(condition) {
  const L = DESIGN.lantern, Z = DESIGN.zone;
  const particles = [];
  while (particles.length < DESIGN.particleCount) {
    const x = Math.random() * DESIGN.width, y = Math.random() * DESIGN.height;
    if (Math.hypot(x - Z.x, y - Z.y) < Z.radius + 30) continue; // halka içinde başlamasın
    particles.push({ x, y, vx: 0, vy: 0, a: Math.random() * 6.28 });
  }
  return {
    lantern: { x: L.startX, y: L.startY },
    speed: 0, calm: DESIGN.calmStart,
    reached: false, paused: false,
    condition: condition, particles: particles
  };
}

// Girdi niyeti (input katmanı yazar, rule katmanı okur)
const intent = { dragTo: null, dragId: null, dirX: 0, dirY: 0, fast: false, hold: false };
const keysDown = {};

/* =========================================================
   3) INPUT – Fare/dokunma, klavye, düğmeler
   ========================================================= */
const canvas = document.getElementById('field');

function toField(e) { // Ekran koordinatını alan koordinatına çevir
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * DESIGN.width / r.width, y: (e.clientY - r.top) * DESIGN.height / r.height };
}
function clampPos(p) { return { x: Math.max(0, Math.min(DESIGN.width, p.x)), y: Math.max(0, Math.min(DESIGN.height, p.y)) }; }

canvas.addEventListener('pointerdown', function (e) {
  const p = toField(e), l = state.lantern;
  // Sadece fenerin yakınından tutulur; başka yere tıklamak feneri ışınlamaz
  if (Math.hypot(p.x - l.x, p.y - l.y) > DESIGN.lantern.grabRadius) return;
  intent.dragId = e.pointerId;
  intent.dragTo = clampPos(p);
  canvas.setPointerCapture(e.pointerId);
  canvas.focus();
});
canvas.addEventListener('pointermove', function (e) {
  if (e.pointerId === intent.dragId) intent.dragTo = clampPos(toField(e));
});
function endDrag(e) { // Bırakma veya iptal: fener son konumunda kalır, hız 0 olur
  if (e.pointerId === intent.dragId) { intent.dragId = null; intent.dragTo = null; }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);

function updateKeyIntent() {
  intent.dirX = (keysDown.ArrowRight ? 1 : 0) - (keysDown.ArrowLeft ? 1 : 0);
  intent.dirY = (keysDown.ArrowDown ? 1 : 0) - (keysDown.ArrowUp ? 1 : 0);
}
window.addEventListener('keydown', function (e) {
  const tag = e.target.tagName;
  if (e.key.indexOf('Arrow') === 0) { keysDown[e.key] = true; intent.fast = e.shiftKey; updateKeyIntent(); e.preventDefault(); }
  else if (e.key === ' ' && (tag !== 'BUTTON' || e.target.id === 'holdBtn')) { intent.hold = true; e.preventDefault(); }
  else if ((e.key === 'p' || e.key === 'P') && tag !== 'SELECT') togglePause();
  else if ((e.key === 'r' || e.key === 'R') && tag !== 'SELECT') resetAll();
});
window.addEventListener('keyup', function (e) {
  if (e.key.indexOf('Arrow') === 0) { keysDown[e.key] = false; updateKeyIntent(); }
  else if (e.key === ' ') intent.hold = false;
  if (e.key === 'Shift') intent.fast = false;
});
window.addEventListener('blur', function () { // Pencere odağı kaybedilirse takılı tuşları iptal et
  for (const k in keysDown) keysDown[k] = false;
  updateKeyIntent(); intent.hold = false; intent.fast = false;
});
document.addEventListener('visibilitychange', function () { // Sekme gizlenince otomatik duraklat
  if (document.hidden) setPaused(true);
});

const holdBtn = document.getElementById('holdBtn');
['pointerdown'].forEach(function (t) { holdBtn.addEventListener(t, function () { intent.hold = true; }); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) { holdBtn.addEventListener(t, function () { intent.hold = false; }); });

document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('resetBtn').addEventListener('click', resetAll);
document.getElementById('gentleBtn').addEventListener('click', function () { setCondition('gentle'); });
document.getElementById('fixedBtn').addEventListener('click', function () { setCondition('fixed'); });

function setPaused(v) {
  state.paused = v;
  const b = document.getElementById('pauseBtn');
  b.textContent = v ? 'Resume' : 'Pause';
  b.setAttribute('aria-pressed', String(v));
}
function togglePause() { setPaused(!state.paused); }
function resetAll() { state = makeState(state.condition); setPaused(false); } // Koşulu korur, duraklatmayı kaldırır
function setCondition(c) { // Koşul değişince durum sıfırlanır: iki deneme aynı başlangıçtan başlasın
  state = makeState(c); setPaused(false);
  document.getElementById('gentleBtn').setAttribute('aria-pressed', String(c === 'gentle'));
  document.getElementById('fixedBtn').setAttribute('aria-pressed', String(c === 'fixed'));
}

/* =========================================================
   4) RULE – Tasarım kuralları (çizimden bağımsız)
   ========================================================= */
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function stepRules(dt) {
  const D = DESIGN, s = state, l = s.lantern;
  const px = l.x, py = l.y;

  // Fener hareketi: tutmak (hold) hareketi tamamen durdurur
  if (!intent.hold) {
    if (intent.dragTo) { l.x = intent.dragTo.x; l.y = intent.dragTo.y; }
    else if (intent.dirX || intent.dirY) {
      const v = intent.fast ? D.keyFastSpeed : D.keySpeed, n = Math.hypot(intent.dirX, intent.dirY);
      l.x = Math.max(0, Math.min(D.width, l.x + intent.dirX / n * v * dt));
      l.y = Math.max(0, Math.min(D.height, l.y + intent.dirY / n * v * dt));
    }
  }
  // Fener hızı (yumuşatılmış)
  const inst = Math.hypot(l.x - px, l.y - py) / dt;
  s.speed += (inst - s.speed) * D.speedSmooth;

  // Sakinlik: yavaşken artar, hızlıyken düşer
  s.calm = clamp01(s.calm + (s.speed < D.calmSpeed ? D.calmRise : -D.calmFall) * dt);

  // Çekim gücü: koşula göre
  const pull = s.condition === 'gentle'
    ? D.pullGentleMax * (1 - clamp01(s.speed / D.pullFalloffSpeed))
    : D.pullFixed;
  // Tam itaat: yüksek sakinlikte rastgele süzülme kapanır
  const obey = clamp01((s.calm - (D.fullObeyCalm - D.obeyBand)) / D.obeyBand);
  const startled = s.speed > D.startleSpeed;

  let inside = 0;
  for (const p of s.particles) {
    const dx = l.x - p.x, dy = l.y - p.y, d = Math.hypot(dx, dy) || 1;
    let ax = 0, ay = 0;
    if (d < D.pullRange) {
      if (startled) { ax -= dx / d * D.startleForce; ay -= dy / d * D.startleForce; }
      else {
        const f = Math.max(-1, Math.min(1, (d - D.gather) / 60)) * pull; // gather mesafesinde dengelenir
        ax += dx / d * f; ay += dy / d * f;
      }
    }
    p.a += (Math.random() - 0.5) * D.wanderTurn * dt * 6;
    ax += Math.cos(p.a) * D.wander * (1 - obey);
    ay += Math.sin(p.a) * D.wander * (1 - obey);

    p.vx += (ax - D.damping * p.vx) * dt;
    p.vy += (ay - D.damping * p.vy) * dt;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > D.maxSpeed) { p.vx *= D.maxSpeed / sp; p.vy *= D.maxSpeed / sp; }
    p.x = Math.max(0, Math.min(D.width, p.x + p.vx * dt));
    p.y = Math.max(0, Math.min(D.height, p.y + p.vy * dt));
    if (Math.hypot(p.x - D.zone.x, p.y - D.zone.y) <= D.zone.radius) inside++;
  }
  s.reached = inside / s.particles.length >= D.zone.reachedFraction;
}

/* =========================================================
   5) OUTPUT – Çizim ve metin (kural içermez)
   ========================================================= */
const ctx = canvas.getContext('2d');
const el = {
  calmText: document.getElementById('calmText'), calmFill: document.getElementById('calmFill'),
  moveText: document.getElementById('moveText'), ringText: document.getElementById('ringText')
};
let lastRing = null;

function render() {
  const D = DESIGN, s = state, l = s.lantern, Z = D.zone;
  ctx.clearRect(0, 0, D.width, D.height);
  ctx.fillStyle = D.colors.bg; ctx.fillRect(0, 0, D.width, D.height);

  // Hedef halka: ulaşılınca kalın ve düz çizgi + yazı (renk tek sinyal değil)
  ctx.strokeStyle = D.colors.zone;
  ctx.setLineDash(s.reached ? [] : [8, 8]);
  ctx.lineWidth = s.reached ? 6 : 2;
  ctx.beginPath(); ctx.arc(Z.x, Z.y, Z.radius, 0, 6.283); ctx.stroke();
  ctx.setLineDash([]);
  if (s.reached) {
    ctx.fillStyle = D.colors.text; ctx.font = '16px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Reached', Z.x, Z.y - Z.radius - 12);
  }

  // Fener halesi: yarıçap sakinlikle büyür
  const hr = D.halo.min + s.calm * (D.halo.max - D.halo.min);
  const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, hr);
  g.addColorStop(0, 'rgba(255,210,122,0.45)'); g.addColorStop(1, 'rgba(255,210,122,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, hr, 0, 6.283); ctx.fill();
  ctx.strokeStyle = D.colors.lantern; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(l.x, l.y, hr, 0, 6.283); ctx.stroke();
  ctx.fillStyle = D.colors.lantern; ctx.beginPath(); ctx.arc(l.x, l.y, D.lantern.radius, 0, 6.283); ctx.fill();

  // Parçacıklar: parlaklık sakinlikle artar
  ctx.fillStyle = D.colors.particle;
  ctx.globalAlpha = D.bright.min + s.calm * (D.bright.max - D.bright.min);
  for (const p of s.particles) { ctx.beginPath(); ctx.arc(p.x, p.y, D.particleRadius, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;

  if (s.paused) {
    ctx.fillStyle = D.colors.text; ctx.font = '28px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Paused', D.width / 2, D.height / 2);
  }

  // Metin göstergeleri
  const lab = D.calmLabels;
  el.calmText.textContent = s.calm >= lab.high ? 'High' : s.calm >= lab.medium ? 'Medium' : 'Low';
  el.calmFill.style.width = Math.round(s.calm * 100) + '%';
  el.moveText.textContent = s.speed > D.startleSpeed ? 'Fast' : s.speed >= D.calmSpeed ? 'Moving' : s.speed > 5 ? 'Slow' : 'Still';
  const ring = s.reached ? 'reached' : 'not reached';
  if (ring !== lastRing) { el.ringText.textContent = 'Ring: ' + ring; lastRing = ring; } // Sadece değişince (ekran okuyucu)
}

/* ---------- Döngü ---------- */
state = makeState(DESIGN.startCondition);
setCondition(DESIGN.startCondition);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!state.paused && dt > 0) stepRules(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
