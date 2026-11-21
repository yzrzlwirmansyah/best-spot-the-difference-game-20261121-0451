'use strict';
/* Spot the Difference — Cosmic Laundromat night shift.
 *
 * Game logic: screens, input, timer, scoring and the render loop.
 * Two canvases show the same scene in two variants; a click on either
 * picture can find a difference, which is then marked on both. The
 * timer only runs while a level is visible, pauses when the tab hides,
 * and a wrong click costs 3 seconds. Screenshots: add ?shot=start,
 * ?shot=play, ?shot=play3 or ?shot=end to freeze a staged state. */

const W = SCENE_W;
const H = SCENE_H;
const QUICK_FIND_MS = 6000;
const QUICK_BONUS = 25;
const FIND_POINTS = 100;
const WRONG_PENALTY_MS = 3000;
const TIME_BONUS_PER_SECOND = 5;
const BEST_KEY = 'spotdiff-cosmic-best';

const $ = (id) => document.getElementById(id);

const canvasA = $('canvas-a');
const canvasB = $('canvas-b');
const ctxA = canvasA.getContext('2d');
const ctxB = canvasB.getContext('2d');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fit both canvases to the device pixel ratio for crisp markers. */
function setupCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
setupCanvas(canvasA);
setupCanvas(canvasB);

const state = {
  screen: 'title', // title | playing | clear | over | victory
  levelIndex: 0,
  score: 0,
  mistakes: 0,
  hintsLeft: 2,
  found: new Set(),
  remainingMs: 0,
  lastFindAt: 0,
  now: 0,
  levelScore: 0,
  best: 0,
  shotMode: false,
  paused: false,
};

const effects = []; // {kind, x, y, born, ttl, text}
let lastFrame = performance.now();

try {
  state.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
} catch (e) {
  state.best = 0;
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(state.best));
  } catch (e) {
    /* Storage unavailable; the best score just lives for this session. */
  }
}

function level() {
  return LEVELS[state.levelIndex];
}

