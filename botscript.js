// ===================== CONFIG FIREBASE ===========================
const firebaseConfig = {
  apiKey: "AIzaSyB-35zQDrQbz8ohZUdqpFkayYdAUDrLw6g",
  authDomain: "history-dashboard-a70ee.firebaseapp.com",
  databaseURL: "https://history-dashboard-a70ee-default-rtdb.firebaseio.com",
  projectId: "history-dashboard-a70ee",
  storageBucket: "history-dashboard-a70ee.firebasestorage.app",
  messagingSenderId: "969153856969",
  appId: "1:969153856969:web:6b50fae1db463b8352d418",
  measurementId: "G-9MVGBX2KLX"
};

// ===================== UI Helpers ================================
const $ = s => document.querySelector(s);
const liveStatus = $("#liveStatus");
const engineStatus = $("#engineStatus");
const predStatus = $("#predStatus");
const blueRunPill = $("#blueRun");
const streakEl = $("#streak");
const winsEl = $("#wins");
const lossesEl = $("#losses");
const chanceCard = $("#chanceCard");
const chanceTitle = $("#chanceTitle");
const chanceSub = $("#chanceSub");
const strategyTag = $("#strategyTag");
const gateTag = $("#gateTag");
const martingaleTag = $("#martingaleTag");
const feed = $("#feed");
const historyGrid = $("#history");
const topslide = $("#topslide");
const clearStatsBtn = $("#clearStatsBtn");

const winsSidebar = $("#winsSidebar"), streakSidebar = $("#streakSidebar");
const normalWinsEl = $("#normalWins"), g1WinsEl = $("#g1Wins"), g2WinsEl = $("#g2Wins"), maxStreakEl = $("#maxStreak");

$("#winsMoreBtn").onclick = () => winsSidebar.classList.add("open");
$("#streakMoreBtn").onclick = () => streakSidebar.classList.add("open");
$("#closeWins").onclick = () => winsSidebar.classList.remove("open");
$("#closeStreak").onclick = () => streakSidebar.classList.remove("open");

document.addEventListener("click", e => {
  if (!winsSidebar.contains(e.target) && !$("#winsMoreBtn").contains(e.target)) winsSidebar.classList.remove("open");
  if (!streakSidebar.contains(e.target) && !$("#streakMoreBtn").contains(e.target)) streakSidebar.classList.remove("open");
});

function flashCard() {
  chanceCard.classList.add("chance-animate");
  setTimeout(() => chanceCard.classList.remove("chance-animate"), 260);
}

function setCardState({ active = false, awaiting = false, title = "Chance de 2x", sub = "identificando padrão" }) {
  chanceTitle.textContent = title;
  chanceSub.textContent = sub;
  chanceCard.classList.remove("chance-active", "chance-awaiting", "chance-blocked");
  if (active) { chanceCard.classList.add("chance-active"); flashCard(); }
  else if (awaiting) chanceCard.classList.add("chance-awaiting");
}

function topSlide(msg, ok = true) {
  topslide.textContent = msg;
  topslide.className = "topslide " + (ok ? "ok" : "err");
  topslide.classList.add("show");
  setTimeout(() => topslide.classList.remove("show"), 1000);
}

function addFeed(type, text) {
  const div = document.createElement("div"); div.className = "item";
  const left = document.createElement("div"); left.textContent = text;
  const right = document.createElement("div"); right.className = "chip " + (type === "ok" ? "ok" : type === "err" ? "err" : "warn");
  right.textContent = type === "ok" ? "WIN" : type === "err" ? "LOSS" : "INFO";
  div.appendChild(left); div.appendChild(right); feed.prepend(div);
}

