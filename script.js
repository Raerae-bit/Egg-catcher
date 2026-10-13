
"use strict";

// -----------------------------------------
// EGG CATCHER - main game
// -----------------------------------------

const $ = (id) => document.getElementById(id);

const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");

const screens = {
  menu: $("menu"),
  game: $("gameScreen"),
  settings: $("settingsScreen"),
  how: $("howScreen"),
  developer: $("developerScreen")
};

const settings = {
  music: true,
  sound: true,
  difficulty: "normal",
  sparkle: true
};

let state = "menu";
let previousScreen = "menu";
let animationId = 0;
let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let score = 0;
let lives = 3;
let caught = 0;
let eggs = [];
let particles = [];
let stars = [];
let player = { x: 220, y: 465, w: 40, h: 36, speed: 250 };
let keys = { left: false, right: false };
let audioContext = null;
let musicTimer = null;

// Create a tiny pixel-art drawing helper.
function pixel(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// Draw pixel blocks so the chick looks like a game sprite.
function drawChick(x, y, time) {
  const flap = Math.sin(time * 0.015) > 0 ? 1 : 0;
  const X = Math.round(x);
  const Y = Math.round(y);

  // Little shadow
  ctx.globalAlpha = 0.16;
  pixel(X + 5, Y + 34, 31, 5, "#435e83");
  ctx.globalAlpha = 1;

  // Tail feathers
  pixel(X + 1, Y + 18, 8, 9, "#f5c94e");
  pixel(X - 2, Y + 16, 7, 6, "#ffe88b");

  // Wings
  pixel(X + 6, Y + 16 - flap * 5, 9, 9, "#f7cb4e");
  pixel(X + 9, Y + 13 - flap * 5, 6, 7, "#ffe992");

  pixel(X + 25, Y + 16 - flap * 4, 9, 9, "#f7cb4e");
  pixel(X + 26, Y + 13 - flap * 4, 6, 7, "#ffe992");

  // Main body
  pixel(X + 5, Y + 13, 30, 17, "#f5c943");
  pixel(X + 8, Y + 8, 25, 21, "#ffdf68");
  pixel(X + 13, Y + 5, 17, 6, "#ffe88b");
  pixel(X + 17, Y + 2, 5, 5, "#ffdf68");

  // Belly
  pixel(X + 12, Y + 22, 17, 7, "#fff0ae");

  // Eyes
  pixel(X + 13, Y + 13, 5, 7, "#ffffff");
  pixel(X + 25, Y + 13, 5, 7, "#ffffff");
  pixel(X + 15, Y + 15, 3, 4, "#493d59");
  pixel(X + 27, Y + 15, 3, 4, "#493d59");
  pixel(X + 15, Y + 15, 1, 1, "#ffffff");
  pixel(X + 27, Y + 15, 1, 1, "#ffffff");

  // Cheeks
  pixel(X + 8, Y + 22, 5, 3, "#f7a2ad");
  pixel(X + 29, Y + 22, 5, 3, "#f7a2ad");

  // Beak
  pixel(X + 18, Y + 19, 7, 4, "#ed9945");
  pixel(X + 20, Y + 23, 4, 2, "#e78137");

  // Feet
  pixel(X + 12, Y + 30, 6, 4, "#ee9a43");
  pixel(X + 25, Y + 30, 6, 4, "#ee9a43");
}

// Draw a little egg using chunky pixel blocks.
function drawEgg(x, y, size = 20) {
  const s = size / 20;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  pixel(-5, -10, 10, 3, "#c28c80");
  pixel(-8, -7, 16, 5, "#c28c80");
  pixel(-9, -2, 18, 8, "#c28c80");
  pixel(-7, 6, 14, 6, "#c28c80");
  pixel(-4, 12, 8, 3, "#c28c80");

  pixel(-5, -9, 10, 3, "#fffdf5");
  pixel(-7, -6, 14, 5, "#fff5dd");
  pixel(-8, -1, 16, 8, "#fff5dd");
  pixel(-6, 7, 12, 5, "#f9e5c6");
  pixel(-3, 12, 6, 2, "#f9e5c6");

  pixel(-5, -6, 3, 4, "#ffffff");
  ctx.restore();
}

// Make the countryside background.
function drawBackground(time) {
  ctx.fillStyle = "#9edafa";
  ctx.fillRect(0, 0, 480, 600);

  // Soft clouds
  drawCloud(50, 80);
  drawCloud(365, 125);
  drawCloud(255, 220);

  // Faraway hills
  ctx.fillStyle = "#b5e6be";
  ctx.beginPath();
  ctx.moveTo(0, 390);
  ctx.quadraticCurveTo(100, 300, 210, 390);
  ctx.quadraticCurveTo(330, 285, 480, 375);
  ctx.lineTo(480, 600);
  ctx.lineTo(0, 600);
  ctx.fill();

  // Ground
  ctx.fillStyle = "#91d68d";
  ctx.fillRect(0, 495, 480, 105);

  // Grass pixel patches
  for (let i = 0; i < 34; i++) {
    const x = (i * 73) % 480;
    const y = 505 + ((i * 31) % 87);
    pixel(x, y, 5, 4, i % 2 ? "#72c67a" : "#b5e99c");
  }

  // Flowers
  for (let i = 0; i < 12; i++) {
    const x = (i * 43 + 17) % 480;
    const y = 530 + (i * 17) % 48;
    pixel(x, y, 4, 4, i % 2 ? "#f49cbd" : "#fff3b2");
    pixel(x + 1, y + 4, 2, 5, "#57a96b");
  }

  // Wooden fence
  ctx.fillStyle = "#b88057";
  ctx.fillRect(0, 566, 480, 8);
  ctx.fillRect(0, 585, 480, 8);

  for (let x = 10; x < 480; x += 34) {
    ctx.fillStyle = "#dca777";
    ctx.fillRect(x, 555, 7, 42);
    ctx.fillStyle = "#a76c49";
    ctx.fillRect(x + 5, 555, 2, 42);
  }

  // A little basket where the chick catches eggs
  drawBasket(240, 543);

  if (settings.sparkle) {
    for (let i = 0; i < 5; i++) {
      const x = (i * 103 + 27) % 460 + 10;
      const y = 175 + ((i * 59) % 200);
      if (Math.sin(time / 400 + i) > 0.65) {
        pixel(x, y, 4, 4, "#fff9d8");
        pixel(x + 1, y - 3, 2, 10, "#fff9d8");
        pixel(x - 2, y + 1, 8, 2, "#fff9d8");
      }
    }
  }
}

function drawCloud(x, y) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y + 8, 55, 16);
  ctx.fillRect(x + 9, y, 20, 25);
  ctx.fillRect(x + 27, y + 4, 19, 20);
  ctx.fillStyle = "#e8f7ff";
  ctx.fillRect(x + 5, y + 20, 42, 4);
}

