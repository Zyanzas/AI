const sequences = [
  { level: 9, name: "Initiate", xp: 0, req: ["walking", "stretching"] },
  { level: 8, name: "Warrior", xp: 250, req: ["pushups", "jogging"] },
  { level: 7, name: "Hunter", xp: 600, req: ["endurance"] },
  { level: 6, name: "Challenger", xp: 1000, req: ["strength", "agility"] },
  { level: 5, name: "Warden", xp: 1500, req: ["endurance", "strength"] },
  { level: 4, name: "Oracle Blade", xp: 2200, req: ["jogging", "agility"] },
  { level: 3, name: "Twilight Knight", xp: 3000, req: ["strength", "endurance"] },
  { level: 2, name: "Arcane Sovereign", xp: 4000, req: ["agility", "pushups"] },
  { level: 1, name: "Saint of Iron", xp: 5200, req: ["endurance", "strength", "jogging"] },
  { level: 0, name: "Apex Myth", xp: 7000, req: ["all"] }
];

const titles = [
  "Initiate of Veils",
  "Demonbane Strider",
  "Rune-Blooded Vanguard",
  "Keeper of Midnight Flame",
  "Abyssal Ascendant"
];

const state = loadState() || {
  avatarName: "",
  avatarPath: "Warrior Path",
  xp: 0,
  workouts: [],
  completedQuestIds: [],
  stats: { Strength: 1, Endurance: 1, Agility: 1, Vitality: 1 },
  steps: 0,
  inventory: ["Rust Sigil"],
  achievements: [],
  streak: 0,
  lastLogin: "",
};

const quests = [
  { id: "q-run", name: "Defeat the Sloth Demon", goal: "Run 2 km", type: "distance", target: 2, reward: 120 },
  { id: "q-push", name: "Trial of Strength", goal: "30 push-ups", type: "pushups", target: 30, reward: 100 },
  { id: "q-steps", name: "Path of Footfalls", goal: "5,000 steps", type: "steps", target: 5000, reward: 90 },
  { id: "q-end", name: "Abyss Endurance Drill", goal: "40 endurance minutes", type: "endurance", target: 40, reward: 140 }
];

const artifacts = [
  "Moonlit Chain",
  "Potion of Ember Lungs",
  "Sigil of Silent Steps",
  "Phantom Gauntlet",
  "Abyss Lantern"
];

const els = {
  playerTitle: document.getElementById("playerTitle"),
  playerSequence: document.getElementById("playerSequence"),
  playerXP: document.getElementById("playerXP"),
  xpBar: document.getElementById("xpBar"),
  avatarName: document.getElementById("avatarName"),
  avatarPath: document.getElementById("avatarPath"),
  avatarSummary: document.getElementById("avatarSummary"),
  saveAvatar: document.getElementById("saveAvatar"),
  workoutType: document.getElementById("workoutType"),
  workoutAmount: document.getElementById("workoutAmount"),
  workoutDistance: document.getElementById("workoutDistance"),
  logWorkout: document.getElementById("logWorkout"),
  workoutFeed: document.getElementById("workoutFeed"),
  dailyQuests: document.getElementById("dailyQuests"),
  bossChallenge: document.getElementById("bossChallenge"),
  statsGrid: document.getElementById("statsGrid"),
  stepsInput: document.getElementById("stepsInput"),
  addSteps: document.getElementById("addSteps"),
  stepsSummary: document.getElementById("stepsSummary"),
  inventory: document.getElementById("inventory"),
  achievements: document.getElementById("achievements"),
  leaderboard: document.getElementById("leaderboard"),
  sequenceTree: document.getElementById("sequenceTree"),
  loginReward: document.getElementById("loginReward"),
  streak: document.getElementById("streak"),
  levelUpOverlay: document.getElementById("levelUpOverlay"),
  levelText: document.getElementById("levelText"),
  installBtn: document.getElementById("installBtn"),
  installStatus: document.getElementById("installStatus")
};

