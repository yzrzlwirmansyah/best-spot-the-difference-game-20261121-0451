'use strict';
/* Spot the Difference — procedural canvas art.
 *
 * Every picture is drawn from code: no images, no fonts, no network.
 * drawScene(ctx, level, variant, t) paints one side of a level; variant
 * 'A' is the left picture, 'B' the right. The two sides share every
 * coordinate — only the seven named differences change — so a difference
 * is always a small branch inside its own prop painter. Ambient motion
 * (dust, blinking stars, a gentle bob) is driven by the same clock on
 * both sides, so nothing ambient can ever look like a difference. */

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* Small drawing helpers                                               */
/* ------------------------------------------------------------------ */

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
}

function fillCircle(ctx, x, y, r, colour) {
  ctx.fillStyle = colour;
  circle(ctx, x, y, r);
  ctx.fill();
}

function strokeCircle(ctx, x, y, r, colour, width) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  circle(ctx, x, y, r);
  ctx.stroke();
}

/** A five-pointed star centred at (x, y). */
function starPath(ctx, x, y, outer, inner, points) {
  const n = points || 5;
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / n - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function fillStar(ctx, x, y, outer, inner, colour, points) {
  ctx.fillStyle = colour;
  starPath(ctx, x, y, outer, inner, points);
  ctx.fill();
}

/** A crescent moon: a gold disc with a bite of the label colour taken out. */
function fillMoon(ctx, x, y, r, colour, bite) {
  fillCircle(ctx, x, y, r, colour);
  fillCircle(ctx, x + r * 0.45, y - r * 0.2, r * 0.85, bite);
}

/** A sock shape, pointing down-right, rotated by `angle` radians. */
function drawSock(ctx, x, y, angle, scale, colour, cuff) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-7, -22);
  ctx.lineTo(7, -22);
  ctx.lineTo(7, 4);
  ctx.lineTo(16, 14);
  ctx.lineTo(12, 22);
  ctx.lineTo(-2, 18);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = cuff;
  rr(ctx, -8, -26, 16, 7, 2);
  ctx.fill();
  ctx.restore();
}

/** A simple folded towel: a rounded slab with a stripe. */
function drawTowel(ctx, x, y, w, colour, stripe) {
  ctx.fillStyle = colour;
  rr(ctx, x, y, w, 13, 5);
  ctx.fill();
  ctx.fillStyle = stripe;
  ctx.fillRect(x + 6, y + 5, w - 12, 3);
}

/* ------------------------------------------------------------------ */
/* Shared scenery                                                      */
/* ------------------------------------------------------------------ */

/** Drifting dust motes, seeded per level so both sides match exactly. */
function drawDust(ctx, level, t) {
  const rand = mulberry32(level.seed * 7 + 11);
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const bx = rand() * SCENE_W;
    const by = rand() * SCENE_H;
    const speed = 4 + rand() * 8;
    const x = (bx + t * speed * 0.3) % SCENE_W;
    const y = by + Math.sin(t * 0.5 + i) * 3;
    const twinkle = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 1.7));
    ctx.fillStyle = 'rgba(255, 244, 200, ' + twinkle.toFixed(3) + ')';
    circle(ctx, x, y, 1 + rand() * 1.6);
    ctx.fill();
  }
  ctx.restore();
}

/** A few blinking stars high in the scene, identical on both sides. */
function drawStars(ctx, level, t, count) {
  const rand = mulberry32(level.seed * 13 + 5);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = 20 + rand() * (SCENE_W - 40);
    const y = 12 + rand() * 120;
    const r = 1 + rand() * 1.8;
    const glow = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2 + i * 2.3));
    ctx.fillStyle = 'rgba(255, 255, 230, ' + glow.toFixed(3) + ')';
    starPath(ctx, x, y, r * 2.4, r, 4);
    ctx.fill();
  }
  ctx.restore();
}

