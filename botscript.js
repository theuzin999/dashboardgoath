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
function positivesRatio(list){
  const pos = list.filter(c=>c.color==="purple"||c.color==="pink").length;
  return list.length ? pos/list.length : 0;
}
function predominancePositive(list, N=8){
  const lastN = list.slice(-N);
  const pct = positivesRatio(lastN);
  return {pct, ok:pct>=SOFT_PCT, strong:pct>=STRONG_PCT};
}
function consecutiveBlueCount(list){
  let c=0; for(let i=list.length-1;i>=0;i--){ if(list[i].color==="blue") c++; else break; } return c;
}
function countBBBSequences(colors, N=8){
  const window = colors.slice(-N);
  let cnt=0, run=0;
  for(let i=0;i<window.length;i++){
    if(window[i]==="blue"){ run++; if(run===3) cnt++; }
    else run=0;
  }
  return cnt;
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

    let blueCount = 0;
    let posCount = 0;

    for (const candle of line) {
        if (candle.color === "blue") blueCount++;
        else posCount++;
    }

    if (blueCount > posCount) {
        window.lastBlockReason = `Predominância de Azul, aguardando...`; 
        return true;
    }
    return false;
}

// ===================== Parâmetros =======================
const SOFT_PCT = 0.50;
const STRONG_PCT = 0.60;
const HARD_PAUSE_BLUE_RUN = 3;
const TIME_WINDOWS_AFTER_PINK = [5,7,10,20];
const TIME_TOLERANCE_MIN = 2;

window.lastBlockReason = null;
window.lastPauseMessage = null;

// ===================== Estratégias =======================
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
  return !!(lup && lup.mult>=5);
}