function remainingCount() {
  return level().differences.length - state.found.size;
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function announce(message) {
  $('status').textContent = message;
}

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */

const screens = {
  title: $('screen-title'),
  clear: $('screen-clear'),
  over: $('screen-over'),
  victory: $('screen-victory'),
};

function showScreen(name) {
  state.screen = name;
  for (const key of Object.keys(screens)) {
    screens[key].classList.toggle('hidden', key !== name);
  }
  $('stage').classList.toggle('dimmed', name === 'title');
  // The HUD is live-game chrome: hide it entirely on the title screen,
  // and on the victory screen keep only the final tally pill — the timer
  // reads 0:00 there, which looks like a timeout.
  const hud = document.querySelector('.hud');
  hud.classList.toggle('hidden', name === 'title');
  hud.classList.toggle('summary', name === 'victory');
}

function showTitle() {
  $('best-line').textContent = state.best > 0
    ? 'Best shift so far: ' + state.best.toLocaleString('en-GB') + ' points'
    : 'No shift completed yet — the laundromat awaits its first inspector.';
  showScreen('title');
  announce('Cosmic Laundromat spot the difference. Find 7 differences in each of 3 scenes.');
}

function startRun() {
  state.score = 0;
  state.mistakes = 0;
  state.hintsLeft = 2;
  state.levelIndex = 0;
  startLevel();
}

function startLevel() {
  const lv = level();
  state.found = new Set();
  state.remainingMs = lv.timeLimit * 1000;
  state.lastFindAt = 0;
  state.levelScore = 0;
  effects.length = 0;
  $('hud-level').textContent = 'Shift ' + (state.levelIndex + 1) + ' of 3 — ' + lv.short;
  $('hud-scene').textContent = lv.name;
  $('hint-btn').disabled = state.hintsLeft <= 0;
  $('hint-count').textContent = state.hintsLeft;
  showScreen('playing');
  announce(lv.name + '. Find 7 differences. ' + formatTime(state.remainingMs) + ' on the clock.');
}

function levelCleared() {
  const timeBonus = Math.ceil(state.remainingMs / 1000) * TIME_BONUS_PER_SECOND;
  state.score += timeBonus;
  state.levelScore += timeBonus;
  $('clear-title').textContent = level().name + ' — cleared!';
  $('clear-stats').innerHTML =
    'Differences found: <strong>7 of 7</strong><br>' +
    'Time bonus: <strong>+' + timeBonus + '</strong> (' + formatTime(state.remainingMs) + ' left)<br>' +
    'Mistakes this shift: <strong>' + state.mistakes + '</strong><br>' +
    'Shift score: <strong>' + state.levelScore.toLocaleString('en-GB') + '</strong><br>' +
    'Total score: <strong>' + state.score.toLocaleString('en-GB') + '</strong>';
  showScreen('clear');
  announce('Shift cleared. Time bonus ' + timeBonus + '. Total score ' + state.score + '.');
}

function gameOver() {
  $('over-title').textContent = 'Shift ended — time ran out';
  $('over-stats').innerHTML =
    'You found <strong>' + state.found.size + ' of 7</strong> differences in ' + level().name + '.<br>' +
    'Score so far: <strong>' + state.score.toLocaleString('en-GB') + '</strong>';
  showScreen('over');
  announce('Time ran out. You found ' + state.found.size + ' of 7 differences. The missed ones are circled.');
}

function victory() {
  if (state.score > state.best) {
    state.best = state.score;
    saveBest();
  }
  $('win-score').textContent = state.score.toLocaleString('en-GB');
  $('win-best').textContent = state.best.toLocaleString('en-GB');
  $('win-mistakes').textContent = String(state.mistakes);
  showScreen('victory');
  announce('Certified Cosmic Inspector. Total score ' + state.score + '.');
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

function scenePoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function handlePick(canvas, event) {
  if (state.screen !== 'playing' || state.shotMode) return;
  event.preventDefault();
  const p = scenePoint(canvas, event);
  const lv = level();
  for (const d of lv.differences) {
    if (state.found.has(d.id)) continue;
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    if (dx * dx + dy * dy <= d.r * d.r) {
      findDifference(d);
      return;
    }
  }
  wrongPick(p);
}

function findDifference(d) {
  state.found.add(d.id);
  let gained = FIND_POINTS;
  const quick = state.lastFindAt > 0 && state.now - state.lastFindAt <= QUICK_FIND_MS;
  if (quick) gained += QUICK_BONUS;
  state.lastFindAt = state.now;
  state.score += gained;
  state.levelScore += gained;
  effects.push({ kind: 'found', x: d.x, y: d.y, born: state.now, ttl: 900 });
  effects.push({
    kind: 'float', x: d.x, y: d.y - 30, born: state.now, ttl: 1100,
    text: '+' + gained + (quick ? ' quick!' : ''),
  });
  updateHud();
  if (state.found.size === level().differences.length) {
    levelCleared();
  } else {
    announce('Found: ' + d.label + '. ' + remainingCount() + ' differences left.');
  }
}

function wrongPick(p) {
  state.mistakes += 1;
  state.remainingMs = Math.max(0, state.remainingMs - WRONG_PENALTY_MS);
  effects.push({ kind: 'wrong', x: p.x, y: p.y, born: state.now, ttl: 700 });
  effects.push({ kind: 'float', x: p.x, y: p.y - 24, born: state.now, ttl: 900, text: '-3s' });
  $('stage').classList.add('shake');
  window.setTimeout(() => $('stage').classList.remove('shake'), 220);
  updateHud();
  announce('Not a difference. Three seconds lost. ' + remainingCount() + ' left.');
  if (state.remainingMs <= 0) gameOver();
}

function useHint() {
  if (state.screen !== 'playing' || state.shotMode) return;
  if (state.hintsLeft <= 0) return;
  const unfound = level().differences.filter((d) => !state.found.has(d.id));
  if (unfound.length === 0) return;
  state.hintsLeft -= 1;
  const pick = unfound[Math.floor(Math.random() * unfound.length)];
  effects.push({ kind: 'hint', x: pick.x, y: pick.y, born: state.now, ttl: 2600 });
  $('hint-btn').disabled = state.hintsLeft <= 0;
  $('hint-count').textContent = state.hintsLeft;
  announce('Hint: look near the ' + pick.label.toLowerCase() + '. ' + state.hintsLeft + ' hints left.');
}

canvasA.addEventListener('pointerdown', (e) => handlePick(canvasA, e));
canvasB.addEventListener('pointerdown', (e) => handlePick(canvasB, e));
$('hint-btn').addEventListener('click', useHint);
$('next-btn').addEventListener('click', () => {
  state.levelIndex += 1;
  if (state.levelIndex >= LEVELS.length) victory();
  else startLevel();
});
$('retry-btn').addEventListener('click', startLevel);
$('again-btn').addEventListener('click', startRun);
$('title-play-btn').addEventListener('click', startRun);

document.addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') useHint();
  if ((e.key === 'Enter' || e.key === ' ') && state.screen === 'title') {
    e.preventDefault();
    startRun();
  }
});

document.addEventListener('visibilitychange', () => {
  state.paused = document.hidden;
});

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