function renderHistory(list) {
  historyGrid.innerHTML = "";
  const last15 = list.slice(-15).reverse();
  last15.forEach(r => {
    const box = document.createElement("div");
    box.className = "hbox " + r.color;
    const top = document.createElement("div"); top.className = "row"; top.style.justifyContent = "space-between";
    const val = document.createElement("div"); val.className = "val"; val.textContent = r.mult.toFixed(2) + "x";
    const dot = document.createElement("div"); dot.className = r.color === "blue" ? "dot-blue" : (r.color === "purple" ? "dot-purple" : "dot-pink");
    const c = document.createElement("div"); c.className = "c"; c.textContent = r.color;
    top.appendChild(val); top.appendChild(dot); box.appendChild(top); box.appendChild(c);
    historyGrid.appendChild(box);
  });
}

// ===================== Persistência ======================
const store = {
  get() { try { return JSON.parse(localStorage.getItem("stats2x") || "{}"); } catch { return {}; } },
  set(d) { localStorage.setItem("stats2x", JSON.stringify(d)); }
};
let stats = Object.assign({ wins: 0, losses: 0, streak: 0, maxStreak: 0, normalWins: 0, g1Wins: 0, g2Wins: 0 }, store.get());
function syncStatsUI() {
  winsEl.textContent = stats.wins; lossesEl.textContent = stats.losses; streakEl.textContent = stats.streak;
  maxStreakEl.textContent = stats.maxStreak; normalWinsEl.textContent = stats.normalWins;
  g1WinsEl.textContent = stats.g1Wins; g2WinsEl.textContent = stats.g2Wins;
}
syncStatsUI();

clearStatsBtn.onclick = () => {
  if (confirm("Tem certeza que deseja limpar todas as estatísticas salvas? Esta ação é irreversível.")) {
    stats = { wins: 0, losses: 0, streak: 0, maxStreak: 0, normalWins: 0, g1Wins: 0, g2Wins: 0 };
    store.set(stats); syncStatsUI(); topSlide("Estatísticas limpas!", true);
  }
};

// ===================== Utils =======================
function colorFrom(mult) { return mult < 2.0 ? "blue" : mult < 10.0 ? "purple" : "pink"; }

function positivesRatio(list) {
  const pos = list.filter(c => c.color === "purple" || c.color === "pink").length;
  return list.length ? pos / list.length : 0;
}

function predominancePositive(list, N = 8) {
  const lastN = list.slice(-N);
  const pct = positivesRatio(lastN);
  return { pct, ok: pct >= 0.50, strong: pct >= 0.60 };
}

function consecutiveBlueCount(list) {
  let c = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].color === "blue") c++;
    else break;
  }
  return c;
}

function countBBBSequences(colors, N = 8) {
  const window = colors.slice(-N);
  let cnt = 0, run = 0;
  for (let i = 0; i < window.length; i++) {
    if (window[i] === "blue") { run++; if (run === 3) cnt++; }
    else run = 0;
  }
  return cnt;
}

function lastPink(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].color === "pink") return arr[i];
  }
  return null;
}

function macroWindow40m(arr, nowTs) {
  const from = nowTs - (40 * 60 * 1000);
  return arr.filter(r => typeof r.ts === "number" && r.ts >= from && r.ts <= nowTs);
}

function hasSurfWithin(arr) {
  let run = 0;
  for (const r of arr) {
    if (r.color !== "blue") { run++; if (run >= 3) return true; }
    else run = 0;
  }
  return false;
}

function pinkInEdgeColumn(arr, cols = 5) {
  const lp = lastPink(arr);
  if (!lp || lp.idx === undefined) return false;
  const col = lp.idx % cols;
  return col === 0 || col === (cols - 1);
}

function macroConfirm(arr40, nowTs, fullArr) {
  return inPinkTimeWindow(nowTs, arr40) ||
         roseResetBooster(arr40) ||
         hasSurfWithin(arr40) ||
         pinkInEdgeColumn(fullArr, 5);
}

