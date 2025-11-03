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

// ===================== Utils (MODIFICADO PARA NOVA CORREÇÃO) =======================
function colorFrom(mult){ if(mult<2.0) return "blue"; if(mult<10.0) return "purple"; return "pink"; }
const isPos = (c) => c==="purple" || c==="pink";
function isPositiveColor(c){ return isPos(c); } // Helper para clareza

// ===== Window param (pode trocar p/ 20 se quiser): =====
const WINDOW_N = 10;

// Últimas N cores
function getLastNColors(arr, n){ return arr.slice(-n).map(r=>r.color); }

// Predominância de positivas (purple/pink)
function predominancePct(colorsLastN){
  const pos = colorsLastN.filter(c => c==="purple" || c==="pink").length;
  return colorsLastN.length ? pos/colorsLastN.length : 0;
}

// Maior sequência de azul dentro da janela (correção oficial)
function getMaxBlueStreakN(colorsLastN){
  let max = 0, run = 0;
  for(const c of colorsLastN){
    if(c==="blue"){ run++; if(run>max) max=run; }
    else run = 0;
  }
  return max;
}

// Recência da última sequência k de azuis (0=acabou agora; Infinity=não houve)
function lastKBlueStreakRecency(colorsLastN, k=3){
  let run=0;
  for(let i=colorsLastN.length-1;i>=0;i--){
    if(colorsLastN[i]==="blue"){ run++; if(run>=k) return colorsLastN.length-1-i; }
    else run=0;
  }
  return Infinity;
}

// Duas positivas agora
function twoPosNow(colors){
  const L = colors.length;
  return L>=2 && (colors[L-1]!=="blue") && (colors[L-2]!=="blue");
}

// Streak final de azul (pressão atual)
function finalBlueRunNow(colors){
  let r=0; for(let i=colors.length-1;i>=0 && colors[i]==="blue"; i--) r++; return r;
}

// Quantas azuis nas últimas m velas (curto prazo para desligar seguidinha)
function countBluesLast(colors, m){
  const w = colors.slice(-m); let n=0; for(const c of w) if(c==="blue") n++; return n;
}

// Funções antigas mantidas para compatibilidade de chamadas
function consecutiveBlueCount(list){
  let c=0; for(let i=list.length-1;i>=0;i--){ if(list[i].color==="blue") c++; else break; } return c;
}
function lastPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="pink") return arr[i]; } return null; }
function lastPurpleOrPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color!=="blue") return arr[i]; } return null; }
function minutesSince(tsNow, ts){ return (tsNow - ts)/60000; }
function macroWindow40m(arr, nowTs){
  const from = nowTs - (40*60*1000);
  return arr.filter(r=> typeof r.ts==="number" && r.ts>=from && r.ts<=nowTs);
}
function hasSurfWithin(arr){
  let run=0; for(const r of arr){ if(r.color!=="blue"){ run++; if(run>=3) return true; } else run=0; } return false;
}
function pinkInEdgeColumn(arr, cols=5){
  const lp = lastPink(arr);
  if(!lp || lp.idx === undefined) return false;
  const pinkColIndex = (lp.idx) % cols;
  return (pinkColIndex === 0 || pinkColIndex === (cols - 1));
}
function macroConfirm(arr40, nowTs, fullArr){ 
  return inPinkTimeWindow(nowTs, arr40) || 
         roseResetBooster(arr40) || 
         hasSurfWithin(arr40) ||
         pinkInEdgeColumn(fullArr, 5);
}
function check5LineBlock(arr, cols=5){
    const L = arr.length;
    if (L === 0) return false;
    const currentIdx = L - 1;
    const currentLineStartIdx = currentIdx - (currentIdx % cols);
    const line = arr.slice(currentLineStartIdx, currentLineStartIdx + cols);
    let blueCount = 0; let posCount = 0;
    for (const candle of line) { if (candle.color === "blue") { blueCount++; } else { posCount++; } }
    if (blueCount > posCount) { window.lastBlockReason = `Predominância de Azul na coluna, aguardando...`; return true; }
    return false;
}

// ===================== Parâmetros (mantidos) =======================
const SOFT_PCT = 0.50; 
const STRONG_PCT = 0.60; 
const HARD_PAUSE_BLUE_RUN = 3; 
const TIME_WINDOWS_AFTER_PINK = [5,7,10,20]; 
const TIME_TOLERANCE_MIN = 2; 

