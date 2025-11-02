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

// Predominância Ponderada
function predominancePositiveWeighted(list, N=8){
  const lastN = list.slice(-N);
  let total = 0, weightedPos = 0;
  lastN.forEach(c => {
    total++;
    if(c.mult >= 2.0){
      weightedPos += (c.mult >= 10 ? 1.5 : c.mult >= 5 ? 1.2 : 1.0);
    }
  });
  const pct = total ? weightedPos / total : 0;
  return {pct, ok: pct >= 0.55, strong: pct >= 0.70};
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

// Falsa Correção
function isFalseCorrection(arr){
  if(arr.length < 4) return false;
  const last4 = arr.slice(-4);
  if(last4[0].color==="blue" && last4[1].color==="blue" && last4[2].color==="blue"){
    if(last4[3].color !== "blue" && last4[3].mult < 3.0){
      window.lastBlockReason = "FALSA CORREÇÃO: BBB → P fraco (<3x)";
      return true;
    }
  }
  return false;
}

// COOLDOWN PÓS-ROSA >10x: 1 vela, mas entra se chance alta
function isPostHighPinkCooldown(arr, pred8, analysis){
  const lp = lastPink(arr);
  if (!lp || lp.mult < 10.0) return false;
  const bluesAfter = arr.slice(arr.indexOf(lp) + 1).filter(c => c.color === "blue").length;
  const isFirstBlueAfter = bluesAfter === 1;

  // PERMITE ENTRADA se pred. forte OU estratégia GRK/forte
  if (isFirstBlueAfter && (pred8.strong || (analysis && analysis.suggestion?.name?.includes("GRK")))) {
    return false;
  }
  return isFirstBlueAfter;
}

// Rosa na borda
function pinkInEdgeColumn(arr, cols=5){
  const lp = lastPink(arr);
  if(!lp || lp.idx === undefined || lp.mult < 5.0) return false;
  const pinkColIndex = (lp.idx) % cols;
  return (pinkColIndex === 0 || pinkColIndex === (cols - 1));
}

// Bloqueio linha 5
function check5LineBlock(arr, cols=5){
  const L = arr.length;
  if (L === 0) return false;
  const currentIdx = L - 1;
  const currentLineStartIdx = currentIdx - (currentIdx % cols);
  const line = arr.slice(currentLineStartIdx, currentLineStartIdx + cols);
  let blueCount = 0, posCount = 0, hasStrongPos = false;
  for (const candle of line) {
    if (candle.color === "blue") blueCount++;
    else { posCount++; if(candle.mult >= 5.0) hasStrongPos = true; }
  }
  if (blueCount > posCount && !hasStrongPos) {
    window.lastBlockReason = "Predominância de Azul, aguardando...";
    return true;
  }
  return false;
}

// ===================== Parâmetros =======================
const SOFT_PCT = 0.55;
const STRONG_PCT = 0.70;
const HARD_PAUSE_BLUE_RUN = 3;
const TIME_WINDOWS_AFTER_PINK = [5,7,10,20];
const TIME_TOLERANCE_MIN = 2;

window.lastBlockReason = null;
window.lastPauseMessage = null;

// ===================== Estratégias =======================
function inPinkTimeWindow(nowTs, arr){ /* ... mesmo código ... */ }
function roseResetBooster(arr){ /* ... mesmo código ... */ }
function macroConfirm(arr40, nowTs, fullArr){ /* ... mesmo código ... */ }

// MODELO GRK
function detectGRKStrategy(colors, arr){ /* ... mesmo código ... */ }

function detectStrategies(colors, predPct){ /* ... mesmo código ... */ }
function ngramPositiveProb(colors, order, windowSize=120){ /* ... mesmo código ... */ }
function detectRepetitionStrategy(colors){ /* ... mesmo código ... */ }
function modelSuggest(colors){ /* ... mesmo código ... */ }

// ===================== Motor =======================
let pending = null;
function clearPending(){ pending=null; martingaleTag.style.display="none"; setCardState({active:false, awaiting:false}); }

function getStrategyAndGate(colors, pred8, arr40, arr){
  const grk = detectGRKStrategy(colors, arr);
  if (grk) return { name: grk.name, gate: grk.gate, suggestion: grk };
  let suggestion = detectStrategies(colors, pred8.pct) || detectRepetitionStrategy(colors) || modelSuggest(colors); 
  const macroOk = macroConfirm(arr40, arr[arr.length-1]?.ts || Date.now(), arr);
  if(suggestion || (macroOk && pred8.ok)){
    const usedName = suggestion ? suggestion.name : "macro";
    const usedGate = suggestion ? suggestion.gate : "tempo/rosa/surf/coluna (40m)";
    return { name: usedName, gate: usedGate, suggestion };
  }
  return null;
}

function onNewCandle(arr){
  if(arr.length<2) return;
  renderHistory(arr);

  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const arr40 = macroWindow40m(arr, nowTs);
  const colors = arr.map(r=>r.color);
  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";

  const pred8 = predominancePositiveWeighted(arr, 8);
  const blueRun = consecutiveBlueCount(arr);
  const bbbCount = countBBBSequences(colors, 8); 

  // UI: predominância:
  predStatus.textContent = `predominância: ${(pred8.pct*100).toFixed(0)}%` + (pred8.strong?" · FORTE":"");
  blueRunPill.textContent = `Azuis: ${blueRun}`;

  // BLOQUEIOS
  if(isFalseCorrection(arr)){
    setCardState({active:false, awaiting:true, title:"SINAL BLOQUEADO", sub: window.lastBlockReason});
    if(pending) clearPending();
    return;
  }

  const analysis = getStrategyAndGate(colors, pred8, arr40, arr); // ← análise antes do cooldown

  if(isPostHighPinkCooldown(arr, pred8, analysis)){
    setCardState({active:false, awaiting:true, title:"Cooldown", sub:"1 vela após rosa >10x"});
    if(pending) clearPending();
    return;
  }

  const line5Block = check5LineBlock(arr);
  const blockCorrections = bbbCount>=2; 
  const weakPred = !pred8.ok;
  const hardPauseBlueRun = blueRun >= HARD_PAUSE_BLUE_RUN;

  const hardPaused = hardPauseBlueRun || blockCorrections || weakPred || line5Block;
  engineStatus.textContent = hardPaused ? "aguardando" : "operando";

  if(hardPaused){
    let sub = line5Block ? "Predominância de Azul, aguardando..." :
              blockCorrections ? "correção BBB repetida (micro 8)" :
              weakPred ? "Aguardando Estabilização" :
              hardPauseBlueRun ? "3+ azuis seguidas na ponta" : "aguarde uma possibilidade";
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub});
    const pauseMsg = sub;
    if (window.lastPauseMessage !== pauseMsg) { addFeed("warn", pauseMsg); window.lastPauseMessage = pauseMsg; }
    if(pending && (pending.stage === 'G1_WAIT' || pending.stage === 'G2_WAIT')) return;
    if(pending) clearPending();
    return;
  }
  window.lastPauseMessage = null; 

  // ... RESTO DO MOTOR (igual, sem alterações visuais)
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
         pending = { stage: 'POST_PINK_WAIT', enterAtIdx: last.idx + 1, reason: 'Pós-Rosa (WIN, Pred < 55%)' };
         setCardState({ active: false, awaiting: true, title: "Aguardando", sub: "Pós-Rosa, reanalisando próxima vela" });
         addFeed("warn", "WIN (Rosa) - Aguardando 1 vela para reanalisar");
         return;
      }
      clearPending();
    } else {
      const nextSuggestion = getStrategyAndGate(colors, pred8, arr40, arr);
      const predOk = pred8.ok;
      const newPatternFound = !!nextSuggestion;
      if(pending.stage===0){
          const g1Allowed = predOk && newPatternFound;
          if(g1Allowed){
            pending.stage=1; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G1", sub:`Gatilho: ${nextSuggestion.name}`}); 
            addFeed("warn",`Ativando G1 (Gatilho: ${nextSuggestion.name})`);
          } else {
            pending.stage = 'G1_WAIT'; pending.enterAtIdx = null; 
            const reason = !predOk ? "Aguardando Estabilização" : "aguardando novo padrão/estratégia"; 
            setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: reason});
            addFeed("warn", `G1 em espera: ${reason}`);
          }
      } else if(pending.stage===1){
          const g2Allowed = predOk && newPatternFound; 
          if(g2Allowed){ 
             pending.stage=2; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
             setCardState({active:true, title:"Chance de 2x G2", sub:`Gatilho: ${nextSuggestion.name}`});
             strategyTag.textContent = "Estratégia: " + nextSuggestion.name;
             gateTag.textContent = "Gatilho: " + nextSuggestion.gate;
             addFeed("warn","SINAL 2x (G2) — último recurso");
          } else {
            pending.stage = 'G2_WAIT'; pending.enterAtIdx = null; 
            const reason = !predOk ? "Aguardando Estabilização" : "aguardando novo padrão/estratégia"; 
            setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
            addFeed("warn", `G2 em espera: ${reason}`);
          }
      } else if(pending.stage===2){
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G2 falhou)"); topSlide("LOSS 2x (G2)", false); clearPending();
      }
    }
    return;
  }

  if(pending && pending.stage==='POST_PINK_WAIT'){
      clearPending();
      addFeed("info", "Pós-Rosa concluído. Reanalisando.");
      setCardState({ active: false, awaiting: false, title: "Chance de 2x", sub: "identificando padrão" });
  }

  if(pending && (pending.stage==='G1_WAIT' || pending.stage==='G2_WAIT')){
     const nextSuggestion = getStrategyAndGate(colors, pred8, arr40, arr);
     const predOk = pred8.ok;
     const newPatternFound = !!nextSuggestion;
     if(pending.stage==='G1_WAIT'){
        const g1Allowed = predOk && newPatternFound;
        if(g1Allowed){
            pending.stage=1; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G1", sub:`Gatilho: ${nextSuggestion.name}`}); 
            addFeed("warn",`SINAL 2x (G1) — entrar após (${lastMultTxt})`);
        } else {
            const reason = !predOk ? "Aguardando Estabilização" : "aguardando novo padrão/estratégia";
            setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: reason});
        }
     } else if(pending.stage==='G2_WAIT'){
        const g2Allowed = predOk && newPatternFound;
        if(g2Allowed){
            pending.stage=2; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G2", sub:`Gatilho: ${nextSuggestion.name}`});
            strategyTag.textContent = "Estratégia: " + nextSuggestion.name;
            gateTag.textContent = "Gatilho: " + nextSuggestion.gate;
            addFeed("warn",`SINAL 2x (G2) — entrar após (${lastMultTxt})`);
        } else {
            const reason = !predOk ? "Aguardando Estabilização" : "aguardando novo padrão/estratégia";
            setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
        }
     }
     return;
  }

  if(!pending){
    const analysis = getStrategyAndGate(colors, pred8, arr40, arr);
    const entryAllowed = pred8.ok && !blockCorrections && ( (bbbCount===0) || (bbbCount===1 && pred8.strong) );
    const fastLane = pred8.strong && !!analysis;

    if(entryAllowed && analysis){
      pending = { stage: 0, enterAtIdx: last.idx+1, reason: analysis.gate, strategy: analysis.name };
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + analysis.name + (fastLane ? " · FAST LANE" : (pred8.strong?" · cenário forte":""));
      gateTag.textContent = "Gatilho: " + analysis.gate;
      addFeed("warn", `SINAL 2x (${analysis.name}) — entrar após (${lastMultTxt})`);
      return;
    } else {
      setCardState({active:false, awaiting:false, title:"Chance de 2x", sub:"identificando padrão"});
      strategyTag.textContent = "Estratégia: —";
      gateTag.textContent = "Gatilho: —";
    }
  }
}