function inPinkTimeWindow(nowTs, arr) {
  const lp = lastPink(arr);
  if (!lp || !lp.ts) return false;
  const diff = Math.abs((nowTs - lp.ts) / 60000);
  return [5, 7, 10, 20].some(w => Math.abs(diff - w) <= 2);
}

function roseResetBooster(arr) {
  const last = arr[arr.length - 1];
  const prev = arr[arr.length - 2];
  if (last?.color === "pink" || prev?.color === "pink") return true;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].color !== "blue") return arr[i].mult >= 5;
  }
  return false;
}

function check5LineBlock(arr, cols = 5) {
  const L = arr.length;
  if (L === 0) return false;
  const currentIdx = L - 1;
  const start = currentIdx - (currentIdx % cols);
  const line = arr.slice(start, start + cols);
  let blue = 0, pos = 0;
  for (const c of line) {
    if (c.color === "blue") blue++;
    else pos++;
  }
  if (blue > pos) {
    window.lastBlockReason = "Predominância de Azul na linha";
    return true;
  }
  return false;
}

// ===================== Estratégias =======================
function detectStrategies(colors, predPct) {
  const L = colors.length; if (L < 3) return null;
  const isPos = c => c === "purple" || c === "pink";
  const a = colors[L - 3], b = colors[L - 2], c = colors[L - 1];

  if (L >= 3 && isPos(a) && isPos(b) && isPos(c)) {
    let run = 0;
    for (let i = L - 1; i >= 0; i--) { if (isPos(colors[i])) run++; else break; }
    if (run >= 4) return { name: "surfing-4+", gate: `Sequência de ${run} positivas` };
    if (run === 3) return { name: "sequência 3", gate: "3 positivas seguidas" };
  }

  if (predPct >= 0.60 && c === "blue") {
    return { name: "predominancia-forte", gate: `Pred ${(predPct * 100).toFixed(0)}% + Azul` };
  }

  if (a === "blue" && b === "purple" && c === "blue") return { name: "xadrez", gate: "B-P-B" };
  if (b === "pink" && c === "blue") return { name: "pós-rosa", gate: "Rosa → Azul" };
  if (L >= 4 && colors.slice(-4).join("") === "bluebluebluepurple") return { name: "triplacor", gate: "BBB-P" };
  if (a === "blue" && b === "blue" && c === "purple") return { name: "triplacor parcial", gate: "BB-P" };

  return null;
}

function ngramPositiveProb(colors, order, windowSize = 120) {
  if (colors.length <= order) return null;
  const POS = new Set(["purple", "pink"]);
  const window = colors.slice(-windowSize);
  const counts = new Map();
  for (let i = order; i < window.length; i++) {
    const ctx = window.slice(i - order, i).join("|");
    const next = window[i];
    const obj = counts.get(ctx) || { total: 0, pos: 0 };
    obj.total++; if (POS.has(next)) obj.pos++;
    counts.set(ctx, obj);
  }
  const ctxNow = colors.slice(-order).join("|");
  const stat = counts.get(ctxNow);
  if (!stat || stat.total < 1) return null;
  return { p: stat.pos / stat.total, n: stat.total };
}

function detectRepetitionStrategy(colors) {
  for (const k of [4, 3, 2]) {
    const res = ngramPositiveProb(colors, k, 17);
    if (res && res.n >= 1 && res.p >= 0.75) {
      return { name: `rep k=${k}`, gate: `Rep W17: ${(res.p * 100).toFixed(0)}%` };
    }
  }
  for (const k of [3, 2]) {
    const res = ngramPositiveProb(colors, k, 8);
    if (res && res.n >= 1 && res.p >= 1.0) {
      return { name: `rep micro k=${k}`, gate: `Rep W8: 100%` };
    }
  }
  return null;
}

function modelSuggest(colors) {
  for (const k of [4, 3, 2]) {
    const res = ngramPositiveProb(colors, k, 120);
    if (res && res.n >= 3 && res.p >= 0.45) {
      return { name: `IA k=${k}`, gate: `IA: ${(res.p * 100).toFixed(0)}% (n=${res.n})` };
    }
  }
  return null;
}