function drawBasket(x, y) {
  pixel(x - 23, y, 46, 4, "#dca35f");
  pixel(x - 20, y + 4, 40, 13, "#c88b4d");
  pixel(x - 15, y + 7, 30, 3, "#edbd70");
  pixel(x - 11, y + 12, 22, 3, "#b97c42");
  pixel(x - 17, y + 16, 34, 3, "#8d6748");
}

// -----------------------------------------
// Sound
// -----------------------------------------

function playTone(frequency = 660, duration = 0.08, type = "square") {
  if (!settings.sound) return;

  try {
    audioContext ||= new (
      window.AudioContext || window.webkitAudioContext
    )();

    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001, audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // The game still works if the browser blocks audio.
  }
}

// Gentle optional music made from browser tones.
function startMusic() {
  stopMusic();
  if (!settings.music) return;

  const notes = [523, 659, 784, 659, 587, 698, 880, 698];
  let index = 0;

  musicTimer = setInterval(() => {
    if (state === "playing" && settings.music) {
      const previousSound = settings.sound;
      settings.sound = true;
      playTone(notes[index % notes.length], 0.09, "triangle");
      settings.sound = previousSound;
      index++;
    }
  }, 450);
}

function stopMusic() {
  if (musicTimer !== null) clearInterval(musicTimer);
  musicTimer = null;
}

