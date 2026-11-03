// THE LAST TRAIN — ayarlanabilir deney ayarları
const DESIGN = {
  secondsUntilArrival: 35,  // İlk trenin gelmesine kalan süre
  doorsOpenFor: 10,         // Kapıların açık kalma süresi
  secondsUntilNextTrain: 24,// Kaçırılırsa sonraki trenin bekleme süresi
  playerStart: 18,          // Oyuncunun platformdaki başlangıç konumu (%)
  playerSpeed: 34,          // Saniyede hareket mesafesi (%)
  doorPosition: 77,         // Trenin kapısının platformdaki konumu (%)
  boardingRange: 7          // Kapıya binilebilecek yakınlık (%)
};

const player = document.getElementById('player');
const train = document.getElementById('train');
const clockEl = document.getElementById('clock');
const boardTime = document.getElementById('board-time');
const boardStatus = document.getElementById('board-status');
const message = document.getElementById('message');
const messageText = document.getElementById('message-text');
const marker = document.getElementById('boarding-marker');
const pauseBtn = document.getElementById('pause-btn');

let state;
let lastFrame = 0;
let keys = new Set();
let raf = null;

function freshState() {
  return {
    phase: 'waiting', // waiting, arriving, doors, departing, success, paused
    remaining: DESIGN.secondsUntilArrival,
    playerX: DESIGN.playerStart,
    trainProgress: 0,
    doorsRemaining: 0,
    pausedFrom: null,
    message: 'The platform is quiet. The train arrives soon.'
  };
}

function setMessage(text, mood = '') {
  messageText.textContent = text;
  message.className = 'message' + (mood ? ' ' + mood : '');
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `00:${String(s).padStart(2, '0')}`;
}

function render() {
  player.style.left = `${state.playerX}%`;
  clockEl.textContent = formatTime(state.remaining);
  boardTime.textContent = formatTime(state.remaining);
  boardStatus.textContent =
    state.phase === 'doors' ? 'BOARD NOW' :
    state.phase === 'success' ? 'DEPARTED' :
    state.phase === 'departing' ? 'DOORS CLOSING' :
    state.phase === 'paused' ? 'PAUSED' : 'ON TIME';

  const trainX = state.phase === 'waiting' ? 110 :
    state.phase === 'arriving' ? 110 - state.trainProgress * 110 :
    state.phase === 'doors' || state.phase === 'departing' ? 0 :
    state.phase === 'success' ? 0 : 0;
  train.style.transform = `translateX(${trainX}%)`;
  train.classList.toggle('door-open', state.phase === 'doors');
  marker.classList.toggle('visible', state.phase === 'doors' &&
    Math.abs(state.playerX - DESIGN.doorPosition) <= DESIGN.boardingRange);

  pauseBtn.textContent = state.phase === 'paused' ? 'RESUME' : 'PAUSE';
}

function beginArrival() {
  state.phase = 'arriving';
  state.trainProgress = 0;
  setMessage('You can still move. The train is pulling into the station.', 'urgent');
}

function openDoors() {
  state.phase = 'doors';
  state.doorsRemaining = DESIGN.doorsOpenFor;
  state.remaining = DESIGN.doorsOpenFor;
  setMessage('The doors are open. Reach the marked door and press SPACE to board.', 'urgent');
}

function missTrain() {
  state.phase = 'departing';
  state.remaining = 3;
  setMessage('The doors are closing. You can wait for the next train.', 'urgent');
}

function nextTrain() {
  state.phase = 'waiting';
  state.remaining = DESIGN.secondsUntilNextTrain;
  state.trainProgress = 0;
  train.style.transform = 'translateX(110%)';
  setMessage('You missed that one. Another train will arrive soon.');
}

function boardTrain() {
  if (state.phase !== 'doors') return;
  const closeEnough = Math.abs(state.playerX - DESIGN.doorPosition) <= DESIGN.boardingRange;
  if (!closeEnough) {
    setMessage('You are not close enough to the door. Move closer!', 'urgent');
    return;
  }
  state.phase = 'success';
  state.remaining = 0;
  setMessage('You made it. The doors close behind you, and the journey begins.', 'success');
  render();
}

function update(dt) {
  if (state.phase === 'waiting') {
    state.remaining -= dt;
    if (state.remaining <= 0) beginArrival();
  } else if (state.phase === 'arriving') {
    state.trainProgress += dt / 4;
    state.remaining = Math.max(0, 4 - state.trainProgress * 4);
    if (state.trainProgress >= 1) openDoors();
  } else if (state.phase === 'doors') {
    state.doorsRemaining -= dt;
    state.remaining = state.doorsRemaining;
    if (state.doorsRemaining <= 0) missTrain();
  } else if (state.phase === 'departing') {
    state.remaining -= dt;
    if (state.remaining <= 0) nextTrain();
  }

  const direction = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) -
                    (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
  if (direction !== 0 && !['success', 'paused'].includes(state.phase)) {
    state.playerX = Math.max(3, Math.min(94, state.playerX + direction * DESIGN.playerSpeed * dt));
  }
}

function frame(timestamp) {
  if (!lastFrame) lastFrame = timestamp;
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;
  if (state.phase !== 'paused' && state.phase !== 'success') update(dt);
  render();
  raf = requestAnimationFrame(frame);
}

function togglePause() {
  if (state.phase === 'success') return;
  if (state.phase === 'paused') {
    state.phase = state.pausedFrom;
    setMessage('Back to the platform. Time is moving again.');
  } else {
    state.pausedFrom = state.phase;
    state.phase = 'paused';
    setMessage('Time is paused. Take a moment before continuing.');
  }
  render();
}

function reset() {
  state = freshState();
  keys.clear();
  lastFrame = 0;
  setMessage(state.message);
  render();
}

function boardAction() { boardTrain(); }

document.addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(event.key)) event.preventDefault();
  if (event.key === 'Escape') { reset(); return; }
  if (event.key === ' ' || event.key === 'Enter') { boardAction(); return; }
  if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(event.key)) keys.add(event.key);
});
document.addEventListener('keyup', (event) => keys.delete(event.key));
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase !== 'paused' && state.phase !== 'success') togglePause();
});

document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('reset-btn').addEventListener('click', reset);
document.getElementById('board-btn').addEventListener('click', boardAction);

function bindHold(buttonId, key) {
  const button = document.getElementById(buttonId);
  const down = (e) => { e.preventDefault(); keys.add(key); };
  const up = (e) => { e.preventDefault(); keys.delete(key); };
  button.addEventListener('pointerdown', down);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => button.addEventListener(type, up));
}
bindHold('left-btn', 'ArrowLeft');
bindHold('right-btn', 'ArrowRight');

state = freshState();
render();
raf = requestAnimationFrame(frame);
