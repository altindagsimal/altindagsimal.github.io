/**
 * THE RECIPROCAL GARDEN
 * Architecture: DESIGN -> State -> Input -> Rule -> Output (Render)
 */

// ==========================================
// 1. DESIGN: Ayarlanabilir Tasarım Parametreleri
// ==========================================
const DESIGN = {
  colors: {
    sky: '#e2e8f0',
    soil: '#8d6e63',
    soilWatered: '#5d4037',
    waterDrop: '#42a5f5',
    treeTrunk: '#4e342e',
    foliage: '#2e7d32',
    flowerPetals: ['#e91e63', '#ffeb3b', '#9c27b0', '#ff9800']
  },
  
  // Sistem Kuralları ve Hafıza Parametreleri
  waterThreshold: 12,       // Toprağın canlı kalması için gereken ortalama sulama miktarı
  idleTimeoutMs: 700,       // Katılımcı durduğunda rüzgar/dinlenme moduna geçiş süresi
  maxTrees: 25,             // Bahçede aynı anda büyüyebilecek maksimum ağaç
  keyboardStep: 12          // Klavye imleç hızı
};

// ==========================================
// 2. STATE: Bahçe Durumu
// ==========================================
const state = {
  currentMode: 'FLOURISHING', // 'FLOURISHING' | 'DRY' | 'RESTING'
  waterDrops: [],             // Kullanıcının attığı su damlaları
  plants: [],                 // Sistemin yetiştirdiği çiçekler ve ağaçlar {x, y, size, type, maxProps}
  recentWatering: [],         // Sulama geçmişi
  
  isWatering: false,
  lastInputTime: Date.now(),
  keyboardCursor: { x: 0, y: 0 },
  keysPressed: {}
};

// Canvas ve DOM Kurulumu
const canvas = document.getElementById('gardenCanvas');
const ctx = canvas.getContext('2d');
const stateBadge = document.getElementById('stateBadge');
const stateDescription = document.getElementById('stateDescription');
const resetBtn = document.getElementById('resetBtn');

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = Math.max(rect.height, 500);
  if (state.keyboardCursor.x === 0) {
    state.keyboardCursor = { x: canvas.width / 2, y: canvas.height - 80 };
  }
  render();
}

window.addEventListener('resize', resizeCanvas);

// ==========================================
// 3. INPUT: Sulama ve Tohum Ekme Girdileri
// ==========================================
function waterSoil(x, y) {
  // Sadece toprağın olduğu alt bölgeye sulama yapılmasına izin ver
  const soilY = Math.max(canvas.height - 120, y);
  
  const drop = { x, y: soilY, size: Math.random() * 4 + 3 };
  state.waterDrops.push(drop);
  state.recentWatering.push({ x, y: soilY, time: Date.now() });

  if (state.recentWatering.length > 30) {
    state.recentWatering.shift();
  }

  state.lastInputTime = Date.now();
  evaluateRulesAndGrowGarden(x, soilY);
  render();
}

canvas.addEventListener('mousedown', (e) => {
  state.isWatering = true;
  const rect = canvas.getBoundingClientRect();
  waterSoil(e.clientX - rect.left, e.clientY - rect.top);
});

canvas.addEventListener('mousemove', (e) => {
  if (!state.isWatering) return;
  const rect = canvas.getBoundingClientRect();
  waterSoil(e.clientX - rect.left, e.clientY - rect.top);
});

window.addEventListener('mouseup', () => { state.isWatering = false; });

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  state.isWatering = true;
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  waterSoil(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (!state.isWatering) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  waterSoil(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: false });

window.addEventListener('touchend', () => { state.isWatering = false; });

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    resetGarden();
    return;
  }
  state.keysPressed[e.key] = true;
});

window.addEventListener('keyup', (e) => { state.keysPressed[e.key] = false; });

function handleKeyboardInput() {
  let moved = false;
  if (state.keysPressed['ArrowUp']) { state.keyboardCursor.y -= DESIGN.keyboardStep; moved = true; }
  if (state.keysPressed['ArrowDown']) { state.keyboardCursor.y += DESIGN.keyboardStep; moved = true; }
  if (state.keysPressed['ArrowLeft']) { state.keyboardCursor.x -= DESIGN.keyboardStep; moved = true; }
  if (state.keysPressed['ArrowRight']) { state.keyboardCursor.x += DESIGN.keyboardStep; moved = true; }

  state.keyboardCursor.x = Math.max(0, Math.min(canvas.width, state.keyboardCursor.x));
  state.keyboardCursor.y = Math.max(canvas.height - 120, Math.min(canvas.height, state.keyboardCursor.y));

  if (moved && state.keysPressed[' ']) {
    waterSoil(state.keyboardCursor.x, state.keyboardCursor.y);
  }
}