// Variáveis de comunicação de bloqueio/pausa
window.lastBlockReason = null;
window.lastPauseMessage = null;
window.seguidinhaOn = false; 

// ===================== Estratégias baseadas no Ebook (mantidas) =======================
function inPinkTimeWindow(nowTs, arr){ 
  const lp = lastPink(arr);
  if(!lp || !lp.ts) return false;
  const diff = Math.abs(minutesSince(nowTs, lp.ts));
  for(const w of TIME_WINDOWS_AFTER_PINK){
    if(Math.abs(diff - w) <= TIME_TOLERANCE_MIN) return true;
  }
  return false;
}
function roseResetBooster(arr){ 
  const last = arr[arr.length-1];
  const prev = arr[arr.length-2];
  if(last && last.color==="pink") return true;
  if(prev && prev.color==="pink") return true;
  const lup = lastPurpleOrPink(arr);
  return !!(lup && lup.mult>=3.5); 
}

function detectStrategies(colors, predNPct){
  const L=colors.length; if(L<3) return null;
  const a=colors[L-3], b=colors[L-2], c=colors[L-1];
  const isPos = x => x!=="blue";

  // SURF: 3+ positivas
  if(isPos(a) && isPos(b) && isPos(c)){
    let run=0; for(let i=L-1;i>=0 && isPos(colors[i]); i--) run++;
    if(run>=4) return {name:`surfing-4+`, gate:`${run} positivas ⇒ P (2x)`};
    if(run===3) return {name:`sequência roxas 3`, gate:`3 positivas ⇒ P (2x)`};
  }

  // SURF ALTERNADO 3P-1B-3P
  if(L>=7){
    const s = colors.slice(-7);
    if(isPos(s[0]) && isPos(s[1]) && isPos(s[2]) && s[3]==="blue" && isPos(s[4]) && isPos(s[5]) && isPos(s[6])){
      return {name:"surf-alternado", gate:"3P-1B-3P ⇒ P (2x)"};
    }
  }

  // XADREZ curto (ambos)
  if(a==="blue" && isPos(b) && c==="blue") return {name:"xadrez B-P-B", gate:"B-P-B ⇒ P (2x)"};
  if(isPos(a) && b==="blue" && isPos(c)) return {name:"xadrez P-B-P", gate:"P-B-P ⇒ P (2x)"};

  // XADREZ longo com viés positivo (8~10, alternância + ≥60% positivas)
  const W = Math.min(L, 10);
  if(W>=6){
    const w = colors.slice(-W);
    let alterna = true, posCount = 0;
    for(let i=1;i<w.length;i++){ if(w[i]===w[i-1]){alterna=false; break;} }
    for(const cc of w) if(isPos(cc)) posCount++;
    if(alterna && (posCount/w.length)>=0.60){
      return {name:`xadrez-viés-positivo W${W}`, gate:`Alternância + ${(posCount/w.length*100).toFixed(0)}% P ⇒ P (2x)`};
    }
  }

  // PARES (2P-2B / 2B-2P) com repetição (8~12 últimas)
  const WP = Math.min(L, 12);
  if(WP>=8){
    const w = colors.slice(-WP);
    const blocks = [];
    for(let i=0;i<w.length;){
      const col=w[i]; let j=i; while(j<w.length && w[j]===col) j++;
      blocks.push({col, len:j-i}); i=j;
    }
    let pairsAlt=false;
    for(let i=0;i+3<blocks.length;i++){
      const b0=blocks[i], b1=blocks[i+1], b2=blocks[i+2], b3=blocks[i+3];
      const isPos0 = b0.col!=="blue", isPos1 = b1.col!=="blue", isPos2 = b2.col!=="blue", isPos3 = b3.col!=="blue";
      if(b0.len>=2 && b1.len>=2 && b2.len>=2 && b3.len>=2 &&
         isPos0 && !isPos1 && isPos2 && !isPos3){
           pairsAlt=true; break;
      }
      if(b0.len>=2 && b1.len>=2 && b2.len>=2 && b3.len>=2 &&
         !isPos0 && isPos1 && !isPos2 && isPos3){
           pairsAlt=true; break;
      }
    }
    if(pairsAlt) return {name:"pares alternando", gate:"2P-2B-2P-2B ⇒ P (2x)"};
  }

  // Predominância forte + azul na ponta (fim de correção)
  if(predNPct>=0.60 && c==="blue"){
    return {name:"predominancia-forte", gate:`Pred ${(predNPct*100).toFixed(0)}% + Azul ⇒ P (2x)`};
  }

  // IA (ngram curta e longa)
  const ngram = (order, win) => {
    const POS = x => x!=="blue"; const window = colors.slice(-win);
    if(window.length<=order) return null;
    const counts = new Map();
    for(let i=order;i<window.length;i++){
      const ctx = window.slice(i-order,i).join("|");
      const nx = window[i];
      const stat = counts.get(ctx) || {t:0,p:0};
      stat.t++; if(POS(nx)) stat.p++; counts.set(ctx, stat);
    }
    const ctxNow = window.slice(-order).join("|");
    const s = counts.get(ctxNow); if(!s || s.t<1) return null;
    return {p:s.p/s.t, n:s.t};
  };
  for(const [o,w,th] of [[3,8,0.70],[2,8,0.70],[4,20,0.60],[3,20,0.60]]){
    const r = ngram(o,w); if(r && r.p>=th) return {name:`rep_cores k=${o} (W${w})`, gate:`P(pos|ctx)=${(r.p*100).toFixed(0)}% · n=${r.n}`};
  }
  for(const o of [4,3,2]){
    const r = ngram(o,120); if(r && r.n>=2 && r.p>=0.40) return {name:`modelo n-grama k=${o}`, gate:`IA: P=${(r.p*100).toFixed(0)}% · n=${r.n}`};
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
  
  const macroOk = macroConfirm(arr40, arr[arr.length-1]?.ts || Date.now(), arr);
  
  const isStrongStrategy = !!suggestion; 

  if(isStrongStrategy || (allowMacro && macroOk && predNPct >= SOFT_PCT)){
    const usedName = isStrongStrategy ? suggestion.name : "macro";
    const usedGate = isStrongStrategy ? suggestion.gate : "tempo/rosa/surf/coluna (40m)";
    return { name: usedName, gate: usedGate, suggestion, isStrongStrategy };
  }
  return null;
}


// ===================== Motor (CORRIGIDO) ======================
let pending = null;
function clearPending(){ 
  pending=null; 
  martingaleTag.style.display="none"; 
  setCardState({active:false, awaiting:false}); 
}

function onNewCandle(arr){
  if(arr.length < WINDOW_N) return;
  renderHistory(arr);

  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const arr40 = macroWindow40m(arr, nowTs);
  const colors = arr.map(r=>r.color);
  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";

  // ===== Leitura da janela =====
  const colorsLastN = getLastNColors(arr, WINDOW_N);
  const predN = predominancePct(colorsLastN);
  const corrN = getMaxBlueStreakN(colorsLastN);

  // ===== Gate humano p/ tripla antiga =====
  const recTripla = lastKBlueStreakRecency(colorsLastN, 3);
  const twoPos = twoPosNow(colors);
  const finalBlue = finalBlueRunNow(colors);
  let corrGate = corrN;
  if(corrN===3 && recTripla>=5 && (twoPos || predN>=0.60) && finalBlue<=1) corrGate = 2;

  // ===== Estratégias / macro =====
  const analysis = getStrategyAndGate(colors, arr40, arr, predN, true);
  const strongStrategyActive = !!analysis;

  // ===== UI =====
  predStatus.textContent = `Predominância (${WINDOW_N}): ${(predN*100).toFixed(0)}% · Max Streak: ${corrN}`;
  const blueRun = consecutiveBlueCount(arr);
  blueRunPill.textContent = `Azuis seguidas: ${blueRun}` + (window.seguidinhaOn ? " · SEGUIDINHA ON" : "");

  // ===== Seguidinha ON/OFF =====
  const bluesLast5 = countBluesLast(colors, 5);
  if(window.seguidinhaOn){
    if(hasConsecutiveBlues(colorsLastN,3) || bluesLast5>=3){
      window.seguidinhaOn=false;
      addFeed("info","Seguidinha OFF: pressão azul.");
    }
  } else {
    if(corrGate<=1 && twoPos){
      window.seguidinhaOn=true;
      addFeed("info","Seguidinha ON: 1 correção confirmada por 2 positivas.");
    }
  }

  // ===== Finalização de entradas pré-agendadas =====
  if(pending && typeof pending.enterAtIdx==="number" && last.idx===pending.enterAtIdx){
    const win = last.mult>=2.0;
    if(win){
      stats.wins++; stats.streak++; stats.maxStreak=Math.max(stats.maxStreak, stats.streak);
      if(pending.stage===0) stats.normalWins++;
      else if(pending.stage===1) stats.g1Wins++;
      else if(pending.stage===2) stats.g2Wins++;
      syncStatsUI(); store.set(stats);
      addFeed("ok", pending.stage===0? "WIN 2x" : `WIN 2x (G${pending.stage})`);
      topSlide("WIN 2x", true); clearPending(); return;
    } else {
      // ===== BLOQUEIO: 2 azuis seguidos na frente do G1/G2 =====
      const lastTwoAreBlue = colors.length >= 2 && colors[colors.length-1] === "blue" && colors[colors.length-2] === "blue";

      // ===== G1/G2 precisam de novo padrão =====
      const g0StrategyName = pending.strategy;
      const nextAnalysis = getStrategyAndGate(colors, arr40, arr, predN, false);
      const nextStrong = !!nextAnalysis;
      const newPatternForGale = nextStrong && nextAnalysis.name !== g0StrategyName;

      if(pending.stage===0){
        let act='LOSS', reason="";
        if(lastTwoAreBlue){
          act='LOSS'; reason="Bloqueio: 2 azuis seguidos na frente do G1.";
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G0)"); topSlide("LOSS 2x", false);
          clearPending();
          return; // bloqueio real – para tudo
        }

        // ===== LOSS NORMAL NO G0 → CONTINUAR ANÁLISE PARA G1 =====
        stats.losses++; 
        stats.streak = 0; 
        syncStatsUI(); 
        store.set(stats);
        addFeed("err", "LOSS 2x (G0)");
        topSlide("LOSS 2x", false);

        // Limpa G0, mas NÃO sai da função
        pending = null;
        martingaleTag.style.display = "none";
        setCardState({active: false, awaiting: false});

        // Continua a execução – pode ativar G1 no mesmo candle!
        // (o resto do onNewCandle vai rodar)
      } else if(pending.stage===1){
        if(lastTwoAreBlue){
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G1)"); topSlide("LOSS 2x (G1)", false); clearPending();
          return;
        }
        if(!newPatternForGale){
          pending.stage='G2_WAIT'; pending.enterAtIdx=null;
          setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"Aguardando novo padrão (não o mesmo do G0)."});
          addFeed("warn","G2 em espera: precisa de novo padrão.");
          return;
        }
        let act='LOSS', reason="";
        if(corrGate<=2){ act='GALE'; reason="Correção ≤2."; }
        else if(corrGate===3){ act = (predN>=0.60 || nextStrong)?'GALE':'WAIT';
                               reason = act==='GALE' ? "Corr=3 com Pred≥60%/estratégia." : "Corr=3 aguardando Pred/estratégia."; }
        else if(corrGate===4){ act='WAIT'; reason="Corr=4 aguardando 1 vela."; }
        if(act==='GALE'){
          pending.stage=2; pending.enterAtIdx=last.idx+1; pending.strategy = nextAnalysis.name;
          martingaleTag.style.display="inline-block";
          setCardState({active:true, title:"Chance de 2x G2", sub:`Gatilho: ${nextAnalysis.name}`});
          addFeed("warn","SINAL 2x (G2)");
        } else if(act==='WAIT'){
          pending.stage='G2_WAIT'; pending.enterAtIdx=null;
          setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
          addFeed("warn",`G2 em espera — ${reason}`);
        } else {
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G1)"); topSlide("LOSS 2x (G1)", false); clearPending();
        }
      } else if(pending.stage===2){
        stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
        addFeed("err","LOSS 2x (G2)"); topSlide("LOSS 2x (G2)", false); clearPending();
      }
      return;
    }
  }

  // ===== Hard blocks (mantidos) =====
  const line5Block = check5LineBlock(arr);
  const heavyCorrection = corrN > 3;
  const hardPaused = heavyCorrection || line5Block;
  engineStatus.textContent = hardPaused ? "aguardando" : (window.seguidinhaOn ? "Seguidinha ON" : "operando");
  if(hardPaused){
    if(pending && (pending.stage==='G1_WAIT'||pending.stage==='G2_WAIT')) return;
    const sub = heavyCorrection ? `Correção alta: Max Streak ${corrN} (>3)` : (lastBlockReason || "aguarde...");
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub});
    if(window.lastPauseMessage!==sub){ addFeed("warn", sub); window.lastPauseMessage=sub; }
    return;
  }
  window.lastPauseMessage = null;

  // ===== Esperas (promover WAIT → GALE) =====
  if(pending && (pending.stage==='G1_WAIT' || pending.stage==='G2_WAIT')){
    const nextAnalysis = getStrategyAndGate(colors, arr40, arr, predN, false);
    const nextStrong = !!nextAnalysis;
    const newPatternForGale = nextStrong && nextAnalysis.name !== pending.strategy;

    if(pending.stage==='G1_WAIT'){
      let ok=false, reason="";
      if(corrGate<=1){ ok=true; reason=`Correção melhorou para ${corrGate}.`; }
      else if(corrGate===2){ ok = (predN>=0.60 || nextStrong); reason = ok? "Pred≥60%/estratégia." : "Aguardando Pred/estratégia."; }
      else if(corrGate>=3){ ok=false; reason="Ainda alto, mantendo espera."; }
      if(ok){
        pending.stage=1; pending.enterAtIdx=last.idx+1; pending.strategy = nextAnalysis?.name || "G1 Direto";
        martingaleTag.style.display="inline-block";
        setCardState({active:true, title:"Chance de 2x G1", sub:`Gatilho: ${nextAnalysis?.name || 'G1 Direto'}`});
        addFeed("warn",`SINAL 2x (G1) — entrar após (${lastMultTxt})`);
      } else {
        setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: reason});
      }
      return;
    }

    if(pending.stage==='G2_WAIT'){
      if(!newPatternForGale){
        setCardState({active:false, awaiting:true, title:"Aguardando G2", sub:"Aguardando novo padrão."});
        return;
      }
      let ok=false, reason="";
      if(corrGate<=2){ ok=true; reason=`Correção melhorou para ${corrGate}.`; }
      else if(corrGate===3){ ok = (predN>=0.60 || nextStrong); reason = ok? "Pred≥60%/estratégia." : "Aguardando Pred/estratégia."; }
      else if(corrGate>=4){ ok=false; reason="Ainda alto, mantendo espera."; }
      if(ok){
        pending.stage=2; pending.enterAtIdx=last.idx+1; pending.strategy = nextAnalysis.name;
        martingaleTag.style.display="inline-block";
        setCardState({active:true, title:"Chance de 2x G2", sub:`Gatilho: ${nextAnalysis.name}`});
        addFeed("warn",`SINAL 2x (G2) — entrar após (${lastMultTxt})`);
      } else {
        setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
      }
      return;
    }
  }

  // ===== Disparo por VIRADA (uma tentativa imediata) =====
  window.prevCorrGate = (typeof window.prevCorrGate==="number") ? window.prevCorrGate : corrGate;
  if(!pending && window.prevCorrGate>=2 && corrGate<=1 && twoPos){
    pending = { stage:0, enterAtIdx:last.idx+1, reason:"virada-correção", strategy:"virada-correção" };
    setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
    strategyTag.textContent = "Estratégia: virada-correção" + (window.seguidinhaOn ? " · SEGUIDINHA" : "");
    gateTag.textContent = "Gatilho: 2 positivas confirmando single correction";
    addFeed("warn",`SINAL 2x (virada-correção) — entrar após (${lastMultTxt})`);
    window.prevCorrGate = corrGate;
    return;
  }

  // ===== Novo Sinal (G0) =====
  if(!pending){
    if(!analysis && !window.seguidinhaOn) return;

    let entryAllowed=false, reason="";
    if(corrGate<=1){ entryAllowed=true; reason="Correção ≤1."; }
    else if(corrGate===2){
      entryAllowed = (predN>=0.60) || strongStrategyActive || window.seguidinhaOn;
      reason = entryAllowed ? "Corr=2 com Pred≥60%/estratégia/seguidinha." : "Corr=2 aguardando critério forte.";
    } else if(corrGate===3){ entryAllowed=false; reason="Corr=3: aguardar 1 vela."; }

    if(entryAllowed){
      pending = { stage:0, enterAtIdx:last.idx+1, reason:analysis?.gate || "seguidinha", strategy:analysis?.name || "seguidinha" };
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + (analysis?.name || 'seguidinha');
      gateTag.textContent = "Gatilho: " + (analysis?.gate || 'single correction');
      addFeed("warn",`SINAL 2x (${analysis?.name || 'seguidinha'}) — entrar após (${lastMultTxt})`);
    } else {
      setCardState({active:false, awaiting:false, title:"SINAL BLOQUEADO", sub:`Bloqueio G0: ${reason}`});
      strategyTag.textContent = "Estratégia: —";
      gateTag.textContent = "Gatilho: —";
    }
  }

  window.prevCorrGate = corrGate;
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

// ===================== BLOQUEIO DO DEVTOOLS =======================
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