// ===================== FUNÇÃO CENTRAL DE ENTRADA =======================
function canEnterSignal(arr, nowTs) {
  const arr40 = macroWindow40m(arr, nowTs);
  const colors = arr.map(r => r.color);
  const pred8 = predominancePositive(arr, 8);
  const bbbCount = countBBBSequences(colors, 8);
  const lineBlock = check5LineBlock(arr);

  if (lineBlock || bbbCount >= 2 || !pred8.ok) return null;
  if (bbbCount === 1 && !pred8.strong) return null;

  const macroOk = macroConfirm(arr40, nowTs, arr);
  const strategy = detectStrategies(colors, pred8.pct) ||
                   detectRepetitionStrategy(colors) ||
                   modelSuggest(colors);

  if (strategy || (macroOk && pred8.ok)) {
    return {
      name: strategy ? strategy.name : "macro",
      gate: strategy ? strategy.gate : "tempo/rosa/surf",
      fast: pred8.strong && !!strategy
    };
  }
  return null;
}

// ===================== Motor =======================
let pending = null;

function clearPending() {
  pending = null;
  martingaleTag.style.display = "none";
  setCardState({ active: false, awaiting: false, title: "Chance de 2x", sub: "identificando padrão" });
  strategyTag.textContent = "Estratégia: —";
  gateTag.textContent = "Gatilho: —";
}

function onNewCandle(arr) {
  if (arr.length < 2) return;
  renderHistory(arr);

  const nowTs = arr[arr.length - 1]?.ts || Date.now();
  const last = arr[arr.length - 1];
  const lastMultTxt = last.mult.toFixed(2) + "x";
  const colors = arr.map(r => r.color);
  const pred8 = predominancePositive(arr, 8);
  const blueRun = consecutiveBlueCount(arr);
  const bbbCount = countBBBSequences(colors, 8);

  predStatus.textContent = `Pred: ${(pred8.pct * 100).toFixed(0)}%` + (pred8.strong ? " · forte" : "");
  blueRunPill.textContent = `Azuis: ${blueRun}`;

  // BLOQUEIOS
  const hardBlock = check5LineBlock(arr) || bbbCount >= 2 || !pred8.ok || blueRun >= 3;
  engineStatus.textContent = hardBlock ? "pausado" : "ativo";

  if (hardBlock) {
    setCardState({ awaiting: true, title: "Aguardando...", sub: window.lastBlockReason || "estabilização" });
    if (pending && pending.stage >= 0) clearPending();
    return;
  }

  // FECHOU VELA DO SINAL?
  if (pending && pending.enterAtIdx === last.idx) {
    const win = last.mult >= 2.0;

    if (win) {
      stats.wins++;
      stats.streak++;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      if (pending.stage === 0) stats.normalWins++;
      else if (pending.stage === 1) stats.g1Wins++;
      else if (pending.stage === 2) stats.g2Wins++;
      syncStatsUI(); store.set(stats);

      addFeed("ok", `WIN 2x (G${pending.stage})`);
      topSlide("WIN 2x", true);
      clearPending();
      return;
    } else {
      // LOSS → PRÓXIMO GALE
      const nextSignal = canEnterSignal(arr, nowTs);
      const nextG = pending.stage + 1;

      if (nextG <= 2 && nextSignal) {
        pending.stage = nextG;
        pending.enterAtIdx = last.idx + 1;
        martingaleTag.style.display = "inline-block";

        setCardState({
          active: true,
          title: `Chance de 2x G${nextG}`,
          sub: `Gatilho: ${nextSignal.name}`
        });
        strategyTag.textContent = "Estratégia: " + nextSignal.name;
        gateTag.textContent = "Gatilho: " + nextSignal.gate;

        addFeed("warn", `LOSS → G${nextG} ATIVADO (${nextSignal.name})`);
        topSlide(`Analisando G${nextG}...`, true);
      } else {
        stats.losses++; stats.streak = 0;
        syncStatsUI(); store.set(stats);
        addFeed("err", `LOSS FINAL (G${pending.stage})`);
        topSlide("LOSS 2x", false);
        clearPending();
      }
    }
    return;
  }

  // ENTRADA NORMAL (G0)
  if (!pending) {
    const signal = canEnterSignal(arr, nowTs);
    if (signal) {
      pending = { stage: 0, enterAtIdx: last.idx + 1, name: signal.name };
      setCardState({ active: true, title: "Chance de 2x", sub: `entrar após (${lastMultTxt})` });
      strategyTag.textContent = "Estratégia: " + signal.name + (signal.fast ? " · FAST" : "");
      gateTag.textContent = "Gatilho: " + signal.gate;
      addFeed("warn", `SINAL 2x (${signal.name}) — entrar após (${lastMultTxt})`);
    } else {
      setCardState({ active: false, awaiting: false, title: "Chance de 2x", sub: "identificando padrão" });
      strategyTag.textContent = "Estratégia: —"; gateTag.textContent = "Gatilho: —";
    }
  }
}

