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

function flashCard(){
  chanceCard.classList.add("chance-animate");
  setTimeout(()=> chanceCard.classList.remove("chance-animate"), 260);
}
function setCardState({active=false, awaiting=false, title="Chance de 2x", sub="identificando padrão"}){
  chanceTitle.textContent = title;
  chanceSub.textContent = sub;
  chanceCard.classList.remove("chance-active","chance-awaiting", "chance-blocked");
  if(active) { chanceCard.classList.add("chance-active"); flashCard(); }
  else if(awaiting) chanceCard.classList.add("chance-awaiting");
  else if(title === "SINAL BLOQUEADO") chanceCard.classList.add("chance-blocked");
}
function topSlide(msg, ok=true){
  topslide.textContent = msg;
  topslide.className = "topslide " + (ok?"ok":"err");
  topslide.classList.add("show");
  setTimeout(()=> topslide.classList.remove("show"), 1000);
}
function addFeed(type,text){
  const div = document.createElement("div"); div.className="item";
  const left=document.createElement("div"); left.textContent=text;
  const right=document.createElement("div"); right.className="chip "+(type==="ok"?"ok":type==="err"?"err":"warn");
  right.textContent= type==="ok"?"WIN": type==="err"?"LOSS":"INFO";
  div.appendChild(left); div.appendChild(right); feed.prepend(div);
}

function renderHistory(list){
  const historyGrid = document.getElementById("history");
  historyGrid.innerHTML="";
  const last15 = list.slice(-15).reverse();
  last15.forEach(r=>{
    const box=document.createElement("div"); 
    box.className="hbox "+r.color;
    const top=document.createElement("div"); top.className="row"; top.style.justifyContent="space-between";
    const val=document.createElement("div"); val.className="val"; val.textContent=r.mult.toFixed(2)+"x";
    const dot=document.createElement("div"); dot.className= r.color==="blue"?"dot-blue":(r.color==="purple"?"dot-purple":"dot-pink");
    const c=document.createElement("div"); c.className="c"; c.textContent=r.color;
    top.appendChild(val); top.appendChild(dot); box.appendChild(top); box.appendChild(c);
    historyGrid.appendChild(box);
  });
}

// ===================== Persistência ======================
const store = {
  get(){ try{ return JSON.parse(localStorage.getItem("stats2x")||"{}"); }catch{return {}} },
  set(d){ localStorage.setItem("stats2x", JSON.stringify(d)); }
};
let stats = Object.assign({wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}, store.get());
function syncStatsUI(){
  winsEl.textContent=stats.wins; lossesEl.textContent=stats.losses; streakEl.textContent=stats.streak;
  maxStreakEl.textContent=stats.maxStreak; normalWinsEl.textContent=stats.normalWins;
  g1WinsEl.textContent=stats.g1Wins; g2WinsEl.textContent=stats.g2Wins;
}
syncStatsUI();

clearStatsBtn.onclick = () => {
  if(confirm("Tem certeza que deseja limpar todas as estatísticas salvas? Esta ação é irreversível.")){
    stats = {wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0};
    store.set(stats);
    syncStatsUI();
    topSlide("Estatísticas limpas!", true);
  }
};

// ===================== Utils =======================
function colorFrom(mult){ if(mult<2.0) return "blue"; if(mult<10.0) return "purple"; return "pink"; }
const isPos = (c) => c==="purple" || c==="pink";

// ===== Window param =====
const WINDOW_N = 6;

function getLastNColors(arr, n){ return arr.slice(-n).map(r=>r.color); }

function predominancePct(colorsLastN){
  const pos = colorsLastN.filter(c => c==="purple" || c==="pink").length;
  return colorsLastN.length ? pos/colorsLastN.length : 0;
}

function getMaxBlueStreakN(colorsLastN){
  let max = 0, run = 0;
  for(const c of colorsLastN){
    if(c==="blue"){ run++; if(run>max) max=run; }
    else run = 0;
  }
  return max;
}

function lastKBlueStreakRecency(colorsLastN, k=3){
  let run=0;
  for(let i=colorsLastN.length-1;i>=0;i--){
    if(colorsLastN[i]==="blue"){ run++; if(run>=k) return colorsLastN.length-1-i; }
    else run=0;
  }
  return Infinity;
}

