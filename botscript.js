// ===================== CONFIG FIREBASE ===========================
const firebaseConfig = {
  apiKey: "AIzaSyB-35zQDrQbz8ohZUdqpFkayYdAUDrLw6g",
  authDomain: "history-dashboard-a70ee.firebaseapp.com",
  databaseURL: "https://history-dashboard-a70ee-default-rtdb.firebaseio.com",
  projectId: "history-dashboard-a70ee",
  storageBucket: "history-dashboard-a70ee.appspot.com",
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
  const last15 = list.slice(-24).reverse();
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

// ===== JANELAS PERSONALIZADAS =====
const WINDOW_PRED = 6;
const WINDOW_CORR = 7;

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

function isXadrezBPB(colors){
  const L = colors.length;
  return L >= 3 && colors[L-3] === "blue" && isPos(colors[L-2]) && colors[L-1] === "blue";
}

// ===================== Parâmetros =======================
const SOFT_PCT = 0.50; 
const STRONG_PCT = 0.60; 

// Variáveis de estado
window.seguidinhaOn = false; 
window.prevCorrGate = null;
let maxBlueStreakHistory = []; // [idx, streak]
let waitingForNewCorrections = 0;

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
  
  const isStrongStrategy = !!suggestion; 

  if(isStrongStrategy || (allowMacro && predNPct >= SOFT_PCT)){
    const usedName = isStrongStrategy ? suggestion.name : "macro";
    const usedGate = isStrongStrategy ? suggestion.gate : "tempo/rosa/surf/coluna (40m)";
    return { name: usedName, gate: usedGate, suggestion, isStrongStrategy };
  }
  return null;
}

function isXadrezAlternado4(colors){
  if(colors.length < 4) return false;
  const a = colors[colors.length-4];
  const b = colors[colors.length-3];
  const c = colors[colors.length-2];
  const d = colors[colors.length-1];

  // alternância perfeita ABAB ou BABA
  return (a !== b) && (b !== c) && (c !== d);
}

// ===================== Motor ======================
let pending = null;
let currentCycleLoss = false;
let lastG0Strategy = null;

function clearPending(){ 
  pending = null; 
  martingaleTag.style.display = "none"; 
  setCardState({active:false, awaiting:false}); 
}