// ===================== Firebase =======================
function toArrayFromHistory(raw) {
  const rows = [];
  const vals = Object.values(raw || {});
  for (let i = 0; i < vals.length; i++) {
    const it = vals[i];
    const mult = parseFloat(it?.multiplier);
    if (!Number.isFinite(mult)) continue;
    const color = ["blue", "purple", "pink"].includes(it?.color) ? it.color : colorFrom(mult);
    let ts = null;
    if (it?.date && it?.time) {
      const d = new Date(`${it.date}T${it.time}`);
      if (!isNaN(d)) ts = d.getTime();
    }
    rows.push({ idx: i, mult, color, ts });
  }
  return rows;
}

(function init() {
  try {
    const app = firebase.initializeApp(firebaseConfig);
    liveStatus.textContent = "Conectado";
    liveStatus.style.background = "rgba(34,197,94,.15)";
    liveStatus.style.color = "#b9f5c7";
    liveStatus.style.borderColor = "rgba(34,197,94,.35)";

    const dbRef = app.database().ref("history/");
    dbRef.on('value', (snapshot) => {
      const data = snapshot.val();
      const arr = toArrayFromHistory(data);
      if (arr.length > 0) {
        engineStatus.textContent = "operando";
        onNewCandle(arr);
      } else {
        engineStatus.textContent = "aguardando dados...";
      }
    }, (error) => {
      liveStatus.textContent = "Erro: " + error.message;
      liveStatus.style.background = "rgba(239,68,68,.15)";
      liveStatus.style.color = "#ffd1d1";
      console.error("Firebase error:", error);
    });
  } catch (e) {
    liveStatus.textContent = "Falha ao iniciar Firebase";
    liveStatus.style.background = "rgba(239,68,68,.1E)";
    liveStatus.style.color = "#ffd1d1";
    console.error("Init error:", e);
  }
})();

// ===================== BLOQUEIO DO DEVTOOLS (RESTAURADO E MELHORADO) =======================
(function() {
  const threshold = 160;
  let devtoolsOpen = false;

  const checkDevTools = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width < threshold || height < threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        window.location.replace("https://www.google.com");
      }
    } else {
      devtoolsOpen = false;
    }
  };

  window.addEventListener('resize', checkDevTools);
  checkDevTools();

  document.addEventListener('keydown', function (e) {
    if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) e.preventDefault();
    if (e.ctrlKey && e.key === 'U') e.preventDefault();
  });

  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });

  // Anti-debugger
  (function() {
    setInterval(() => {
      console.clear();
      debugger;
    }, 100);
  })();
})();