function twoPosNow(colors){
  const L = colors.length;
  return L>=2 && (colors[L-1]!=="blue") && (colors[L-2]!=="blue");
}

function finalBlueRunNow(colors){
  let r=0; for(let i=colors.length-1;i>=0 && colors[i]==="blue"; i--) r++; return r;
}

function consecutiveBlueCount(list){
  let c=0; for(let i=list.length-1;i>=0;i--){ if(list[i].color==="blue") c++; else break; } return c;
}

// XADREZ B-P-B → permite G1 mesmo com 2 azuis
function isXadrezBPB(colors){
  const L = colors.length;
  return L >= 3 && colors[L-3] === "blue" && isPos(colors[L-2]) && colors[L-1] === "blue";
}

// ===================== Parâmetros =======================
const SOFT_PCT = 0.50; 
const STRONG_PCT = 0.60; 

// Variáveis de estado
window.lastBlockReason = null;
window.lastPauseMessage = null;
window.seguidinhaOn = false; 
window.correctionHistory = [];
window.prevCorrGate = null;

// ===================== Estratégias =======================
function detectStrategies(colors, predNPct){
  const L=colors.length; if(L<3) return null;
  const a=colors[L-3], b=colors[L-2], c=colors[L-1];
  const isPos = x => x!=="blue";

  if(isPos(a) && isPos(b) && isPos(c)){
    let run=0; for(let i=L-1;i>=0 && isPos(colors[i]); i--) run++;
    if(run>=4) return {name:`surfing-4+`, gate:`${run} positivas ⇒ P (2x)`};
    if(run===3) return {name:`sequência roxas 3`, gate:`3 positivas ⇒ P (2x)`};
  }

  if(isXadrezBPB(colors)) return {name:"xadrez B-P-B", gate:"B-P-B ⇒ P (2x)"};

  // Predominância forte + azul na ponta
  if(predNPct>=0.60 && c==="blue"){
    return {name:"predominancia-forte", gate:`Pred ${(predNPct*100).toFixed(0)}% + Azul ⇒ P (2x)`};
  }

  return null;
}

function ngramPositiveProb(colors, order, windowSize=120){ 
  if(colors.length <= order) return null;
  const POS = new Set(["purple","pink"]);
  const window = colors.slice(-windowSize);
  const counts = new Map();
  for(let i=order;i<window.length;i++){
    const ctx = window.slice(i-order, i).join("|");
    const next = window[i];
    const obj = counts.get(ctx) || {total:0, pos:0};
    obj.total += 1; if(POS.has(next)) obj.pos += 1; counts.set(ctx, obj);
  }
  const ctxNow = colors.slice(-order).join("|");
  const stat = counts.get(ctxNow);
  if(!stat) return null;
  return {p: stat.pos/stat.total, n: stat.total};
}