// -----------------------------------------
// Screen navigation
// -----------------------------------------

function showScreen(name) {
  Object.values(screens).forEach(screen =>
    screen.classList.add("hidden")
  );
  screens[name].classList.remove("hidden");
}

function goToMenu() {
  state = "menu";
  keys.left = false;
  keys.right = false;
  $("pauseOverlay").classList.add("hidden");
  $("endOverlay").classList.add("hidden");
  showScreen("menu");
  stopMusic();
}

function openSettings() {
  previousScreen = state === "playing" || state === "paused"
    ? "game" : "menu";

  if (state === "playing") {
    state = "paused";
    $("pauseOverlay").classList.remove("hidden");
  }

  showScreen("settings");
}

function returnFromSettings() {
  if (previousScreen === "game") {
    showScreen("game");
    if (state === "paused") {
      $("pauseOverlay").classList.remove("hidden");
    }
  } else {
    state = "menu";
    showScreen("menu");
  }
}

function updateHUD() {
  $("score").textContent = score;
  $("lives").textContent = lives;
  $("caught").textContent = caught;
}

function startGame() {
  stopMusic();
  state = "playing";
  score = 0;
  lives = 3;
  caught = 0;
  elapsed = 0;
  spawnTimer = 0;
  lastTime = 0;
  eggs = [];
  particles = [];
  keys.left = false;
  keys.right = false;

  player.x = 220;
  player.y = 460;

  $("pauseOverlay").classList.add("hidden");
  $("endOverlay").classList.add("hidden");
  updateHUD();
  showScreen("game");

  startMusic();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (state !== "playing") return;
  state = "paused";
  keys.left = false;
  keys.right = false;
  $("pauseOverlay").classList.remove("hidden");
  stopMusic();
}

function resumeGame() {
  if (state !== "paused") return;
  state = "playing";
  $("pauseOverlay").classList.add("hidden");
  lastTime = 0;
  startMusic();
  animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
  state = "over";
  stopMusic();
  keys.left = false;
  keys.right = false;

  $("endTitle").textContent = "Sweet little adventure!";
  $("endText").textContent =
    `You caught ${caught} eggs and earned ${score} points!`;

  $("pauseOverlay").classList.add("hidden");
  $("endOverlay").classList.remove("hidden");
  playTone(330, 0.22, "triangle");
}

// -----------------------------------------
// Eggs and particles
// -----------------------------------------

function spawnEgg() {
  eggs.push({
    x: 20 + Math.random() * 440,
    y: -20,
    speed: getEggSpeed(),
    size: 20,
    wobble: Math.random() * Math.PI * 2
  });
}

function getEggSpeed() {
  const base = {
    easy: 85,
    normal: 125,
    hard: 175
  }[settings.difficulty] || 125;

  return base + Math.min(score * 0.12, 100) + Math.random() * 25;
}

function burst(x, y) {
  for (let i = 0; i < 9; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 150,
      vy: -40 - Math.random() * 100,
      life: 0.5,
      color: ["#f49cbd", "#ffe27a", "#ffffff"][i % 3]
    });
  }
}