/** Wall + floor base for indoor scenes. */
function drawRoom(ctx, level) {
  const grad = ctx.createLinearGradient(0, 0, 0, SCENE_H);
  grad.addColorStop(0, level.sky[0]);
  grad.addColorStop(1, level.sky[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);
  ctx.fillStyle = level.floor;
  ctx.fillRect(0, 380, SCENE_W, 60);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= SCENE_W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 380);
    ctx.lineTo(x - 30, SCENE_H);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, 408);
  ctx.lineTo(SCENE_W, 408);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/* Level 1 — Laundromat                                                */
/* ------------------------------------------------------------------ */

function drawDetergent(ctx, variant) {
  // Bottle on the top-left shelf; the label shows a star (A) or a moon (B).
  ctx.fillStyle = '#3f2a6e';
  rr(ctx, 88, 40, 64, 10, 4);
  ctx.fill();
  ctx.fillStyle = '#7ee6c8';
  rr(ctx, 104, 52, 32, 46, 8);
  ctx.fill();
  ctx.fillStyle = '#123b32';
  rr(ctx, 112, 58, 16, 10, 3);
  ctx.fill();
  ctx.fillStyle = '#fff8e0';
  rr(ctx, 108, 72, 24, 20, 3);
  ctx.fill();
  if (variant === 'A') fillStar(ctx, 120, 82, 8, 3.4, '#ffb347');
  else fillMoon(ctx, 120, 82, 7, '#ffb347', '#fff8e0');
}