function detectRepetitionStrategy(colors){ 
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k, 12); 
    if(res && res.n >= 1 && res.p >= 0.70){ 
      return {name:`rep_cores k=${k} (W12)`, gate:`Repetição (12 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  for(const k of [3,2]){
    const res = ngramPositiveProb(colors, k, 8);
    if(res && res.n >= 1 && res.p >= 0.90){ 
      return {name:`rep_cores k=${k} (W8)`, gate:`Repetição (8 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}

function modelSuggest(colors){ 
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k, 120); 
    if(res && res.n>=2 && res.p>=0.40){ 
      return {name:`modelo n-grama k=${k}`, gate:`IA: P(positiva|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}

function getStrategyAndGate(colors, arr40, arr, predNPct, allowMacro = true){
  let suggestion = detectStrategies(colors, predNPct) || 
                   detectRepetitionStrategy(colors) || 
                   modelSuggest(colors); 
  
  const macroOk = false;
  const isStrongStrategy = !!suggestion; 

  if(isStrongStrategy || (allowMacro && macroOk && predNPct >= SOFT_PCT)){
    const usedName = isStrongStrategy ? suggestion.name : "macro";
    const usedGate = isStrongStrategy ? suggestion.gate : "tempo/rosa/surf/coluna (40m)";
    return { name: usedName, gate: usedGate, suggestion, isStrongStrategy };
  }
  return null;
}

// ===================== Motor (CORREÇÃO + SEGUIDINHA PERFEITA) ======================
let pending = null;
let waitingForNewCorrections = 0;
let currentCycleLoss = false;
let lastG0Strategy = null;

// ===== CONTROLE DE BLOQUEIO POR CORREÇÃO =====
let maxBlueStreakHistory = []; // armazena [idx, streak] de cada mudança

function clearPending(){ 
  pending = null; 
  martingaleTag.style.display = "none"; 
  setCardState({active:false, awaiting:false}); 
}

function onNewCandle(arr){
  if(arr.length < WINDOW_N) return;
  renderHistory(arr);

  const colors = arr.map(r=>r.color);
  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";

  const colorsLastN = getLastNColors(arr, WINDOW_N);
  const predN = predominancePct(colorsLastN);
  const corrN = getMaxBlueStreakN(colorsLastN);

  const recTripla = lastKBlueStreakRecency(colorsLastN, 3);
  const twoPos = twoPosNow(colors);
  let corrGate = corrN;
  if(corrN===3 && recTripla>=5 && (twoPos || predN>=0.60) && finalBlueRunNow(colors)<=1) corrGate = 2;

  const analysis = getStrategyAndGate(colors, [], arr, predN, false);
  const strongStrategyActive = !!analysis;

  predStatus.textContent = `Predominância (${WINDOW_N}): ${(predN*100).toFixed(0)}% · Max Streak: ${corrN}`;
  blueRunPill.textContent = `Azuis seguidas: ${consecutiveBlueCount(arr)}` + (window.seguidinhaOn ? " · SEGUIDINHA ON" : "");

  // ===== Rastreia MUDANÇAS de correção (só quando muda de valor) =====
  const prevCorr = window.prevCorrGate;
  if(prevCorr !== undefined && corrGate !== prevCorr && corrGate <= 2){
    maxBlueStreakHistory.push({idx: last.idx, streak: corrGate});
    // Remove entradas antigas (máx 50)
    if(maxBlueStreakHistory.length > 50) maxBlueStreakHistory.shift();
  }
  window.prevCorrGate = corrGate;

  // ===== ATUALIZA BLOQUEIO POR CORREÇÃO =====
  const currentBlueRun = finalBlueRunNow(colors);
  if(currentBlueRun >= 3){
    if(waitingForNewCorrections === 0){
      waitingForNewCorrections = 2;
      setCardState({active:false, awaiting:true, title:"SINAL BLOQUEADO", sub:"3+ correções → aguardando 2 novas"});
      addFeed("warn", "Bloqueio: 3+ correções. Aguardando 2 novas.");
      engineStatus.textContent = "bloqueado (3+ corr)";
    }
  }

  // Desbloqueia com 2 novas sequências de correção ≤2
  if(waitingForNewCorrections > 0){
    const recentChanges = maxBlueStreakHistory.filter(c => c.streak <= 2);
    if(recentChanges.length >= 2){
      waitingForNewCorrections = 0;
      addFeed("info", "Desbloqueado: 2 novas correções ≤2 confirmadas.");
    }
  }

  // ===== SEGUIDINHA: sequência positiva com 0 ou 1 azul (mínimo 4 velas) =====
  const lastNForSeguidinha = colors.slice(-Math.max(4, colors.length));
  const blueCountInSeg = lastNForSeguidinha.filter(c => c === "blue").length;
  const posCountInSeg = lastNForSeguidinha.length - blueCountInSeg;
  const isSeguidinha = lastNForSeguidinha.length >= 4 && blueCountInSeg <= 1 && posCountInSeg >= 3;

  if(isSeguidinha && !window.seguidinhaOn){
    window.seguidinhaOn = true;
    addFeed("info", "Seguidinha ON: sequência positiva com 0-1 azul");
  }
  if(!isSeguidinha && window.seguidinhaOn && lastNForSeguidinha.length >= 6){
    window.seguidinhaOn = false;
    addFeed("info", "Seguidinha OFF: padrão quebrado");
  }

  // ===== Finalização de entrada =====
  if(pending && pending.enterAtIdx === last.idx){
    const win = last.mult >= 2.0;
    
    if(win){
      currentCycleLoss = false;
      stats.wins++; 
      stats.streak++; 
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      
      if(pending.stage===0) stats.normalWins++;
      else if(pending.stage===1) stats.g1Wins++;
      else stats.g2Wins++;

      syncStatsUI(); store.set(stats);
      addFeed("ok", `WIN 2x (G${pending.stage})`);
      topSlide("WIN 2x", true);
      clearPending();
      lastG0Strategy = null;
      return;
    } else {
      // PERDEU
      if(pending.stage === 0){
        addFeed("err", "LOSS 2x (G0)");
        topSlide("LOSS 2x", false);
        currentCycleLoss = true;
        lastG0Strategy = pending.strategy;

        pending.stage = 'G1_WAIT';
        pending.enterAtIdx = null;
        setCardState({active:false, awaiting:true, title:"Aguardando G1", sub:"Procurando novo gatilho..."});
        addFeed("warn", "Aguardando novo gatilho para G1");
        return;
      }

      if(pending.stage === 1){
        addFeed("err", "LOSS 2x (G1)");
        topSlide("LOSS 2x (G1)", false);

        pending.stage = 'G2_WAIT';
        pending.enterAtIdx = null;
        setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"Procurando novo gatilho..."});
        addFeed("warn", "Aguardando novo gatilho para G2");
        return;
      }

      if(pending.stage === 2){
        addFeed("err", "LOSS 2x (G2)");
        topSlide("LOSS 2x (G2)", false);

        if(currentCycleLoss){
          stats.losses++;
          stats.streak = 0;
          syncStatsUI(); store.set(stats);
        }

        clearPending();
        lastG0Strategy = null;
        return;
      }
    }
  }

  // ===== BLOQUEIO: 3+ correções (mas SEGUIDINHA libera) =====
  if(waitingForNewCorrections > 0 && !window.seguidinhaOn){
    setCardState({active:false, awaiting:true, title:"SINAL BLOQUEADO", sub:`Aguardando ${waitingForNewCorrections} nova(s) correção(ões)`});
    return;
  }

  // ===== BLOQUEIO: 2 azuis seguidos (exceto xadrez B-P-B) =====
  const lastTwoBlue = colors.length >= 2 && colors[colors.length-1] === "blue" && colors[colors.length-2] === "blue";
  const isXadrez = isXadrezBPB(colors);

  if(lastTwoBlue && !isXadrez && pending?.stage >= 1){
    setCardState({active:false, awaiting:true, title:"BLOQUEADO", sub:"2 azuis seguidos (não é B-P-B)"});
    addFeed("warn", "G1/G2 bloqueado: 2 azuis seguidos");
    return;
  }

  // ===== ESPERA G1: novo gatilho + estratégia diferente + corrGate <= 1 =====
  if(pending?.stage === 'G1_WAIT'){
    if(corrGate > 1 && !window.seguidinhaOn){
      setCardState({active:false, awaiting:true, title:"Aguardando G1", sub:`Correção alta (${corrGate})`});
      return;
    }
    if(!strongStrategyActive && !window.seguidinhaOn){
      setCardState({active:false, awaiting:true, title:"Aguardando G1", sub:"Sem gatilho forte"});
      return;
    }
    if(analysis && analysis.name === lastG0Strategy){
      setCardState({active:false, awaiting:true, title:"Aguardando G1", sub:"Mesma estratégia do G0"});
      return;
    }

    pending.stage = 1;
    pending.enterAtIdx = last.idx + 1;
    pending.strategy = analysis?.name || "seguidinha";
    pending.afterMult = lastMultTxt;
    martingaleTag.style.display = "inline-block";
    setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${pending.afterMult})`});
    strategyTag.textContent = "Estratégia: " + pending.strategy;
    gateTag.textContent = "Gatilho: " + (analysis?.gate || "seguidinha");
    addFeed("warn", `SINAL 2x (G1) — entrar após (${pending.afterMult})`);
    return;
  }

  // ===== ESPERA G2: novo gatilho + estratégia diferente + corrGate <= 1 =====
  if(pending?.stage === 'G2_WAIT'){
    if(corrGate > 1 && !window.seguidinhaOn){
      setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:`Correção alta (${corrGate})`});
      return;
    }
    if(!strongStrategyActive && !window.seguidinhaOn){
      setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"Sem gatilho forte"});
      return;
    }
    if(analysis && (analysis.name === lastG0Strategy || analysis.name === pending.strategy)){
      setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"Mesma estratégia anterior"});
      return;
    }

    pending.stage = 2;
    pending.enterAtIdx = last.idx + 1;
    pending.strategy = analysis.name;
    pending.afterMult = lastMultTxt;
    martingaleTag.style.display = "inline-block";
    setCardState({active:true, title:"Chance de 2x G2", sub:`entrar após (${pending.afterMult})`});
    strategyTag.textContent = "Estratégia: " + pending.strategy;
    gateTag.textContent = "Gatilho: " + analysis.gate;
    addFeed("warn", `SINAL 2x (G2) — entrar após (${pending.afterMult})`);
    return;
  }

  // ===== Novo Sinal G0 =====
  if(!pending){
    const allowEntry = (corrGate <= 1) || 
                       (corrGate === 2 && (predN >= 0.60 || strongStrategyActive || window.seguidinhaOn)) ||
                       window.seguidinhaOn;

    if(allowEntry){
      pending = { 
        stage:0, 
        enterAtIdx: last.idx + 1, 
        strategy: analysis?.name || (window.seguidinhaOn ? "seguidinha" : "correção"),
        afterMult: lastMultTxt
      };
      currentCycleLoss = true;
      lastG0Strategy = pending.strategy;

      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${pending.afterMult})`});
      strategyTag.textContent = "Estratégia: " + pending.strategy;
      gateTag.textContent = "Gatilho: " + (analysis?.gate || "single correction");
      addFeed("warn",`SINAL 2x (G0) — entrar após (${pending.afterMult})`);
    } else {
      setCardState({active:false, awaiting:false, title:"SINAL BLOQUEADO", sub:"Corr=2 sem critério forte"});
    }
  }

  engineStatus.textContent = window.seguidinhaOn ? "Seguidinha ON" : (waitingForNewCorrections > 0 ? "bloqueado (3+ corr)" : "operando");
}
// ===================== Firebase =======================
function toArrayFromHistory(raw){
  const rows = [];
  const vals = Object.values(raw || {});
  for(let i=0;i<vals.length;i++){
    const it = vals[i];
    const mult = parseFloat(it?.multiplier);
    if(!Number.isFinite(mult)) continue;
    const color = (it?.color==="blue"||it?.color==="purple"||it?.color==="pink") ? it.color : colorFrom(mult);
    let ts=null;
    if(it?.date && it?.time){
      const d = new Date(`${it.date}T${it.time}`);
      if(Number.isFinite(d.getTime())) ts=d.getTime();
    }
    rows.push({ idx:i, mult, color, ts });
  }
  return rows;
}

(function init(){
  try{
    const app = firebase.initializeApp(firebaseConfig);
    liveStatus.textContent = "Conectado";
    liveStatus.style.background="rgba(34,197,94,.15)"; liveStatus.style.color="#b9f5c7"; liveStatus.style.borderColor="rgba(34,197,94,.35)";
    const dbRef = app.database().ref("history/");
    dbRef.on('value',(snapshot)=>{
      const data = snapshot.val();
      const arr = toArrayFromHistory(data);
      if(!arr.length){ engineStatus.textContent="sem dados"; return; }
      onNewCandle(arr);
    },(error)=>{
      liveStatus.textContent = "Erro: "+error.message;
      liveStatus.style.background="rgba(239,68,68,.15)"; liveStatus.style.color="#ffd1d1";
    });
  }catch(e){
    liveStatus.textContent="Falha ao iniciar Firebase";
    liveStatus.style.background="rgba(239,68,68,.1E)"; liveStatus.style.color="#ffd1d1";
    console.error(e);
  }
})();

// ===================== BLOQUEIO DEVTOOLS =======================
(function() {
  const threshold = 160; 
  let devtoolsOpen = false;

  const checkDevTools = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width < threshold || height < threshold) {
      if (!devtoolsOpen) { devtoolsOpen = true; window.location.replace("https://www.google.com"); }
    } else { devtoolsOpen = false; }
  };
  window.addEventListener('resize', checkDevTools);
  checkDevTools();

  document.addEventListener('keydown', function (e) {
    if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) e.preventDefault();
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
})();
