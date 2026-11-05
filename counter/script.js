'use strict';

/* =========================================================
   1) DESIGN – Tüm ayarlar burada. Değiştirip sayfayı yenile.
   ========================================================= */
const DESIGN = {
  startCondition: 'memory',   // 'memory' = barista son günleri hatırlar, 'none' = hatırlamaz
  memoryLength: 3,            // Barista kaç önceki siparişi hatırlar (büyütürsen hafıza uzar)
  familiarMatches: 1,         // Bugünkü içecek geçmişte en az bu kadar eşleşirse "Familiar"
  regularMatches: 2,          // En az bu kadar eşleşirse "Regular" (küçültürsen barista çabuk alışır)
  replyDelayMs: 700,          // Baristanın cevap süresi (ms). 0 olursa anında cevap verir
  maxLogLines: 30,            // Listede tutulan en fazla kayıt

  // İçecekler: key = klavye tuşu, color = bardak rengi (renk tek sinyal değil, yazı da gösterilir)
  drinks: [
    { key: '1', name: 'Tea',      color: '#c9873a' },
    { key: '2', name: 'Coffee',   color: '#6b4226' },
    { key: '3', name: 'Lemonade', color: '#e8d95a' }
  ],

  // Cümle havuzları. {drink} içecek adıyla değişir. Seçim rastgele değil, güne göre sıralıdır
  // (aynı dizi her denemede aynı cevabı verir, karşılaştırma adil olur).
  lines: {
    stranger: ['Hi there. {drink}, coming up.', 'Welcome. {drink}, right away.'],
    changed:  ['Something different today? One {drink}.', '{drink} this time? Coming up.'],
    familiar: ['{drink} again? Coming up.', 'Good to see you. {drink}, as before.'],
    regular:  ['The usual {drink}. Already on it.', 'Same as always: {drink}. Here you go.']
  },
  levelNames: ['Stranger', 'Familiar', 'Regular']
};

/* =========================================================
   2) STATE
   ========================================================= */
let state;
function makeState(condition) {
  return {
    condition: condition,
    day: 0,
    history: [],        // Önceki siparişlerin içecek indeksleri
    log: [],            // Ekrandaki kayıtlar (metin)
    level: 0,
    bubble: 'Welcome. What can I get you?',
    cup: -1,            // Son servis edilen içecek indeksi (-1: yok)
    pending: null,      // Cevap bekleyen sipariş {drink, result}
    replyLeft: 0,
    paused: false,
    notice: ''
  };
}

/* =========================================================
   3) INPUT – Düğmeler (fare/dokunma/klavye) ve 1-2-3, P, R tuşları
   ========================================================= */
function onOrder(i) {
  // Cevap sürerken veya duraklatılmışken gelen sipariş yok sayılır
  if (state.paused) { state.notice = 'Paused. Resume to order.'; return render(); }
  if (state.pending) { state.notice = 'The barista is still replying.'; return render(); }
  const result = decide(i, state);
  state.day += 1;
  state.pending = { drink: i, result: result, day: state.day };
  state.replyLeft = DESIGN.replyDelayMs;
  state.bubble = '…';
  state.notice = '';
  if (state.replyLeft <= 0) deliver();
  render();
}
function onPause() { state.paused = !state.paused; state.notice = state.paused ? 'Paused.' : ''; render(); }
function onReset() { state = makeState(state.condition); render(); }                 // Koşulu korur
function onCondition(c) { state = makeState(c); render(); }                          // Koşul değişince sıfırlanır

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  const idx = DESIGN.drinks.findIndex(function (d) { return d.key === e.key; });
  if (idx >= 0) onOrder(idx);
  else if (k === 'p') onPause();
  else if (k === 'r') onReset();
});
// Siparişler click ile verilir: parmağı düğmeden kaydırıp bırakırsan click oluşmaz, yani iptal edilir