// ===================== Firebase =======================
function toArrayFromHistory(raw){ /* ... mesmo código ... */ }

(function init(){
  console.log("Iniciando Firebase... Config:", firebaseConfig.projectId);
  try{
    if (typeof firebase === 'undefined') throw new Error("Firebase SDK não carregado!");
    const app = firebase.initializeApp(firebaseConfig);
    console.log("Firebase OK");
    liveStatus.textContent = "Conectado";
    liveStatus.style.background="rgba(34,197,94,.15)"; liveStatus.style.color="#b9f5c7"; liveStatus.style.borderColor="rgba(34,197,94,.35)";
    const dbRef = app.database().ref("history/");
    dbRef.on('value',(snapshot)=>{
      const data = snapshot.val();
      const arr = toArrayFromHistory(data);
      if(!arr.length){ engineStatus.textContent="sem dados"; return; }
      onNewCandle(arr);
    },(error)=>{
      console.error("Erro Firebase:", error);
      liveStatus.textContent = "Erro: "+error.message;
      liveStatus.style.background="rgba(239,68,68,.15)"; liveStatus.style.color="#ffd1d1";
    });
  }catch(e){
    console.error("Falha Firebase:", e);
    liveStatus.textContent="Falha ao iniciar Firebase";
    liveStatus.style.background="rgba(239,68,68,.1E)"; liveStatus.style.color="#ffd1d1";
  }
})();

// ===================== BLOQUEIO DEVTOOLS =======================
(function() { /* ... mesmo código ... */ })();