function updateEggs(dt) {
  spawnTimer += dt;

  const spawnInterval = {
    easy: 1.35,
    normal: 0.95,
    hard: 0.68
  }[settings.difficulty] || 0.95;

  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnEgg();
  }

  for (let i = eggs.length - 1; i >= 0; i--) {
    const egg = eggs[i];
    egg.y += egg.speed * dt;
    egg.wobble += dt * 4;

    // The chick's body acts as a catcher.
    const chickCenter = player.x + player.w / 2;
    const eggW = egg.x + Math.sin(egg.wobble) * 3;

    if (
      egg.y + 10 >= player.y + 8 &&
      egg.y - 10 <= player.y + player.h &&
      Math.abs(eggW - chickCenter) < 27
    ) {
      score += 10;
      caught++;
      burst(eggW, egg.y);
      playTone(880, 0.07);
      eggs.splice(i, 1);
      updateHUD();
      continue;
    }

    // Missed eggs cost one heart.
    if (egg.y > 600) {
      lives--;
      playTone(190, 0.12, "triangle");
      eggs.splice(i, 1);
      updateHUD();

      if (lives <= 0) {
        endGame();
        return;
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
    p.life -= dt;

    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawEggs() {
  eggs.forEach(egg => {
    drawEgg(egg.x + Math.sin(egg.wobble) * 3, egg.y, egg.size);
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    pixel(p.x, p.y, 5, 5, p.color);
  });
  ctx.globalAlpha = 1;
}

// -----------------------------------------
// Main game loop
// -----------------------------------------

function gameLoop(timestamp) {
  if (state !== "playing") return;

  const dt = lastTime
    ? Math.min((timestamp - lastTime) / 1000, 0.04)
    : 0;

  lastTime = timestamp;
  elapsed += dt;

  drawBackground(timestamp);

  if (keys.left) player.x -= player.speed * dt;
  if (keys.right) player.x += player.speed * dt;

  player.x = Math.max(0, Math.min(480 - player.w, player.x));

  updateEggs(dt);
  updateParticles(dt);

  drawEggs();
  drawChick(player.x, player.y, timestamp);
  drawParticles();

  if (state === "playing") {
    animationId = requestAnimationFrame(gameLoop);
  }
}

// -----------------------------------------
// Keyboard controls
// -----------------------------------------

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowleft" || key === "a") keys.left = true;
  if (key === "arrowright" || key === "d") keys.right = true;

  if (key === "escape" || key === "p") {
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
  }
});

window.addEventListener("keyup", event => {
  const key = event.key.toLowerCase();
  if (key === "arrowleft" || key === "a") keys.left = false;
  if (key === "arrowright" || key === "d") keys.right = false;
});

window.addEventListener("blur", () => {
  keys.left = false;
  keys.right = false;
});

// -----------------------------------------
// Mobile controls: press and hold
// -----------------------------------------

function bindHoldButton(id, direction) {
  const button = $(id);

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    keys[direction] = true;
    if (button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }
  });

  const release = event => {
    event.preventDefault();
    keys[direction] = false;
  };

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => {
    keys[direction] = false;
  });
}

bindHoldButton("leftBtn", "left");
bindHoldButton("rightBtn", "right");

// -----------------------------------------
// Buttons and settings
// -----------------------------------------

$("startBtn").addEventListener("click", startGame);
$("restartBtn").addEventListener("click", startGame);
$("settingsBtn").addEventListener("click", openSettings);
$("pauseSettingsBtn").addEventListener("click", openSettings);

$("howBtn").addEventListener("click", () => {
  previousScreen = "menu";
  showScreen("how");
});

$("developerBtn").addEventListener("click", () => {
  previousScreen = "menu";
  showScreen("developer");
});

document.querySelectorAll(".back-btn").forEach(button => {
  button.addEventListener("click", returnFromSettings);
});

$("pauseBtn").addEventListener("click", pauseGame);
$("touchPauseBtn").addEventListener("click", () => {
  if (state === "playing") pauseGame();
  else if (state === "paused") resumeGame();
});

$("resumeBtn").addEventListener("click", resumeGame);
$("pauseMenuBtn").addEventListener("click", goToMenu);
$("endMenuBtn").addEventListener("click", goToMenu);
$("gameMenuBtn").addEventListener("click", goToMenu);

$("musicToggle").addEventListener("change", event => {
  settings.music = event.target.checked;
  if (settings.music && state === "playing") startMusic();
  else stopMusic();
});

$("soundToggle").addEventListener("change", event => {
  settings.sound = event.target.checked;
});

$("difficulty").addEventListener("change", event => {
  settings.difficulty = event.target.value;
});

$("pixelToggle").addEventListener("change", event => {
  settings.sparkle = event.target.checked;
});

// Draw a welcoming background immediately, before the first game.
drawBackground(0);
drawChick(220, 430, 0);
drawEgg(100, 300);
drawEgg(350, 240);
