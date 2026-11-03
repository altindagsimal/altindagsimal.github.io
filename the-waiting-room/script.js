// ECHO değil: THE WAITING ROOM — Tasarım ayarları bu nesneden değiştirilebilir.
const DESIGN = {
  totalDuration: 60,                 // Deneyimin toplam süresi (saniye)
  stageTimes: [0, 15, 35, 50, 60],   // Ortam değişim eşikleri (saniye)
  updateInterval: 100,               // Arayüz güncelleme aralığı (milisaniye)
  pauseOnTabHidden: true,            // Sekme gizlenince otomatik duraklat
  stages: [
    { name: "BEFORE THE WAIT", caption: "THE ROOM IS STILL", instruction: "Stay and notice what changes.", className: "stage-day" },
    { name: "TIME PASSES", caption: "THE LIGHT BEGINS TO SHIFT", instruction: "The room is changing, even when you do nothing.", className: "stage-day" },
    { name: "LATE AFTERNOON", caption: "SHADOWS ARE GETTING LONGER", instruction: "Notice the light and the view beyond the window.", className: "stage-evening" },
    { name: "AFTER HOURS", caption: "THE DAY IS ALMOST GONE", instruction: "Some changes take time to become visible.", className: "stage-night" }
  ]
};

// STATE — deneyimin çalışma durumu
const state = {
  status: "intro", // intro | running | paused | complete
  elapsed: 0,
  startedAt: 0,
  lastTick: 0,
  timerId: null,
  stageIndex: 0
};

// INPUT — arayüz elemanları ve kullanıcı eylemleri
const elements = {
  room: document.getElementById("room"),
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  timer: document.getElementById("timer"),
  stageName: document.getElementById("stageName"),
  stageCaption: document.getElementById("stageCaption"),
  instruction: document.getElementById("instruction"),
  progressFill: document.getElementById("progressFill"),
  progressText: document.getElementById("progressText"),
  clockHand: document.getElementById("clockHand")
};

function startExperience() {
  if (state.status === "running") return;
  if (state.status === "complete") resetExperience();

  state.status = "running";
  state.startedAt = performance.now() - state.elapsed * 1000;
  state.lastTick = performance.now();
  elements.overlay.classList.add("hidden");
  elements.pauseBtn.disabled = false;
  elements.pauseBtn.textContent = "PAUSE";
  state.timerId = window.setInterval(tick, DESIGN.updateInterval);
  render();
}

function pauseExperience() {
  if (state.status === "running") {
    updateElapsed();
    state.status = "paused";
    clearInterval(state.timerId);
    state.timerId = null;
    elements.overlayTitle.innerHTML = "Time is<br>on hold.";
    elements.overlayText.textContent = "The room will stay exactly as it is until you return.";
    elements.startBtn.textContent = "RESUME →";
    elements.overlay.classList.remove("hidden");
    elements.pauseBtn.textContent = "RESUME";
    render();
  } else if (state.status === "paused") {
    startExperience();
  }
}

function resetExperience() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.status = "intro";
  state.elapsed = 0;
  state.startedAt = 0;
  state.stageIndex = 0;
  elements.overlayTitle.innerHTML = "Take a seat.<br>Stay a while.";
  elements.overlayText.textContent = "Nothing is required of you. The room will change as time passes.";
  elements.startBtn.textContent = "ENTER THE ROOM →";
  elements.overlay.classList.remove("hidden");
  elements.pauseBtn.disabled = true;
  elements.pauseBtn.textContent = "PAUSE";
  render();
}

// RULE — zamanın hangi çevresel durumu tetiklediği
function updateElapsed() {
  if (state.status !== "running") return;
  state.elapsed = Math.min((performance.now() - state.startedAt) / 1000, DESIGN.totalDuration);
}

function getStageIndex(seconds) {
  for (let i = DESIGN.stageTimes.length - 2; i >= 0; i--) {
    if (seconds >= DESIGN.stageTimes[i]) return Math.min(i, DESIGN.stages.length - 1);
  }
  return 0;
}

function tick() {
  updateElapsed();
  const nextStage = getStageIndex(state.elapsed);
  if (nextStage !== state.stageIndex) state.stageIndex = nextStage;

  if (state.elapsed >= DESIGN.totalDuration) {
    state.elapsed = DESIGN.totalDuration;
    completeExperience();
  }
  render();
}

function completeExperience() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.status = "complete";
  elements.pauseBtn.disabled = true;
  elements.overlayTitle.innerHTML = "The room has<br>changed.";
  elements.overlayText.textContent = "You stayed for a moment. The experience is complete, but time keeps moving beyond this room.";
  elements.startBtn.textContent = "EXPERIENCE AGAIN →";
  elements.overlay.classList.remove("hidden");
}

// OUTPUT — görsel arayüzü güncelle
function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `00:${String(whole).padStart(2, "0")}`;
}

function render() {
  const stage = DESIGN.stages[state.stageIndex] || DESIGN.stages[0];
  const progress = Math.min((state.elapsed / DESIGN.totalDuration) * 100, 100);

  elements.timer.textContent = formatTime(state.elapsed);
  elements.stageName.textContent = stage.name;
  elements.stageCaption.textContent = stage.caption;
  elements.instruction.textContent = state.status === "paused"
    ? "Paused. Resume whenever you are ready."
    : stage.instruction;
  elements.progressFill.style.width = `${progress}%`;
  elements.progressText.textContent = `${Math.round(progress)}%`;
  elements.clockHand.style.transform = `translateX(-50%) rotate(${state.elapsed * 6}deg)`;

  elements.room.classList.remove("stage-day", "stage-evening", "stage-night");
  elements.room.classList.add(stage.className);

  // Gün ışığı kademeli olarak azalır; sayaç yalnızca bilgi verir.
  const darkness = Math.min(state.elapsed / DESIGN.totalDuration, 1);
  elements.room.style.setProperty("--room-glow", (0.16 - darkness * 0.12).toFixed(3));
  elements.room.style.setProperty("--shadow-opacity", (0.22 - darkness * 0.14).toFixed(3));
}

elements.startBtn.addEventListener("click", startExperience);
elements.pauseBtn.addEventListener("click", pauseExperience);
elements.resetBtn.addEventListener("click", resetExperience);

// Klavye erişimi: Enter/Space başlatır veya duraklatır; Escape sıfırlar.
document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLButtonElement) return;
  if (event.code === "Enter" || event.code === "Space") {
    event.preventDefault();
    if (state.status === "intro" || state.status === "complete") startExperience();
    else pauseExperience();
  } else if (event.code === "Escape") {
    resetExperience();
  }
});

// Sekme arka plana geçtiğinde zamanın beklenmedik şekilde ilerlememesi için otomatik duraklat.
document.addEventListener("visibilitychange", () => {
  if (DESIGN.pauseOnTabHidden && document.hidden && state.status === "running") {
    pauseExperience();
  }
});

render();