/* =========================================================
   4) RULE – Tasarım kuralı (çizimden bağımsız)
   ========================================================= */
function decide(drink, s) {
  const D = DESIGN;
  // Hatırlamayan barista için geçmiş her zaman boş
  const recent = s.condition === 'memory' ? s.history.slice(-D.memoryLength) : [];
  const matches = recent.filter(function (h) { return h === drink; }).length;
  let level = 0;
  if (matches >= D.regularMatches) level = 2;
  else if (matches >= D.familiarMatches) level = 1;
  // Seviye 0 ama geçmiş varsa "changed" havuzu, yoksa "stranger" havuzu
  const key = level === 2 ? 'regular' : level === 1 ? 'familiar' : (recent.length ? 'changed' : 'stranger');
  const pool = D.lines[key];
  const line = pool[(s.day + drink) % pool.length].replace('{drink}', D.drinks[drink].name);
  return { level: level, line: line };
}

function tick(dtMs) {            // Cevap sayacı; duraklatılınca ilerlemez
  if (state.paused || !state.pending) return;
  state.replyLeft -= dtMs;
  if (state.replyLeft <= 0) { deliver(); render(); }
}
function deliver() {             // Cevap geldi: durumu güncelle
  const p = state.pending, D = DESIGN;
  state.level = p.result.level;
  state.bubble = p.result.line;
  state.cup = p.drink;
  state.history.push(p.drink);
  state.log.push('Day ' + p.day + ' · You: ' + D.drinks[p.drink].name + ' · Barista (' + D.levelNames[p.result.level] + '): ' + p.result.line);
  if (state.log.length > D.maxLogLines) state.log.shift();
  state.pending = null;
}

/* =========================================================
   5) OUTPUT – Sadece çizim ve metin
   ========================================================= */
const $ = function (id) { return document.getElementById(id); };

function buildOrderButtons() {
  DESIGN.drinks.forEach(function (d, i) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = d.key + ' · ' + d.name;
    b.addEventListener('click', function () { onOrder(i); });
    $('orders').appendChild(b);
  });
}
function render() {
  const s = state, D = DESIGN;
  $('bubble').textContent = s.bubble;
  $('levelText').textContent = D.levelNames[s.level];
  $('status').textContent = s.notice || (s.pending ? 'The barista is replying…' : ' ');
  // Bardak ve buhar: seviye arttıkça buhar sayısı artar (renk dışında da fark var)
  $('cup').style.background = s.cup >= 0 ? D.drinks[s.cup].color : 'transparent';
  $('cupLabel').textContent = s.cup >= 0 ? D.drinks[s.cup].name : 'No order yet';
  $('steam').innerHTML = s.cup >= 0 ? new Array(s.level + 2).join('<span></span>') : '';
  $('pauseBtn').textContent = s.paused ? 'Resume' : 'Pause';
  $('pauseBtn').setAttribute('aria-pressed', String(s.paused));
  $('memoryBtn').setAttribute('aria-pressed', String(s.condition === 'memory'));
  $('noMemoryBtn').setAttribute('aria-pressed', String(s.condition === 'none'));
  const log = $('log'); log.innerHTML = '';
  s.log.forEach(function (t) { const li = document.createElement('li'); li.textContent = t; log.appendChild(li); });
  log.scrollTop = log.scrollHeight;
}

/* ---------- Başlat ---------- */
state = makeState(DESIGN.startCondition);
buildOrderButtons();
$('pauseBtn').addEventListener('click', onPause);
$('resetBtn').addEventListener('click', onReset);
$('memoryBtn').addEventListener('click', function () { onCondition('memory'); });
$('noMemoryBtn').addEventListener('click', function () { onCondition('none'); });
document.addEventListener('visibilitychange', function () { if (document.hidden && !state.paused) onPause(); });
let last = performance.now();
(function loop(now) { tick(now - last); last = now; requestAnimationFrame(loop); })(last);
render();