function updateHud() {
  $('hud-time').textContent = formatTime(state.remainingMs);
  $('hud-time').classList.toggle('low', state.remainingMs <= 15000 && state.screen === 'playing');
  $('hud-score').textContent = state.score.toLocaleString('en-GB');
  if (state.screen === 'victory') {
    // Full clear across all three shifts: 7 differences per shift.
    const total = LEVELS.reduce((n, lv) => n + lv.differences.length, 0);
    $('hud-left').textContent = total + '/' + total + ' found';
  } else {
    $('hud-left').textContent = remainingCount() + ' left';
  }
  $('hud-mistakes').textContent = '✕ ' + state.mistakes;
  canvasA.setAttribute('aria-label', 'Left picture, ' + level().short + ': ' + remainingCount() + ' differences left to find');
  canvasB.setAttribute('aria-label', 'Right picture, ' + level().short + ': ' + remainingCount() + ' differences left to find');
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function drawMarkers(ctx, lv) {
  for (const d of lv.differences) {
    if (!state.found.has(d.id)) continue;
    ctx.save();
    ctx.strokeStyle = '#7ee6c8';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + 4, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#7ee6c8';
    ctx.beginPath();
    ctx.arc(d.x + d.r * 0.55, d.y - d.r * 0.55, 11, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#123b32';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(d.x + d.r * 0.55 - 5, d.y - d.r * 0.55);
    ctx.lineTo(d.x + d.r * 0.55 - 1, d.y - d.r * 0.55 + 4);
    ctx.lineTo(d.x + d.r * 0.55 + 6, d.y - d.r * 0.55 - 5);
    ctx.stroke();
    ctx.restore();
  }
}

function drawMissed(ctx, lv) {
  for (const d of lv.differences) {
    if (state.found.has(d.id)) continue;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.95)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + 4, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEffects(ctx) {
  const now = state.now;
  for (const fx of effects) {
    const age = now - fx.born;
    if (age < 0 || age > fx.ttl) continue;
    const k = age / fx.ttl;
    ctx.save();
    if (fx.kind === 'found') {
      ctx.strokeStyle = 'rgba(126, 230, 200, ' + (1 - k).toFixed(3) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 10 + k * 34, 0, TAU);
      ctx.stroke();
    } else if (fx.kind === 'wrong') {
      ctx.strokeStyle = 'rgba(255, 107, 107, ' + (1 - k).toFixed(3) + ')';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fx.x - 12, fx.y - 12);
      ctx.lineTo(fx.x + 12, fx.y + 12);
      ctx.moveTo(fx.x + 12, fx.y - 12);
      ctx.lineTo(fx.x - 12, fx.y + 12);
      ctx.stroke();
    } else if (fx.kind === 'hint') {
      const pulse = 0.5 + 0.5 * Math.sin(age / 130);
      ctx.strokeStyle = 'rgba(255, 209, 102, ' + (0.5 + 0.5 * pulse).toFixed(3) + ')';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 30 + pulse * 10, 0, TAU);
      ctx.stroke();
    } else if (fx.kind === 'float') {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = fx.text.startsWith('-') ? '#ff6b6b' : '#ffd166';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fx.text, fx.x, fx.y - k * 22);
    }
    ctx.restore();
  }
}

function frame(now) {
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  if (!state.paused) state.now += dt;
  const t = reduceMotion ? 0 : state.now / 1000;

  if (state.screen === 'playing' && !state.shotMode && !state.paused) {
    state.remainingMs -= dt;
    if (state.remainingMs <= 0) {
      state.remainingMs = 0;
      updateHud();
      gameOver();
    }
  }

  const lv = level();
  if (!lv) {
    // No level to draw (e.g. victory pushed levelIndex past the last
    // level); keep the loop alive on the frozen final scene.
    requestAnimationFrame(frame);
    return;
  }
  drawScene(ctxA, lv, 'A', t);
  drawScene(ctxB, lv, 'B', t);
  drawMarkers(ctxA, lv);
  drawMarkers(ctxB, lv);
  if (state.screen === 'over') {
    drawMissed(ctxA, lv);
    drawMissed(ctxB, lv);
  }
  drawEffects(ctxA);
  drawEffects(ctxB);
  if (state.screen === 'playing') updateHud();
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ */
/* Screenshot staging (?shot=...) and boot                            */
/* ------------------------------------------------------------------ */

function applyShotMode() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  state.shotMode = true;
  state.paused = false;
  if (shot === 'start') {
    showTitle();
  } else if (shot === 'play') {
    state.levelIndex = 0;
    state.score = 245;
    state.mistakes = 1;
    startLevel();
    for (const d of level().differences.slice(0, 3)) state.found.add(d.id);
    state.remainingMs = 73000;
    updateHud();
  } else if (shot === 'play3') {
    state.levelIndex = 2;
    state.score = 1480;
    state.mistakes = 2;
    startLevel();
    for (const d of level().differences.slice(0, 4)) state.found.add(d.id);
    state.remainingMs = 51000;
    updateHud();
  } else if (shot === 'end') {
    state.score = 2145;
    state.mistakes = 3;
    state.best = 2145;
    victory();
  }
}

// A small handle for the screenshot turn's debugging; not part of play.
window.__spotdiff = { state, LEVELS };

applyShotMode();
if (!state.shotMode) showTitle();
updateHud();
requestAnimationFrame(frame);