function detectStrategies(colors, predPct){ 
  const L=colors.length; if(L<3) return null;
  const isPos = (c) => c==="purple" || c==="pink";
  const a=colors[L-3], b=colors[L-2], c=colors[L-1];

  if(L >= 8 && colors[L-2] === "blue" && colors[L-4] === "blue"){ 
    let posRunLen = 0; for(let i=L-3; i>=0; i--){ if(isPos(colors[i])) posRunLen++; else break; }
    if(posRunLen >= 2 && posRunLen <= 4){ 
      let prevBlueRunLen = 0; let startIdx = L - 3 - posRunLen;
      for(let i=startIdx; i>=0; i--){ if(colors[i] === "blue") prevBlueRunLen++; else break; }
      if(prevBlueRunLen >= 3 && prevBlueRunLen <= 4){
        return null;
      }
    }
  }

  if(L >= 3 && isPos(a) && isPos(b) && isPos(c)){
    let posRunLen = 0; for(let i=L-1;i>=0;i--){ if(isPos(colors[i])) posRunLen++; else break; }
    if(posRunLen >= 4) return {name:"surfing-4+", gate:`Sequência de ${posRunLen} positivas ⇒ P (2x)`};
    if(posRunLen === 3) return {name:"sequência roxas 3", gate:"3 positivas ⇒ P (2x)"};
  }

  if(L >= 7){
    const last7 = colors.slice(-7);
    if(isPos(last7[0]) && isPos(last7[1]) && isPos(last7[2]) && 
       last7[3]==="blue" && 
       isPos(last7[4]) && isPos(last7[5]) && isPos(last7[6])){
      return {name:"surf-alternado", gate:"3P-1B-3P ⇒ P (2x)"};
    }
  }

  if(predPct >= STRONG_PCT && c === "blue"){
    return {name:"predominancia-forte", gate:`Pred ${(predPct*100).toFixed(0)}% + Azul ⇒ P (2x)`};
  }

  if(a==="blue" && b==="purple" && c==="blue") return {name:"xadrez", gate:"B-P-B ⇒ P (2x)"};
  if(b==="pink" && c==="blue") return {name:"pós-rosa xadrez", gate:"Rosa→Azul ⇒ P (2x)"};
  if(L>=4 && colors.slice(-4).join("-")==="blue-blue-blue-purple") return {name:"triplacor", gate:"BBB-P ⇒ 2x"};
  if(a==="blue" && b==="blue" && c==="purple") return {name:"triplacor parcial", gate:"BB-P ⇒ repetir 2x"};

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
    const res = ngramPositiveProb(colors, k, 17);
    if(res && res.n >= 1 && res.p >= 0.75){
      return {name:`rep_cores k=${k} (W17)`, gate:`Repetição (17 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  for(const k of [3,2]){
    const res = ngramPositiveProb(colors, k, 8);
    if(res && res.n >= 1 && res.p >= 1.0){
      return {name:`rep_cores k=${k} (W8)`, gate:`Repetição (8 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}

function modelSuggest(colors){
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k, 120);
    if(res && res.n>=3 && res.p>=0.45){ 
      return {name:`modelo n-grama k=${k}`, gate:`IA: P(positiva|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
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
  const blockCorrections = bbbCount >= 2;
  const line5Block = check5LineBlock(arr);

  if (blockCorrections || !pred8.ok || line5Block) return null;

  const correctionOk = (bbbCount === 0) || (bbbCount === 1 && pred8.strong);
  if (!correctionOk) return null;

  const macroOk = macroConfirm(arr40, nowTs, arr);

  const strategy = detectStrategies(colors, pred8.pct) ||
                   detectRepetitionStrategy(colors) ||
                   modelSuggest(colors);

  if (strategy || (macroOk && pred8.ok)) {
    const name = strategy ? strategy.name : "macro";
    const gate = strategy ? strategy.gate : "tempo/rosa/surf/coluna (40m)";
    const fastLane = pred8.strong && !!strategy;
    return { name, gate, strategy, fastLane, pred8, macroOk };
  }
  return null;
}

// ===================== Motor =======================
let pending = null;
function clearPending(){
  pending = null;
  martingaleTag.style.display = "none";
  setCardState({ active: false, awaiting: false, title: "Chance de 2x", sub: "identificando padrão" });
  strategyTag.textContent = "Estratégia: —";
  gateTag.textContent = "Gatilho: —";
}

function onNewCandle(arr){
  if(arr.length<2) return;
  renderHistory(arr);

  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";
  const colors = arr.map(r=>r.color);
  const pred8 = predominancePositive(arr, 8);
  const blueRun = consecutiveBlueCount(arr);
  const bbbCount = countBBBSequences(colors, 8); 

  predStatus.textContent = `Predominância: ${(pred8.pct*100).toFixed(0)}%` + (pred8.strong?" · forte":"");
  blueRunPill.textContent = `Azuis seguidas: ${blueRun}`;

  // ================= BLOQUEIOS GERAIS =================
  const line5Block = check5LineBlock(arr);
  const blockCorrections = bbbCount >= 2;
  const weakPred = !pred8.ok;
  const hardPauseBlueRun = blueRun >= HARD_PAUSE_BLUE_RUN;

  const hardPaused = hardPauseBlueRun || blockCorrections || weakPred || line5Block;
  engineStatus.textContent = hardPaused ? "aguardando" : "operando";

  if(hardPaused){
    let sub = (line5Block ? lastBlockReason : blockCorrections?"correção BBB repetida (micro 8)": weakPred?"Aguardando Estabilização": hardPauseBlueRun ? "3+ azuis seguidas na ponta" : "aguarde uma possibilidade");
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub});
    const pauseMsg = sub;
    if (window.lastPauseMessage !== pauseMsg) { addFeed("warn", pauseMsg); window.lastPauseMessage = pauseMsg; }
    
    if(pending && (pending.stage === 'G1_WAIT' || pending.stage === 'G2_WAIT' || pending.stage === 'POST_PINK_WAIT')) return;
    if(pending && pending.stage >= 0) clearPending();
    return;
  }
  window.lastPauseMessage = null; 

  // ================= FECHAMENTO DE SINAL (WIN/LOSS) =================
  if(pending && typeof pending.enterAtIdx === "number" && last.idx === pending.enterAtIdx){
    const win = last.mult >= 2.0;
    
    if(win){
      stats.wins++; stats.streak++; stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      if(pending.stage===0) stats.normalWins++;
      else if(pending.stage===1) stats.g1Wins++;
      else if(pending.stage===2) stats.g2Wins++;
      syncStatsUI(); store.set(stats);
      const label = pending.stage===0 ? "WIN 2x" : `WIN 2x (G${pending.stage})`;
      addFeed("ok", label); topSlide("WIN 2x", true); 

      if (last.color === 'pink' && !pred8.ok) { 
         pending = { stage: 'POST_PINK_WAIT', enterAtIdx: last.idx + 1, reason: 'Pós-Rosa (WIN, Pred < 50%)' };
         setCardState({ active: false, awaiting: true, title: "Aguardando", sub: "Pós-Rosa, reanalisando próxima vela (Pred < 50%)" });
         addFeed("warn", "WIN (Rosa) - Aguardando 1 vela para reanalisar (Pred < 50%)");
         return;
      }

      clearPending();
    } else {
      // LOSS → tenta próximo gale
      const nextSignal = canEnterSignal(arr, nowTs);
      const nextStage = pending.stage + 1;

      if (nextStage <= 2 && nextSignal) {
        pending.stage = nextStage;
        pending.enterAtIdx = last.idx + 1;
        martingaleTag.style.display = "inline-block";
        setCardState({ active: true, title: `Chance de 2x G${nextStage}`, sub: `Gatilho: ${nextSignal.name}` });
        strategyTag.textContent = "Estratégia: " + nextSignal.name;
        gateTag.textContent = "Gatilho: " + nextSignal.gate;
        addFeed("warn", `LOSS → Ativando G${nextStage} (${nextSignal.name})`);
      } else {
        // LOSS FINAL
        stats.losses++; stats.streak = 0; syncStatsUI(); store.set(stats);
        addFeed("err", `LOSS 2x (G${pending.stage})`); 
        topSlide(`LOSS 2x (G${pending.stage})`, false);
        clearPending();
      }
    }
    return;
  }

  // ================= ESTADO DE ESPERA (PÓS-ROSA) =================
  if(pending && pending.stage === 'POST_PINK_WAIT'){
    clearPending();
    addFeed("info", "Pós-Rosa concluído. Reanalisando.");
    return;
  }

  // ================= ENTRADA NORMAL (G0) =================
  if(!pending){
    const signal = canEnterSignal(arr, nowTs);
    if(signal){
      pending = { stage: 0, enterAtIdx: last.idx + 1, reason: signal.gate, strategy: signal.name };
      setCardState({ active: true, title: "Chance de 2x", sub: `entrar após (${lastMultTxt})` });
      strategyTag.textContent = "Estratégia: " + signal.name + (signal.fastLane ? " · FAST LANE" : (signal.pred8.strong?" · cenário forte":""));
      gateTag.textContent = "Gatilho: " + signal.gate;
      addFeed("warn", `SINAL 2x (${signal.name}) — entrar após (${lastMultTxt})`);
    } else {
      setCardState({ active: false, awaiting: false, title: "Chance de 2x", sub: "identificando padrão" });
      strategyTag.textContent = "Estratégia: —"; gateTag.textContent = "Gatilho: —";
    }
  }
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