function loadState() {
  try {
    return JSON.parse(localStorage.getItem("seekerAscension"));
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem("seekerAscension", JSON.stringify(state));
}

function currentSequence() {
  return [...sequences].reverse().find((s) => state.xp >= s.xp) || sequences[0];
}

function nextSequence(seq) {
  return sequences.find((s) => s.level === seq.level - 1);
}

function calcXpGain(type, amount, distance) {
  const base = Math.max(10, amount * 2);
  const typeBonus = {
    walking: 0.9,
    stretching: 0.8,
    pushups: 1.3,
    jogging: 1.2,
    endurance: 1.4,
    strength: 1.5,
    agility: 1.4
  }[type] || 1;
  return Math.floor(base * typeBonus + distance * 35);
}

function awardRandomArtifact() {
  if (Math.random() < 0.25) {
    const item = artifacts[Math.floor(Math.random() * artifacts.length)];
    state.inventory.push(item);
    state.achievements.push(`Rare drop obtained: ${item}`);
  }
}

function updateStats(type, amount) {
  const boost = Math.max(1, Math.floor(amount / 20));
  if (["pushups", "strength"].includes(type)) state.stats.Strength += boost;
  if (["jogging", "endurance"].includes(type)) state.stats.Endurance += boost;
  if (["agility", "jogging"].includes(type)) state.stats.Agility += boost;
  state.stats.Vitality += Math.max(1, Math.floor(boost / 2));
}

function render() {
  const seq = currentSequence();
  const next = nextSequence(seq);
  const titleIndex = Math.min(titles.length - 1, Math.floor((9 - seq.level) / 2));
  els.playerTitle.textContent = titles[titleIndex];
  els.playerSequence.textContent = `${seq.level} — ${seq.name}`;
  els.playerXP.textContent = state.xp;

  const span = next ? next.xp - seq.xp : 1;
  const within = next ? state.xp - seq.xp : span;
  const pct = Math.min(100, Math.round((within / span) * 100));
  els.xpBar.style.width = `${pct}%`;

  els.avatarSummary.textContent = state.avatarName
    ? `${state.avatarName}, ${state.avatarPath}, currently bears the title "${titles[titleIndex]}".`
    : "Forge your identity to begin ascension.";

  els.workoutFeed.innerHTML = "";
  state.workouts.slice(-8).reverse().forEach((w) => {
    const li = document.createElement("li");
    li.textContent = `${w.type} · ${w.amount} units · ${w.distance} km · +${w.xp} XP`;
    els.workoutFeed.appendChild(li);
  });

  renderQuests();
  renderBossChallenge();

  els.statsGrid.innerHTML = "";
  Object.entries(state.stats).forEach(([k, v]) => {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `<strong>${k}</strong><div>${v}</div>`;
    els.statsGrid.appendChild(card);
  });

  els.stepsSummary.textContent = `Total empowered steps: ${state.steps}`;

  els.inventory.innerHTML = "";
  state.inventory.slice(-7).reverse().forEach((i) => {
    const li = document.createElement("li");
    li.textContent = i;
    els.inventory.appendChild(li);
  });

  els.achievements.innerHTML = "";
  const ach = state.achievements.length ? state.achievements : ["No feats yet. Complete quests to etch glory."];
  ach.slice(-7).reverse().forEach((a) => {
    const li = document.createElement("li");
    li.textContent = a;
    els.achievements.appendChild(li);
  });

  renderLeaderboard(seq);
  renderTree(seq);
  renderLoginReward();
  saveState();
}

function renderQuests() {
  els.dailyQuests.innerHTML = "";
  quests.forEach((q) => {
    const complete = state.completedQuestIds.includes(q.id);
    const li = document.createElement("li");
    li.textContent = `${complete ? "✓" : "◻"} ${q.name} — ${q.goal} (${q.reward} XP)`;
    els.dailyQuests.appendChild(li);
  });
}

function renderBossChallenge() {
  const bossTarget = 5;
  const runs = state.workouts.filter((w) => w.type === "jogging" && w.distance >= 1).length;
  const done = Math.min(runs, bossTarget);
  if (done >= bossTarget && !state.achievements.includes("Boss conquered: Gloom Colossus")) {
    state.xp += 300;
    state.achievements.push("Boss conquered: Gloom Colossus");
    state.inventory.push("Heart of the Colossus");
  }
  els.bossChallenge.textContent = `Gloom Colossus: Complete ${bossTarget} runs of 1km+ this week (${done}/${bossTarget}). Reward: 300 XP + Legendary Artifact.`;
}

function renderLeaderboard(seq) {
  els.leaderboard.innerHTML = "";
  const power = state.xp + Object.values(state.stats).reduce((a, b) => a + b, 0);
  const board = [
    { name: state.avatarName || "You", score: power },
    { name: "Nyx Harbinger", score: 7700 },
    { name: "Iron Apostle", score: 6200 },
    { name: "Cinder Saint", score: 5000 },
    { name: "Veil Ranger", score: 3900 }
  ].sort((a, b) => b.score - a.score);

  board.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = `#${i + 1} ${p.name} — ${p.score} power`;
    if (p.name === (state.avatarName || "You")) li.style.color = "#64ff94";
    els.leaderboard.appendChild(li);
  });
}