resetBtn.addEventListener('click', resetGarden);

function resetGarden() {
  state.waterDrops = [];
  state.plants = [];
  state.recentWatering = [];
  state.currentMode = 'FLOURISHING';
  updateUIState('FLOURISHING', 'Your care nourishes the soil! Trees are growing and flowers are blooming.');
  render();
}

// ==========================================
// 4. RULE: Doğanın Karşılık Verme Mantığı
// ==========================================
function evaluateRulesAndGrowGarden(x, y) {
  const waterCount = state.recentWatering.length;

  if (waterCount >= DESIGN.waterThreshold) {
    setMode('FLOURISHING', 'Your care nourishes the soil! Trees are growing and flowers are blooming.');
    
    // Yeterli su varsa yeni ağaç veya çiçek büyüt
    if (Math.random() < 0.3 && state.plants.length < DESIGN.maxTrees) {
      const type = Math.random() > 0.4 ? 'tree' : 'flower';
      const color = DESIGN.colors.flowerPetals[Math.floor(Math.random() * DESIGN.colors.flowerPetals.length)];
      state.plants.push({ x, y, size: 5, targetSize: Math.random() * 30 + 25, type, color });
    }
  } else {
    setMode('DRY', 'The soil needs more water! Growth slows down.');
  }

  // Mevcut bitkileri büyüt
  state.plants.forEach(plant => {
    if (plant.size < plant.targetSize) {
      plant.size += 1.5;
    }
  });
}

setInterval(() => {
  const timeSinceLastInput = Date.now() - state.lastInputTime;
  if (timeSinceLastInput > DESIGN.idleTimeoutMs && state.plants.length > 0) {
    if (state.currentMode !== 'RESTING') {
      setMode('RESTING', 'The garden is resting under the soft breeze.');
    }
  }
}, 400);

function setMode(mode, description) {
  if (state.currentMode !== mode) {
    state.currentMode = mode;
    updateUIState(mode, description);
  }
}

function updateUIState(mode, description) {
  stateBadge.textContent = mode;
  stateBadge.className = `state-badge ${mode.toLowerCase()}`;
  stateDescription.textContent = description;
}

// ==========================================
// 5. OUTPUT: Görselleştirme ve Çizim
// ==========================================
function render() {
  // Gökyüzü ve Arka Plan
  ctx.fillStyle = DESIGN.colors.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Toprak Katmanı
  const soilTop = canvas.height - 100;
  ctx.fillStyle = state.recentWatering.length > 10 ? DESIGN.colors.soilWatered : DESIGN.colors.soil;
  ctx.fillRect(0, soilTop, canvas.width, 100);

  // Su Damlaları
  state.waterDrops.forEach(drop => {
    ctx.beginPath();
    ctx.fillStyle = DESIGN.colors.waterDrop;
    ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Büyüyen Ağaçlar ve Çiçekler (Sistemin Yanıtı)
  state.plants.forEach(plant => {
    if (plant.type === 'tree') {
      // Gövde
      ctx.fillStyle = DESIGN.colors.treeTrunk;
      ctx.fillRect(plant.x - plant.size / 6, plant.y - plant.size, plant.size / 3, plant.size);
      // Yapraklar
      ctx.beginPath();
      ctx.fillStyle = DESIGN.colors.foliage;
      ctx.arc(plant.x, plant.y - plant.size, plant.size / 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Çiçek Sapı
      ctx.beginPath();
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 3;
      ctx.moveTo(plant.x, plant.y);
      ctx.lineTo(plant.x, plant.y - plant.size);
      ctx.stroke();

      // Çiçek Taç Yaprakları
      ctx.beginPath();
      ctx.fillStyle = plant.color;
      ctx.arc(plant.x, plant.y - plant.size, plant.size / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function loop() {
  handleKeyboardInput();
  requestAnimationFrame(loop);
}

resizeCanvas();
loop();