function onNewCandle(arr){
  if(arr.length < Math.min(WINDOW_PRED, WINDOW_CORR)) return;
  renderHistory(arr);

  const colors = arr.map(r=>r.color);
  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";

  // ===== JANELAS =====
  const colorsPred = getLastNColors(arr, WINDOW_PRED);
  const colorsCorr = getLastNColors(arr, WINDOW_CORR);

  const predN = predominancePct(colorsPred);
  const corrN = getMaxBlueStreakN(colorsCorr);

  const recTripla = lastKBlueStreakRecency(colorsCorr, 3);
  const twoPos = twoPosNow(colors);
  let corrGate = corrN;
  if(corrN===3 && recTripla>=5 && (twoPos || predN>=0.60) && finalBlueRunNow(colors)<=1) corrGate = 2;

  const analysis = getStrategyAndGate(colors, [], arr, predN, false);
  const strongStrategyActive = !!analysis;

  predStatus.textContent = `Predominância: ${(predN*100).toFixed(0)}% · Corr: ${corrN}`;
  blueRunPill.textContent = `Azuis seguidas: ${consecutiveBlueCount(arr)}` + (window.seguidinhaOn ? " · SEGUIDINHA ON" : "");

  // ===== DEBUG LOG =====
  console.log(`[CANDLE ${last.idx}] CorrGate: ${corrGate} | Pred: ${(predN*100).toFixed(0)}% | BlueRun: ${finalBlueRunNow(colors)} | Seguidinha: ${window.seguidinhaOn} | Estratégia: ${analysis?.name || '—'}`);

  // ===== RASTREIA MUDANÇAS DE CORREÇÃO =====
  const prevCorr = window.prevCorrGate;
  if(prevCorr !== undefined && corrGate !== prevCorr){
    maxBlueStreakHistory.push({idx: last.idx, streak: corrGate});
    if(maxBlueStreakHistory.length > 20) maxBlueStreakHistory.shift();
  }
  window.prevCorrGate = corrGate;

  const currentBlueRun = finalBlueRunNow(colors);

  // ===== FINALIZAÇÃO DE ENTRADA (sempre processar) =====
  if(pending && pending.enterAtIdx === last.idx){
    const win = last.mult >= 2.0;
    if(win){
      currentCycleLoss = false;
      stats.wins++; stats.streak++; stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      if(pending.stage===0) stats.normalWins++;
      else if(pending.stage===1) stats.g1Wins++;
      else stats.g2Wins++;
      syncStatsUI(); store.set(stats);
      addFeed("ok", `WIN 2x (G${pending.stage})`);
      topSlide("WIN 2x", true);
      clearPending();
      lastG0Strategy = null;
      // Continuar para checar bloqueio e novos sinais
    } else {
      if(pending.stage === 0){
        addFeed("err", "LOSS 2x (G0)"); topSlide("LOSS 2x", false);
        currentCycleLoss = true; lastG0Strategy = pending.strategy;
        pending.stage = 'G1_WAIT'; pending.enterAtIdx = null;
        setCardState({active:false, awaiting:true, title:"Aguardando G1", sub:"Procurando novo gatilho..."});
        addFeed("warn", "Aguardando novo gatilho para G1");
        // Continuar
      }
      if(pending.stage === 1){
        addFeed("err", "LOSS 2x (G1)"); topSlide("LOSS 2x (G1)", false);
        pending.stage = 'G2_WAIT'; pending.enterAtIdx = null;
        setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"Procurando novo gatilho..."});
        addFeed("warn", "Aguardando novo gatilho para G2");
        // Continuar
      }
      if(pending.stage === 2){
        addFeed("err", "LOSS 2x (G2)"); topSlide("LOSS 2x (G2)", false);
        stats.losses++;
        stats.streak = 0;
        syncStatsUI(); store.set(stats);
        clearPending(); lastG0Strategy = null;
        currentCycleLoss = false;
        // Continuar para novos sinais
      }
    }
  }

  // ===== SEGUIDINHA =====
  const minSeg = 4;
  const lastN = colors.slice(-Math.max(minSeg, colors.length));
  const blueInLastN = lastN.filter(c => c === "blue").length;
  const isSeguidinha = lastN.length >= minSeg && blueInLastN <= 1;

  if (isSeguidinha && !window.seguidinhaOn) {
    window.seguidinhaOn = true;
    addFeed("info", `SEGUIDINHA ON: ${lastN.length} velas, ${blueInLastN} azul`);
  }
  if (!isSeguidinha && window.seguidinhaOn && lastN.length >= 6) {
    window.seguidinhaOn = false;
    addFeed("info", "SEGUIDINHA OFF: padrão quebrado");
  }

  // ===== PROCESSAR WAITS (G1_WAIT, G2_WAIT) - sempre, mesmo em bloqueio =====
  if(pending?.stage === 'G1_WAIT'){

    // BLOQUEIO G1 se tiver 2 blues antes
{
  // pega últimas 6 velas = pra contar azuis
const last6 = colors.slice(-6);
const bluesBefore = last6.filter(v => v === "blue").length;

// se tiver 2 ou mais azuis antes do positive -> trava até confirmar força positiva
if(bluesBefore >= 2){
   // precisa 2 positivas consecutivas pra liberar
   const c = colors;
   const last = c.length;
   const posNow = c[last-1] !== "blue";
   const posPrev = c[last-2] !== "blue";

   if(!(posNow && posPrev)){ // não tem 2 positivas seguidas ainda
      if(window.lastWaitReason !== "2BlueG1"){
          addFeed("warn","G1 pausado — 2+ azuis antes — aguardando 2 positivas para liberar a entrada");
          window.lastWaitReason = "2BlueG1";
      }
      setCardState({active:false, awaiting:true, title:"Aguardando G1", sub:"2+ azuis antes — aguardando 2 positivas"});
      return;
   }
}
  // FILTRO INTELIGENTE DE CONTEXTO G1
{
  const L = colors.length;
  if(L >= 6){

    const c = colors;
    const isPos = (v)=>v !== "blue";
    const isBlue = (v)=>v === "blue";

    // força de 2 positivas consecutivas dentro das últimas 6 velas
    let force = false;
    for(let i=L-6;i<L-1;i++){
       if(isPos(c[i]) && isPos(c[i+1])){ force=true; break; }
    }

    // padrões xadrez
    const BPBP = isBlue(c[L-4]) && isPos(c[L-3]) && isBlue(c[L-2]) && isPos(c[L-1]);
    const PBPB = isPos(c[L-4]) && isBlue(c[L-3]) && isPos(c[L-2]) && isBlue(c[L-1]);

    // BBPP (sem chance para Blue)
    const BBPP = isBlue(c[L-4]) && isBlue(c[L-3]) && isPos(c[L-2]) && isPos(c[L-1]);

    // BBPPP (espera confirmação extra ainda)
    const BBPPP = isBlue(c[L-5]) && isBlue(c[L-4]) && isPos(c[L-3]) && isPos(c[L-2]) && isPos(c[L-1]);

    // PRIORIDADE: força > xadrez > isolada
    if(force){
        setCardState({active:false, awaiting:true, title:`Aguardando G1`, sub:`Aguardando G1 — força detectada`});
        if(window.lastWaitReason !== "forceG1"){
   addFeed("info","Aguardando G1 — força detectada");
   window.lastWaitReason = "forceG1";
}
        return;
    }

    if(!force && (BPBP || PBPB)){
        // deixa seguir xadrez normal
    } else if(BBPP && isBlue(c[L-1])){
        setCardState({active:false, awaiting:true, title:`Aguardando G1`, sub:`BBPP — sem Blue agora`});
        addFeed("warn", "G1 pausado — BBPP sem Blue");
        return;
    } else if(BBPPP){
        setCardState({active:false, awaiting:true, title:`Aguardando G1`, sub:`BBPPP — aguardar próxima P`});
        addFeed("info", "G1 pausado — BBPPP aguardando próxima positiva");
        return;
    }
  }
}
    
    // XADREZ — G1 só entra após confirmar 1 azul
if(isXadrezAlternado4(colors)){
   if(colors[colors.length-1] === "blue"){
      // azul confirmada → libera G1 normal (faz nada, só continua)
   } else {
      setCardState({active:false, awaiting:true, title:"Aguardando G1", sub:"Xadrez detectado — aguardando azul"});
      addFeed("warn","G1 pausado (xadrez) — Aguardando possivel xadrez");
      return; // mantém pending vivo
   }
}

    if(!strongStrategyActive && !window.seguidinhaOn){
      setCardState({active:false, awaiting:true, title:"Aguardando G1", sub:"Sem gatilho forte"});
      return; // Sai, mas permite retry na próxima candle
    }
    if(analysis && analysis.name === lastG0Strategy){
      setCardState({active:false, awaiting:true, title:"Aguardando G1", sub:"Mesma estratégia do G0"});
      return;
    }
  window.lastWaitReason = "";
    pending.stage = 1; pending.enterAtIdx = last.idx + 1; pending.strategy = analysis?.name || "seguidinha"; pending.afterMult = lastMultTxt;
    martingaleTag.style.display = "inline-block";
    setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${pending.afterMult})`});
    strategyTag.textContent = "Estratégia: " + pending.strategy;
    gateTag.textContent = "Gatilho: " + (analysis?.gate || "seguidinha");
    addFeed("warn", `SINAL 2x (G1) — entrar após (${pending.afterMult})`);
    return;
  }

  if(pending?.stage === 'G2_WAIT'){
    
   // BLOQUEIO G2 se tiver 2 blues antes OU mais
{
  const last6 = colors.slice(-6);
  const bluesBefore = last6.filter(v => v === "blue").length;

  if(bluesBefore >= 2){
      const c = colors;
      const last = c.length;
      const posNow = c[last-1] !== "blue";
      const posPrev = c[last-2] !== "blue";

      if(!(posNow && posPrev)){ // não tem 2 positivas consecutivas ainda
          if(window.lastWaitReason !== "2BlueG2"){
            addFeed("warn","G2 pausado — 2+ azuis antes — aguardando 2 positivas para liberar a entrada");
            window.lastWaitReason = "2BlueG2";
          }
          setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"2+ azuis antes — aguardando 2 positivas"});
          return;
      }
  }
}

    // FILTRO INTELIGENTE DE CONTEXTO G2
{
  const L = colors.length;
  if(L >= 6){

    const c = colors;
    const isPos = (v)=>v !== "blue";
    const isBlue = (v)=>v === "blue";

    // força de 2 positivas consecutivas dentro das últimas 6 velas
    let force = false;
    for(let i=L-6;i<L-1;i++){
       if(isPos(c[i]) && isPos(c[i+1])){ force=true; break; }
    }

    // padrões xadrez
    const BPBP = isBlue(c[L-4]) && isPos(c[L-3]) && isBlue(c[L-2]) && isPos(c[L-1]);
    const PBPB = isPos(c[L-4]) && isBlue(c[L-3]) && isPos(c[L-2]) && isBlue(c[L-1]);

    // BBPP (sem chance para Blue)
    const BBPP = isBlue(c[L-4]) && isBlue(c[L-3]) && isPos(c[L-2]) && isPos(c[L-1]);

    // BBPPP (espera confirmação extra ainda)
    const BBPPP = isBlue(c[L-5]) && isBlue(c[L-4]) && isPos(c[L-3]) && isPos(c[L-2]) && isPos(c[L-1]);

   // força detectada -> prioridade máxima
if(force){
   setCardState({active:false, awaiting:true, title:`Aguardando G2`, sub:`Aguardando G2 — força detectada`});
   if(window.lastWaitReason !== "forceG2"){
       addFeed("info", "Aguardando G2 — força detectada");
       window.lastWaitReason = "forceG2";
   }
   return;
}

    if(!force && (BPBP || PBPB)){
        // deixa seguir xadrez normal
    } else if(BBPP && isBlue(c[L-1])){
        setCardState({active:false, awaiting:true, title:`Aguardando G2`, sub:`BBPP — sem Blue agora`});
        addFeed("warn", "G2 pausado — BBPP sem Blue");
        return;
    } else if(BBPPP){
        setCardState({active:false, awaiting:true, title:`Aguardando G2`, sub:`BBPPP — aguardar próxima P`});
        addFeed("info", "G2 pausado — BBPPP aguardando próxima positiva");
        return;
    }
  }
}
    
    // XADREZ — G2 só entra após confirmar 1 azul
if(isXadrezAlternado4(colors)){
   if(colors[colors.length-1] === "blue"){
      // azul confirmada → libera G2 normal
   } else {
      setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"Xadrez detectado — aguardando azul"});
      addFeed("warn","G2 pausado (xadrez) — Aguardando possivel xadrez");
      return;
   }
}

    if(!strongStrategyActive && !window.seguidinhaOn){
      setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"Sem gatilho forte"});
      return;
    }
    if(analysis && (analysis.name === lastG0Strategy || analysis.name === pending.strategy)){
      setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"Mesma estratégia anterior"});
      return;
    }
    window.lastWaitReason = "";
    pending.stage = 2; pending.enterAtIdx = last.idx + 1; pending.strategy = analysis.name; pending.afterMult = lastMultTxt;
    martingaleTag.style.display = "inline-block";
    setCardState({active:true, title:"Chance de 2x G2", sub:`entrar após (${pending.afterMult})`});
    strategyTag.textContent = "Estratégia: " + pending.strategy;
    gateTag.textContent = "Gatilho: " + analysis.gate;
    addFeed("warn", `SINAL 2x (G2) — entrar após (${pending.afterMult})`);
    return;
  }

  // ===== BLOQUEIO: 3+ AZUIS SEGUIDOS - só para novos G0, não retorna se pending =====
  if (currentBlueRun >= 3) {
    if (waitingForNewCorrections === 0) {
      waitingForNewCorrections = 1;
      setCardState({active:false, awaiting:true, title:"SINAL BLOQUEADO", sub:"3+ azuis seguidos → aguardando 1 nova"});
      addFeed("warn", "Bloqueio: 3+ azuis. Aguardando 1 nova correção ≤2.");
      engineStatus.textContent = "bloqueado (3+ azuis)";
    }
    if (pending) {
      // Se pending existe (cycle em andamento), continuar normalmente (já processado acima)
    } else {
      return; // Só return se não pending, para bloquear novos G0
    }
  }

  // ===== DESBLOQUEIO: 1 nova correção ≤2 =====
  if (waitingForNewCorrections > 0) {
    const lastChange = maxBlueStreakHistory[maxBlueStreakHistory.length - 1];
    if (lastChange && lastChange.streak <= 2) {
      waitingForNewCorrections = 0;
      addFeed("info", "Desbloqueado: nova correção ≤2 confirmada.");
      engineStatus.textContent = "operando";
      setCardState({active:false, awaiting:false});
      // Não clearPending, preserva cycle
    } else {
      setCardState({active:false, awaiting:true, title:"SINAL BLOQUEADO", sub:"Aguardando 1 nova correção ≤2"});
      if (pending) {
        // Permitir processar WAIT (já feito acima)
      } else {
        return; // Bloquear novos se não pending
      }
    }
  }

  // ===== NOVO SINAL G0 - só se não bloqueado e !pending =====
  if (!pending && waitingForNewCorrections === 0) {
    if (window.seguidinhaOn) {
      pending = { stage: 0, enterAtIdx: last.idx + 1, strategy: "seguidinha", afterMult: lastMultTxt };
      currentCycleLoss = true; lastG0Strategy = "seguidinha";
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${pending.afterMult})`});
      strategyTag.textContent = "Estratégia: seguidinha";
      gateTag.textContent = "Gatilho: sequência positiva (0-1 azul)";
      addFeed("warn", `SINAL 2x (G0) — SEGUIDINHA ON`);
      return;
    }

    const allowEntry = corrGate <= 2 || (corrGate === 3 && predN >= 0.65 && strongStrategyActive);
    if (allowEntry) {
      pending = { stage: 0, enterAtIdx: last.idx + 1, strategy: analysis?.name || "correção", afterMult: lastMultTxt };
          // se nasceu isolada com 2 blues atrás -> cycle isolado
     const P  = (colors[colors.length-1] !== "blue");
     const B1 = (colors[colors.length-2] === "blue");
     const B2 = (colors[colors.length-3] === "blue");
      
      pendingIsIsolated = (P && B1 && B2);

      currentCycleLoss = true; lastG0Strategy = pending.strategy;
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${pending.afterMult})`});
      strategyTag.textContent = "Estratégia: " + pending.strategy;
      gateTag.textContent = "Gatilho: " + (analysis?.gate || "correção ≤2");
      addFeed("warn", `SINAL 2x (G0) — entrar após (${pending.afterMult})`);
    } else {
      setCardState({active:false, awaiting:false, title:"SINAL BLOQUEADO", sub:"Corr≥3 sem força"});
    }
  }

  engineStatus.textContent = window.seguidinhaOn ? "SEGUIDINHA ON" : (waitingForNewCorrections > 0 ? "bloqueado (3+ azuis)" : "operando");
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
      setTimeout(init, 5000); // Reconectar
    });

    // Reset periódico
    setInterval(() => {
      if (waitingForNewCorrections > 0 || !pending && engineStatus.textContent.includes("bloqueado")) {
        waitingForNewCorrections = 0;
        clearPending();
        window.seguidinhaOn = false;
        maxBlueStreakHistory = [];
        window.prevCorrGate = null;
        addFeed("info", "Reset automático após inatividade.");
        engineStatus.textContent = "operando";
      }
    }, 1800000); // 30 min
  }catch(e){
    liveStatus.textContent="Falha ao iniciar Firebase";
    liveStatus.style.background="rgba(239,68,68,.15)"; liveStatus.style.color="#ffd1d1";
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