function drawPlanetPoster(ctx, variant) {
  ctx.fillStyle = '#f4e9ff';
  rr(ctx, 468, 36, 104, 88, 8);
  ctx.fill();
  ctx.strokeStyle = '#c9a7ff';
  ctx.lineWidth = 3;
  rr(ctx, 468, 36, 104, 88, 8);
  ctx.stroke();
  fillCircle(ctx, 520, 78, 24, '#ff8fb3');
  fillCircle(ctx, 512, 70, 7, 'rgba(255,255,255,0.35)');
  if (variant === 'A') {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(520, 78, 38, 10, -0.35, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#5b4a8a';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SATURN SPA', 520, 114);
}

function drawClock(ctx, variant) {
  fillCircle(ctx, 320, 62, 26, '#fff8e0');
  strokeCircle(ctx, 320, 62, 26, '#2a1d5e', 4);
  ctx.strokeStyle = '#2a1d5e';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  // Short hand always points at ten.
  ctx.beginPath();
  ctx.moveTo(320, 62);
  ctx.lineTo(306, 50);
  ctx.stroke();
  // Long hand: straight up (A) or to the right (B).
  ctx.beginPath();
  ctx.moveTo(320, 62);
  if (variant === 'A') ctx.lineTo(320, 42);
  else ctx.lineTo(340, 62);
  ctx.stroke();
  fillCircle(ctx, 320, 62, 3, '#ff6b6b');
  ctx.lineCap = 'butt';
}

function drawWasher(ctx, cx, variant, t) {
  const wobble = Math.sin(t * 1.1 + cx) * 0.6;
  ctx.save();
  ctx.translate(cx + wobble * 0.2, 0);
  ctx.fillStyle = '#8f7fd6';
  rr(ctx, -62, 240, 124, 140, 14);
  ctx.fill();
  ctx.fillStyle = '#6a55b8';
  rr(ctx, -62, 240, 124, 22, 10);
  ctx.fill();
  // Control panel: two dials and a glowing button.
  fillCircle(ctx, -34, 252, 7, '#ffd166');
  fillCircle(ctx, -12, 252, 7, '#7ee6c8');
  ctx.fillStyle = '#ff6b6b';
  rr(ctx, 8, 246, 34, 12, 6);
  ctx.fill();
  // Round porthole door.
  fillCircle(ctx, 0, 310, 36, '#1c1440');
  strokeCircle(ctx, 0, 310, 36, '#d9ccff', 5);
  ctx.save();
  circle(ctx, 0, 310, 29);
  ctx.clip();
  ctx.fillStyle = '#7ec8f7';
  ctx.fillRect(-30, 292, 60, 36);
  if (variant === 'A') {
    // A full drum of soap bubbles.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const bubbles = [[-16, -6, 7], [4, -12, 9], [16, 2, 6], [-4, 10, 8], [14, 14, 5], [-18, 12, 5]];
    for (const b of bubbles) {
      circle(ctx, b[0], 310 + b[1], b[2]);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.restore();
}

function drawAlien(ctx, variant, t) {
  const bob = Math.sin(t * 1.6) * 2;
  const x = 478;
  const y = 300 + bob;
  // Antenna: a ball tip (A) or a star tip (B).
  ctx.strokeStyle = '#7ee6c8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 62);
  ctx.lineTo(x, y - 88);
  ctx.stroke();
  if (variant === 'A') fillCircle(ctx, x, y - 94, 7, '#ffd166');
  else fillStar(ctx, x, y - 94, 9, 4, '#ffd166');
  // Head and body.
  ctx.fillStyle = '#8be04e';
  ellipse(ctx, x, y - 40, 30, 34);
  ctx.fill();
  ctx.fillStyle = '#5cb531';
  ellipse(ctx, x, y + 18, 34, 42);
  ctx.fill();
  // Big dark eyes, always the same on both sides.
  fillCircle(ctx, x - 12, y - 46, 6, '#14210a');
  fillCircle(ctx, x + 12, y - 46, 6, '#14210a');
  ctx.fillStyle = '#14210a';
  ctx.beginPath();
  ctx.arc(x, y - 26, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.fill();
  // Little arms holding a laundry ticket.
  ctx.strokeStyle = '#5cb531';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 30, y + 6);
  ctx.lineTo(x - 46, y + 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 30, y + 6);
  ctx.lineTo(x + 44, y + 30);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#fff8e0';
  rr(ctx, x + 34, y + 28, 26, 18, 3);
  ctx.fill();
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('42', x + 47, y + 41);
}

function drawBasket(ctx, variant) {
  // Laundry basket, bottom-left: heaped with clothes (A) or empty (B).
  ctx.fillStyle = '#c98a4b';
  ctx.beginPath();
  ctx.moveTo(55, 352);
  ctx.lineTo(115, 352);
  ctx.lineTo(108, 396);
  ctx.lineTo(62, 396);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a5a26';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(60 + i * 4, 362 + i * 10);
    ctx.lineTo(110 - i * 4, 362 + i * 10);
    ctx.stroke();
  }
  if (variant === 'A') {
    fillCircle(ctx, 72, 348, 12, '#ff8fb3');
    fillCircle(ctx, 88, 344, 13, '#7ec8f7');
    fillCircle(ctx, 102, 349, 11, '#ffd166');
  }
}

function drawLaundromat(ctx, variant, t) {
  drawRoom(ctx, LEVELS[0]);
  drawStars(ctx, LEVELS[0], t, 6);
  drawDetergent(ctx, variant);
  drawPlanetPoster(ctx, variant);
  drawClock(ctx, variant);
  drawWasher(ctx, 170, variant, t);
  drawWasher(ctx, 330, 'A', t);
  // Second washer's door is identical on both sides; its dial light blinks.
  const blink = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.fillStyle = 'rgba(255,107,107,' + (0.4 + 0.6 * blink).toFixed(3) + ')';
  rr(ctx, 338, 246, 34, 12, 6);
  ctx.fill();
  drawAlien(ctx, variant, t);
  drawBasket(ctx, variant);
  // A stray sock on the floor: pink (A) or teal (B).
  drawSock(ctx, 560, 405, variant === 'A' ? 0.5 : 0.5, 1, variant === 'A' ? '#ff8fb3' : '#2ec4b6', variant === 'A' ? '#ffd166' : '#e0fbfc');
  // A rug under the washers.
  ctx.fillStyle = 'rgba(255,209,102,0.25)';
  ellipse(ctx, 250, 414, 150, 14);
  ctx.fill();
}

/* ------------------------------------------------------------------ */
/* Level 2 — Lost & Found Orbit                                        */
/* ------------------------------------------------------------------ */

function drawShelves(ctx, variant) {
  ctx.fillStyle = '#274b63';
  rr(ctx, 36, 56, 300, 12, 4);
  ctx.fill();
  rr(ctx, 36, 128, 300, 12, 4);
  ctx.fill();
  // Top shelf: three folded towels (A) or four (B), stacked upward.
  const towels = variant === 'A' ? 3 : 4;
  const colours = ['#ff8fb3', '#7ec8f7', '#ffd166', '#7ee6c8'];
  const stripes = ['#ffd166', '#fff8e0', '#ff8fb3', '#2a1d5e'];
  for (let i = 0; i < towels; i++) {
    drawTowel(ctx, 70 + i * 2, 96 - i * 14, 116 - i * 4, colours[i], stripes[i]);
  }
  // Lower shelf: a row of small parcels, identical both sides.
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = ['#c98a4b', '#8f7fd6', '#2ec4b6', '#ff8fb3'][i];
    rr(ctx, 52 + i * 66, 108, 52, 20, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(78 + i * 66, 108);
    ctx.lineTo(78 + i * 66, 128);
    ctx.stroke();
  }
}

function drawRobot(ctx, variant, t) {
  const x = 320;
  const y = 250 + Math.sin(t * 1.2) * 1.5;
  // Legs and body.
  ctx.fillStyle = '#9aa7bd';
  rr(ctx, x - 34, y - 6, 68, 66, 12);
  ctx.fill();
  ctx.fillStyle = '#6b7a94';
  rr(ctx, x - 26, y + 60, 18, 26, 5);
  ctx.fill();
  rr(ctx, x + 8, y + 60, 18, 26, 5);
  ctx.fill();
  // Head with antenna and friendly eyes.
  ctx.fillStyle = '#c3cede';
  rr(ctx, x - 26, y - 58, 52, 40, 10);
  ctx.fill();
  ctx.strokeStyle = '#9aa7bd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 58);
  ctx.lineTo(x, y - 72);
  ctx.stroke();
  fillCircle(ctx, x, y - 76, 5, '#ff6b6b');
  fillCircle(ctx, x - 12, y - 42, 5, '#14210a');
  fillCircle(ctx, x + 12, y - 42, 5, '#14210a');
  ctx.strokeStyle = '#14210a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 34, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Chest light: a square (A) or a circle (B).
  ctx.fillStyle = '#ffd166';
  if (variant === 'A') {
    rr(ctx, x - 11, y + 6, 22, 22, 3);
    ctx.fill();
  } else {
    fillCircle(ctx, x, y + 17, 12, '#ffd166');
  }
  ctx.fillStyle = '#14210a';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('L&F', x, y + 46);
}

function drawPorthole(ctx, variant, t) {
  // Round window with the stars outside; a tiny UFO floats by on side A only.
  fillCircle(ctx, 556, 88, 42, '#081826');
  strokeCircle(ctx, 556, 88, 42, '#c3cede', 6);
  ctx.save();
  circle(ctx, 556, 88, 38);
  ctx.clip();
  ctx.fillStyle = '#0f2a3d';
  ctx.fillRect(518, 50, 76, 76);
  const rand = mulberry32(99);
  for (let i = 0; i < 8; i++) {
    const sx = 524 + rand() * 64;
    const sy = 56 + rand() * 64;
    ctx.fillStyle = 'rgba(255,255,230,0.9)';
    circle(ctx, sx, sy, 1.4);
    ctx.fill();
  }
  if (variant === 'A') {
    // Little green saucer with a dome.
    ctx.fillStyle = '#8be04e';
    ellipse(ctx, 556, 92, 16, 6);
    ctx.fill();
    ctx.fillStyle = '#b8f28a';
    ctx.beginPath();
    ctx.arc(556, 90, 7, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    fillCircle(ctx, 548, 94, 2, '#ffd166');
    fillCircle(ctx, 556, 95, 2, '#ffd166');
    fillCircle(ctx, 564, 94, 2, '#ffd166');
  }
  ctx.restore();
}

function drawOrbit(ctx, variant, t) {
  drawRoom(ctx, LEVELS[1]);
  drawShelves(ctx, variant);
  drawPorthole(ctx, variant, t);
  // A floating sock drifts mid-air: upright (A) or tilted 45 degrees (B).
  const bobY = Math.sin(t * 1.4) * 4;
  drawSock(ctx, 500, 150 + bobY, variant === 'A' ? 0 : Math.PI / 4, 1.1, '#7ee6c8', '#ffd166');
  drawRobot(ctx, variant, t);
  // A suitcase on the floor: yellow handle (A) or coral handle (B).
  ctx.fillStyle = '#8f7fd6';
  rr(ctx, 150, 330, 100, 56, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  rr(ctx, 150, 330, 100, 56, 10);
  ctx.stroke();
  ctx.fillStyle = variant === 'A' ? '#ffd166' : '#ff6b6b';
  rr(ctx, 182, 316, 36, 16, 6);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MARS', 200, 362);
  // A basket with a patch: an oval (A) or a star (B).
  ctx.fillStyle = '#c98a4b';
  ctx.beginPath();
  ctx.moveTo(388, 336);
  ctx.lineTo(452, 336);
  ctx.lineTo(446, 388);
  ctx.lineTo(394, 388);
  ctx.closePath();
  ctx.fill();
  if (variant === 'A') {
    ctx.fillStyle = '#ff8fb3';
    ellipse(ctx, 420, 362, 16, 10);
    ctx.fill();
  } else {
    fillStar(ctx, 420, 362, 14, 6, '#ff8fb3');
  }
  // A hanging scarf: two broad stripes (A) or three (B).
  ctx.fillStyle = '#ff8fb3';
  rr(ctx, 74, 168, 32, 84, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  const stripes = variant === 'A' ? [186, 218] : [182, 204, 226];
  for (const sy of stripes) ctx.fillRect(74, sy, 32, 8);
  ctx.fillStyle = '#7ec8f7';
  ctx.beginPath();
  ctx.moveTo(74, 252);
  ctx.lineTo(90, 268);
  ctx.lineTo(106, 252);
  ctx.closePath();
  ctx.fill();
  // A small potted plant by the door, identical both sides.
  ctx.fillStyle = '#c98a4b';
  rr(ctx, 580, 356, 34, 26, 4);
  ctx.fill();
  ctx.fillStyle = '#5cb531';
  ellipse(ctx, 597, 348, 8, 20);
  ctx.fill();
  ellipse(ctx, 590, 344, 6, 14);
  ctx.fill();
  ellipse(ctx, 604, 344, 6, 14);
  ctx.fill();
}

/* ------------------------------------------------------------------ */
/* Level 3 — Rooftop Drying Dock                                       */
/* ------------------------------------------------------------------ */

function drawEarth(ctx, variant) {
  // Earth low on the horizon, with a small moon that sits
  // upper-right of it (A) or lower-right (B).
  fillCircle(ctx, 556, 78, 32, '#4aa8ff');
  ctx.fillStyle = '#2e7d32';
  ellipse(ctx, 546, 70, 12, 8);
  ctx.fill();
  ellipse(ctx, 566, 88, 10, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ellipse(ctx, 552, 62, 14, 5);
  ctx.fill();
  const moon = variant === 'A' ? { x: 602, y: 40 } : { x: 602, y: 106 };
  fillCircle(ctx, moon.x, moon.y, 9, '#e8e8e8');
  fillCircle(ctx, moon.x - 3, moon.y - 2, 2, '#c8c8c8');
}

function drawBeacon(ctx, variant, t) {
  // Rooftop beacon pole: one glowing band (A) or two (B).
  ctx.fillStyle = '#6b7a94';
  ctx.fillRect(76, 34, 8, 60);
  ctx.fillStyle = '#2a1d5e';
  rr(ctx, 64, 92, 32, 10, 3);
  ctx.fill();
  const pulse = 0.6 + 0.4 * Math.sin(t * 4);
  ctx.fillStyle = 'rgba(255,107,107,' + pulse.toFixed(3) + ')';
  ctx.fillRect(72, 40, 16, 8);
  if (variant === 'B') ctx.fillRect(72, 54, 16, 8);
  fillCircle(ctx, 80, 30, 6, '#ff6b6b');
}

function drawSolarPanel(ctx, variant) {
  // Tilted solar panel; one cell shines bright (A) or stays dark (B).
  ctx.save();
  ctx.translate(120, 90);
  ctx.rotate(-0.18);
  ctx.fillStyle = '#274b63';
  rr(ctx, -52, -30, 104, 60, 6);
  ctx.fill();
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const bright = !(r === 0 && c === 1 && variant === 'B');
      ctx.fillStyle = bright ? '#7ec8f7' : '#1d3550';
      ctx.fillRect(-46 + c * 24, -24 + r * 26, 20, 20);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#6b7a94';
  ctx.fillRect(114, 118, 12, 22);
}

function drawClothesline(ctx, variant, t) {
  const sway = Math.sin(t * 1.1) * 2;
  ctx.strokeStyle = '#c3cede';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 128);
  ctx.lineTo(590, 128);
  ctx.stroke();
  ctx.fillStyle = '#6b7a94';
  ctx.fillRect(50, 128, 6, 30);
  ctx.fillRect(584, 128, 6, 30);
  // Shirt on the line: a square pocket (A) or no pocket (B).
  ctx.save();
  ctx.translate(180 + sway, 150);
  ctx.fillStyle = '#ff8fb3';
  ctx.beginPath();
  ctx.moveTo(-28, -18);
  ctx.lineTo(-12, -18);
  ctx.lineTo(-12, 26);
  ctx.lineTo(12, 26);
  ctx.lineTo(12, -18);
  ctx.lineTo(28, -18);
  ctx.lineTo(34, 6);
  ctx.lineTo(14, 10);
  ctx.lineTo(14, 26);
  ctx.lineTo(-14, 26);
  ctx.lineTo(-14, 10);
  ctx.lineTo(-34, 6);
  ctx.closePath();
  ctx.fill();
  if (variant === 'A') {
    ctx.fillStyle = '#e56a97';
    rr(ctx, -2, 2, 14, 12, 2);
    ctx.fill();
  }
  ctx.restore();
  // Shorts on the line: mint (A) or lavender (B).
  ctx.save();
  ctx.translate(320 - sway, 158);
  ctx.fillStyle = variant === 'A' ? '#7ee6c8' : '#c9a7ff';
  ctx.beginPath();
  ctx.moveTo(-24, -24);
  ctx.lineTo(24, -24);
  ctx.lineTo(24, 22);
  ctx.lineTo(4, 22);
  ctx.lineTo(0, 2);
  ctx.lineTo(-4, 22);
  ctx.lineTo(-24, 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(-24, -24, 48, 6);
  ctx.restore();
  // A small towel pegged at the far end, identical both sides.
  ctx.fillStyle = '#ffd166';
  rr(ctx, 470, 128, 26, 34, 4);
  ctx.fill();
}

function drawMaintenanceRobot(ctx, variant, t) {
  const x = 470;
  const y = 300 + Math.sin(t * 1.3) * 1.5;
  ctx.fillStyle = '#9aa7bd';
  rr(ctx, x - 30, y - 10, 60, 70, 12);
  ctx.fill();
  ctx.fillStyle = '#6b7a94';
  rr(ctx, x - 22, y + 60, 16, 24, 5);
  ctx.fill();
  rr(ctx, x + 6, y + 60, 16, 24, 5);
  ctx.fill();
  ctx.fillStyle = '#c3cede';
  rr(ctx, x - 22, y - 56, 44, 36, 9);
  ctx.fill();
  fillCircle(ctx, x - 9, y - 40, 4, '#14210a');
  fillCircle(ctx, x + 9, y - 40, 4, '#14210a');
  ctx.strokeStyle = '#14210a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 28);
  ctx.lineTo(x + 8, y - 28);
  ctx.stroke();
  // Raised arm holding a wrench (A) or a flower (B).
  ctx.strokeStyle = '#9aa7bd';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 28, y + 6);
  ctx.lineTo(x + 44, y - 26);
  ctx.stroke();
  ctx.lineCap = 'butt';
  if (variant === 'A') {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 44, y - 26);
    ctx.lineTo(x + 44, y - 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 44, y - 44, 7, 0.6, Math.PI * 1.9);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#5cb531';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 44, y - 26);
    ctx.lineTo(x + 44, y - 40);
    ctx.stroke();
    fillStar(ctx, x + 44, y - 46, 9, 4, '#ff8fb3');
    fillCircle(ctx, x + 44, y - 46, 3, '#ffd166');
  }
}

function drawGreenhouse(ctx, variant) {
  // Glass dome with broad leaves inside: three (A) or four (B).
  ctx.fillStyle = 'rgba(126,200,247,0.25)';
  ctx.beginPath();
  ctx.arc(540, 372, 46, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c3cede';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(540, 372, 46, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#c98a4b';
  ctx.fillRect(492, 368, 96, 10);
  const leaves = variant === 'A' ? 3 : 4;
  for (let i = 0; i < leaves; i++) {
    const lx = 516 + i * 16;
    const lh = 26 + (i % 2) * 8;
    ctx.fillStyle = '#5cb531';
    ctx.beginPath();
    ctx.ellipse(lx, 366 - lh / 2, 6, lh / 2, (i - 1.5) * 0.25, 0, TAU);
    ctx.fill();
  }
  fillCircle(ctx, 540, 352, 5, '#ff6b6b');
}

function drawRooftop(ctx, variant, t) {
  const grad = ctx.createLinearGradient(0, 0, 0, SCENE_H);
  grad.addColorStop(0, LEVELS[2].sky[0]);
  grad.addColorStop(1, LEVELS[2].sky[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);
  drawStars(ctx, LEVELS[2], t, 14);
  drawEarth(ctx, variant);
  // Rooftop deck.
  ctx.fillStyle = LEVELS[2].floor;
  ctx.fillRect(0, 380, SCENE_W, 60);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= SCENE_W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 380);
    ctx.lineTo(x - 30, SCENE_H);
    ctx.stroke();
  }
  // Railing along the back edge.
  ctx.strokeStyle = '#6b7a94';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 372);
  ctx.lineTo(SCENE_W, 372);
  ctx.stroke();
  for (let x = 20; x < SCENE_W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 372);
    ctx.lineTo(x, 396);
    ctx.stroke();
  }
  drawBeacon(ctx, variant, t);
  drawSolarPanel(ctx, variant);
  drawClothesline(ctx, variant, t);
  drawMaintenanceRobot(ctx, variant, t);
  drawGreenhouse(ctx, variant);
  drawDust(ctx, LEVELS[2], t);
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/** Paint one side of a level: variant 'A' (left) or 'B' (right). */
function drawScene(ctx, level, variant, t) {
  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  if (level.id === 'laundromat') {
    drawLaundromat(ctx, variant, t);
  } else if (level.id === 'orbit') {
    drawOrbit(ctx, variant, t);
  } else {
    drawRooftop(ctx, variant, t);
  }
  if (level.id !== 'rooftop') drawDust(ctx, level, t);
}
