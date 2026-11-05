// ==========================================
// CONFIGURATION OBJECT (Easily tunable for live demo)
// ==========================================
const CONFIG = {
    gridCols: 8,
    gridRows: 8,
    baseFrequency: 130.81, // C3 note
    feedbackFadeRate: 0.04,
    contextSensitivity: 1.5,
    defaultLight: 0.5,
    maxRippleRadius: 200,
    autoPlayIntervalMs: 400
};

// State Management
let state = {
    width: window.innerWidth,
    height: window.innerHeight,
    aspectRatio: window.innerWidth / window.innerHeight,
    ambientLight: CONFIG.defaultLight,
    ripples: [],
    activeCells: [],
    autoPlay: false,
    autoPlayTimer: null
};

// DOM & Canvas Setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const lightSlider = document.getElementById('light-slider');
const autoplayBtn = document.getElementById('autoplay-btn');
const resetBtn = document.getElementById('reset-btn');

// Web Audio API Setup
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(col, row) {
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Context (Window geometry) affects pitch multiplier
    const pitchScale = 1 + (state.aspectRatio * 0.25);
    const noteFreq = CONFIG.baseFrequency * Math.pow(2, (col + row) / 6) * pitchScale;

    osc.type = state.ambientLight > 0.5 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(noteFreq, audioCtx.currentTime);

    // Light level (Context) affects resonance/decay time
    const duration = 0.3 + (state.ambientLight * 1.2);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Trigger Event (Integrates Context & Feedback)
function triggerCell(col, row) {
    const cellW = state.width / CONFIG.gridCols;
    const cellH = state.height / CONFIG.gridRows;
    const x = (col + 0.5) * cellW;
    const y = (row + 0.5) * cellH;

    // Audio Feedback
    playTone(col, row);

    // Visual Feedback (Ripple object)
    state.ripples.push({
        x: x,
        y: y,
        radius: 10,
        maxRadius: CONFIG.maxRippleRadius * (1 / (state.aspectRatio * 0.8)),
        alpha: 1.0,
        hue: (col * 35 + row * 15 + (state.ambientLight * 180)) % 360
    });
}

// Canvas Resize & Context Handling
function resizeCanvas() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.aspectRatio = state.width / state.height;
    canvas.width = state.width;
    canvas.height = state.height;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Rendering Loop
function render() {
    // Draw background influenced by Ambient Light Context
    const lightVal = Math.floor(state.ambientLight * 40);
    ctx.fillStyle = `rgb(${lightVal}, ${lightVal + 5}, ${lightVal + 15})`;
    ctx.fillRect(0, 0, state.width, state.height);

    // Draw Dynamic Spatial Grid
    const cellW = state.width / CONFIG.gridCols;
    const cellH = state.height / CONFIG.gridRows;

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 + state.ambientLight * 0.15})`;
    ctx.lineWidth = 1;

    for (let i = 0; i <= CONFIG.gridCols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, state.height);
        ctx.stroke();
    }

    for (let j = 0; j <= CONFIG.gridRows; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * cellH);
        ctx.lineTo(state.width, j * cellH);
        ctx.stroke();
    }

    // Render & Update Ripples (Visual Feedback)
    for (let i = state.ripples.length - 1; i >= 0; i--) {
        const r = state.ripples[i];
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${r.hue}, 80%, 65%, ${r.alpha})`;
        ctx.lineWidth = 2 + (1 - r.alpha) * 3;
        ctx.stroke();

        r.radius += 3 * (state.width / 1000);
        r.alpha -= CONFIG.feedbackFadeRate;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
            state.ripples.splice(i, 1);
        }
    }

    requestAnimationFrame(render);
}

render();

// User Inputs
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / (state.width / CONFIG.gridCols));
    const row = Math.floor(y / (state.height / CONFIG.gridRows));

    triggerCell(col, row);
});

// Accessibility Inputs (Keyboard)
const keyMap = { 'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, 'h': 5, 'j': 6, 'k': 7 };
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keyMap.hasOwnProperty(key)) {
        const col = keyMap[key];
        const row = Math.floor((col * 1.3) % CONFIG.gridRows);
        triggerCell(col, row);
    } else if (e.key === 'ArrowUp') {
        state.ambientLight = Math.min(1, state.ambientLight + 0.1);
        lightSlider.value = state.ambientLight * 100;
    } else if (e.key === 'ArrowDown') {
        state.ambientLight = Math.max(0, state.ambientLight - 0.1);
        lightSlider.value = state.ambientLight * 100;
    }
});

// UI Controls
lightSlider.addEventListener('input', (e) => {
    state.ambientLight = e.target.value / 100;
});

autoplayBtn.addEventListener('click', () => {
    state.autoPlay = !state.autoPlay;
    autoplayBtn.classList.toggle('active', state.autoPlay);

    if (state.autoPlay) {
        state.autoPlayTimer = setInterval(() => {
            const col = Math.floor(Math.random() * CONFIG.gridCols);
            const row = Math.floor(Math.random() * CONFIG.gridRows);
            triggerCell(col, row);
        }, CONFIG.autoPlayIntervalMs);
    } else {
        clearInterval(state.autoPlayTimer);
    }
});

resetBtn.addEventListener('click', () => {
    state.ambientLight = CONFIG.defaultLight;
    lightSlider.value = CONFIG.defaultLight * 100;
    state.ripples = [];
});