function renderTree(seq) {
  els.sequenceTree.innerHTML = "";
  sequences.forEach((s) => {
    const li = document.createElement("li");
    const unlocked = state.xp >= s.xp;
    li.textContent = `${unlocked ? "🔓" : "🔒"} Sequence ${s.level}: ${s.name} (${s.xp} XP)`;
    if (s.level === seq.level) li.style.color = "#23d5ff";
    els.sequenceTree.appendChild(li);
  });
}

function renderLoginReward() {
  const today = new Date().toISOString().slice(0, 10);
  const last = state.lastLogin;
  if (last !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streak = last === yesterday ? state.streak + 1 : 1;
    const reward = 25 + state.streak * 5;
    state.xp += reward;
    state.lastLogin = today;
    state.inventory.push(`Daily potion +${reward} XP`);
    els.loginReward.textContent = `Daily login reward claimed: +${reward} XP`;
  } else {
    els.loginReward.textContent = "Daily reward already claimed. Return at dawn.";
  }
  els.streak.textContent = `Current streak: ${state.streak} day(s)`;
}

function completeQuestFromWorkout(type, amount, distance) {
  quests.forEach((q) => {
    if (state.completedQuestIds.includes(q.id)) return;
    let done = false;
    if (q.type === "distance") done = distance >= q.target;
    if (q.type === type) done = amount >= q.target;
    if (q.type === "steps") done = state.steps >= q.target;

    if (done) {
      state.completedQuestIds.push(q.id);
      state.xp += q.reward;
      state.achievements.push(`Quest complete: ${q.name}`);
      awardRandomArtifact();
    }
  });
}

function maybeLevelUp(beforeLevel) {
  const now = currentSequence();
  if (now.level < beforeLevel.level) {
    els.levelText.textContent = `You reached Sequence ${now.level}: ${now.name}. New powers surge through your body.`;
    els.levelUpOverlay.classList.remove("hidden");
    setTimeout(() => els.levelUpOverlay.classList.add("hidden"), 1600);
  }
}

els.saveAvatar.addEventListener("click", () => {
  state.avatarName = els.avatarName.value.trim() || state.avatarName || "Nameless Seeker";
  state.avatarPath = els.avatarPath.value;
  state.achievements.push("Identity sealed in the Codex of Shadows");
  render();
});

els.logWorkout.addEventListener("click", () => {
  const type = els.workoutType.value;
  const amount = Number(els.workoutAmount.value) || 0;
  const distance = Number(els.workoutDistance.value) || 0;
  if (amount <= 0) return;
  const before = currentSequence();
  const xp = calcXpGain(type, amount, distance);
  state.xp += xp;
  state.workouts.push({ type, amount, distance, xp });
  updateStats(type, amount);
  completeQuestFromWorkout(type, amount, distance);
  awardRandomArtifact();
  maybeLevelUp(before);
  render();
});

els.addSteps.addEventListener("click", () => {
  const stepAdd = Number(els.stepsInput.value) || 0;
  if (stepAdd <= 0) return;
  state.steps += stepAdd;
  state.xp += Math.floor(stepAdd / 60);
  completeQuestFromWorkout("steps", stepAdd, 0);
  render();
});


let deferredInstallPrompt = null;

function setupInstallFlow() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      if (els.installStatus) {
        els.installStatus.textContent = "Offline mode unavailable in this browser session.";
      }
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (els.installBtn) {
      els.installBtn.classList.remove("hidden");
      els.installStatus.textContent = "Install is ready. Tap the button to download to home screen.";
    }
  });

  if (els.installBtn) {
    els.installBtn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      els.installBtn.classList.add("hidden");
      els.installStatus.textContent = "Install prompt completed. Check your home screen.";
    });
  }

  window.addEventListener("appinstalled", () => {
    if (els.installStatus) {
      els.installStatus.textContent = "Seeker Ascension installed successfully.";
    }
    if (els.installBtn) {
      els.installBtn.classList.add("hidden");
    }
  });
}

setupInstallFlow();

render();
