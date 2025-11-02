// botscriptebook.js — v2 (UI com feed/sidebars/stats) — by Theus & Tuki
// Regras-chaves:
// - Predominância (PAGUE): janela 8 velas (≥50% leve; ≥60% forte)
// - Correção por BLOCO: janela 17 velas (conta blocos consecutivos de azul)
// - G0: permitido com 1 bloco; com 2 blocos só se pred≥50%; 3 blocos bloqueia
// - G1/G2: só se PAGUE forte (pred≥60%) E blocos≤1; e NUNCA na frente de azul (exceto xadrez válido ≥3 alternâncias)
// - Pausa 1 vela se 2 blocos + pred<50% (“risco azul — aguardando”)
// - Cooldown pós 100x (10 velas)
// - Tempo 5/7/10/20 ±2 como reforço macro, não gatilho sozinho
// - Anti-BBB (3 azuis repetidas na janela curta) como bloqueio micro extra

/* ===================== FIREBASE CONFIG ===================== */
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

/* ===================== UI HOOKS ============================ */
const $ = s => document.querySelector(s);
const liveStatus = $("#liveStatus");
const engineStatus = $("#engineStatus");
const predStatus = $("#predStatus");
const blueRunPill = $("#blueRun");
const streakEl = $("#streak");
const winsEl = $("#wins");
const lossesEl = $("#losses");
const historyGrid = $("#history");
const chanceCard = $("#chanceCard");
const chanceTitle = $("#chanceTitle");
const chanceSub = $("#chanceSub");
const strategyTag = $("#strategyTag");
const gateTag = $("#gateTag");
const martingaleTag = $("#martingaleTag");
const feed = $("#feed");
const clearStatsBtn = $("#clearStatsBtn");

const winsSidebar = $("#winsSidebar"), streakSidebar = $("#streakSidebar");
const normalWinsEl = $("#normalWins"), g1WinsEl = $("#g1Wins"), g2WinsEl = $("#g2Wins"), maxStreakEl = $("#maxStreak");

$("#winsMoreBtn")?.addEventListener("click", ()=> winsSidebar.classList.add("open"));
$("#streakMoreBtn")?.addEventListener("click", ()=> streakSidebar.classList.add("open"));
$("#closeWins")?.addEventListener("click", ()=> winsSidebar.classList.remove("open"));
$("#closeStreak")?.addEventListener("click", ()=> streakSidebar.classList.remove("open"));
document.addEventListener("click", e => {
  if (winsSidebar && !winsSidebar.contains(e.target) && !$("#winsMoreBtn")?.contains(e.target)) winsSidebar.classList.remove("open");
  if (streakSidebar && !streakSidebar.contains(e.target) && !$("#streakMoreBtn")?.contains(e.target)) streakSidebar.classList.remove("open");
});

/* ===================== UI Helpers ========================== */
function setCardState({active=false, awaiting=false, title="Chance de 2x", sub="identificando padrão"}){
  if(chanceTitle) chanceTitle.textContent = title;
  if(chanceSub) chanceSub.textContent = sub;
  chanceCard?.classList.remove("chance-active","chance-awaiting","chance-blocked");
  if(active){ chanceCard?.classList.add("chance-active"); }
  else if(awaiting){ chanceCard?.classList.add("chance-awaiting"); }
  else if(title==="SINAL BLOQUEADO"){ chanceCard?.classList.add("chance-blocked"); }
}
function addFeed(type,text){
  if(!feed) return;
  const div = document.createElement("div"); div.className="item";
  const left=document.createElement("div"); left.textContent=text;
  const right=document.createElement("div"); right.className="chip "+(type==="ok"?"ok":type==="err"?"err":"warn");
  right.textContent= type==="ok"?"WIN": type==="err"?"LOSS":"INFO";
  div.appendChild(left); div.appendChild(right); feed.prepend(div);
}
function renderHistory(list){
  if(!historyGrid) return;
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

/* ===================== Persistência ======================== */
const store = {
  get(){ try{ return JSON.parse(localStorage.getItem("stats2x")||"{}"); }catch{return {}} },
  set(d){ localStorage.setItem("stats2x", JSON.stringify(d)); }
};
let stats = Object.assign({wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}, store.get());
function syncStatsUI(){
  if(!winsEl) return;
  winsEl.textContent=stats.wins; lossesEl.textContent=stats.losses; streakEl.textContent=stats.streak;
  maxStreakEl.textContent=stats.maxStreak; normalWinsEl.textContent=stats.normalWins;
  g1WinsEl.textContent=stats.g1Wins; g2WinsEl.textContent=stats.g2Wins;
}
syncStatsUI();
clearStatsBtn?.addEventListener("click", ()=>{
  if(confirm("Limpar todas as estatísticas?")){
    stats={wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}; 
    store.set(stats); syncStatsUI();
  }
});

/* ===================== Utils / Parâmetros ================== */
function colorFrom(mult){ if(mult<2.0) return "blue"; if(mult<10.0) return "purple"; return "pink"; }
function positivesRatio(list){ const pos = list.filter(c=>c.color!=="blue").length; return list.length? pos/list.length : 0; }
function predominancePositive(list, N=8){ const lastN=list.slice(-N); const pct=positivesRatio(lastN); return {pct, ok:pct>=SOFT_PCT, strong:pct>=STRONG_PCT}; }
function consecutiveBlueCount(list){ let c=0; for(let i=list.length-1;i>=0;i--){ if(list[i].color==="blue") c++; else break; } return c; }
function countBBBSequences(colors, N=8){ const w=colors.slice(-N); let cnt=0, run=0; for(const c of w){ if(c==="blue"){ run++; if(run===3) cnt++; } else run=0; } return cnt; }
function lastPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="pink") return arr[i]; } return null; }
function lastPurpleOrPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color!=="blue") return arr[i]; } return null; }
function minutesSince(now, ts){ return (now-ts)/60000; }
function macroWindow40m(arr, now){ const from=now-(40*60*1000); return arr.filter(r=> typeof r.ts==="number" && r.ts>=from && r.ts<=now); }
function hasSurfWithin(arr){ let run=0; for(const r of arr){ if(r.color!=="blue"){ run++; if(run>=3) return true; } else run=0; } return false; }

function isSurfValidated(colors){ // 4+ positivas seguidas
  let run=0; for(let i=colors.length-1;i>=0;i--){ if(colors[i]!=="blue"){ run++; if(run>=4) return true; } else break; } return false;
}
function isSurfConstruction(colors){ // ≥50% positivas, até 2 azuis na janela 8
  const last8 = colors.slice(-8); let positives=0, blues=0;
  for(const c of last8){ if(c==="blue") blues++; else positives++; }
  if(blues>2) return false; return positives/Math.max(1,last8.length) >= 0.50;
}
function inPinkTimeWindow(nowTs, arr){
  const lp = lastPink(arr); if(!lp || !lp.ts) return false;
  const diff = Math.abs(minutesSince(nowTs, lp.ts));
  for(const w of TIME_WINDOWS_AFTER_PINK){ if(Math.abs(diff - w) <= TIME_TOLERANCE_MIN) return true; }
  return false;
}
function hasRecent100x(arr, k=COOLDOWN_AFTER_100X_CANDLES){
  const win = arr.slice(-k); return win.some(r=> r.color==="pink" && r.mult>=100);
}
function roseResetBooster(arr){
  const last = arr[arr.length-1], prev = arr[arr.length-2];
  if(last?.color==="pink" || prev?.color==="pink") return true;
  const lup = lastPurpleOrPink(arr);
  return !!(lup && lup.mult>=5); // velas altas atraem altas
}

/* Estratégias locais (micro) */
function detectStrategies(colors, predPct){
  const L=colors.length; if(L<3) return null;
  const isPos = c => c!=="blue";
  const a=colors[L-3], b=colors[L-2], c=colors[L-1];

  // SURF
  if(isPos(a) && isPos(b) && isPos(c)){
    let run=0; for(let i=L-1;i>=0;i--){ if(isPos(colors[i])) run++; else break; }
    if(run>=4) return {name:"surf 4+", gate:`${run} positivas seguidas ⇒ P (2x)`};
    if(run===3) return {name:"surf 3", gate:"3 positivas ⇒ P (2x)"};
  }
  // Pred forte + correção (fim da azul)
  if(predPct>=STRONG_PCT && c==="blue") return {name:"pred forte fim correção", gate:`Pred ${(predPct*100).toFixed(0)}% + azul ⇒ P (2x)`};
  // Xadrez / triplacor
  if(a==="blue" && b!=="blue" && c==="blue") return {name:"xadrez", gate:"B-P-B ⇒ P (2x)"};
  if(a==="blue" && b==="blue" && c!=="blue") return {name:"triplacor parcial", gate:"BB-P ⇒ repetir 2x"};
  if(L>=4 && colors.slice(-4).join("-")==="blue-blue-blue-purple") return {name:"triplacor", gate:"BBB-P ⇒ 2x"};

  return null;
}

/* Mini IA de contexto (n-grama) */
function ngramPositiveProb(colors, order){
  if(colors.length <= order) return null;
  const POS = new Set(["purple","pink"]);
  const window = colors.slice(-120);
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
function modelSuggest(colors){
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k);
    if(res && res.n>=3 && res.p>=0.45){ return {name:`modelo n-grama k=${k}`, gate:`IA: ${(res.p*100).toFixed(0)}% · n=${res.n}`}; }
  }
  return null;
}

/* ===================== Parâmetros ========================= */
const SOFT_PCT = 0.50;      // ≥50% permite operar (pague leve)
const STRONG_PCT = 0.60;    // ≥60% = pague forte
const HARD_PAUSE_BLUE_RUN = 3;               // pausa com 3 azuis seguidas
const COOLDOWN_AFTER_100X_CANDLES = 10;      // pausa pós 100x
const TIME_WINDOWS_AFTER_PINK = [5,7,10,20]; // minutos
const TIME_TOLERANCE_MIN = 2;

/* ===== Correção por blocos (17 velas) / Xadrez / Cooloff ===== */
function countBlueBlocks17(colors){
  const win = colors.slice(-17);
  let blocks=0, run=0;
  for(const c of win){
    if(c === "blue") run++;
    else { if(run>=1) blocks++; run=0; }
  }
  if(run>=1) blocks++;
  return blocks;
}
function isValidChess3(colors){
  const L = colors.length;
  if(L < 3) return false;
  const a = colors[L-3], b = colors[L-2], c = colors[L-1];
  const alt3 = (a!==b && b!==c && a===c); // B-P-B ou P-B-P
  return !!alt3;
}
let coolOffUntilIdx = null;
function isCoolingNow(lastIdx){
  if(coolOffUntilIdx == null) return false;
  if(lastIdx < coolOffUntilIdx) return true;
  coolOffUntilIdx = null;
  return false;
}

/* ===================== Estado ============================= */
let pending = null;
function clearPending(){ pending=null; martingaleTag && (martingaleTag.style.display="none"); setCardState({active:false, awaiting:false}); }
window.lastPauseMessage = null;

/* ===================== Motor ============================== */
function onNewCandle(arr){
  if(arr.length<2) return;
  renderHistory(arr);

  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const arr40 = macroWindow40m(arr, nowTs);

  const pred8 = predominancePositive(arr, 8);
  const blueRun = consecutiveBlueCount(arr);
  const colors = arr.map(r=>r.color);
  const bbbCount = countBBBSequences(colors, 8);
  const cooled = !hasRecent100x(arr, COOLDOWN_AFTER_100X_CANDLES);

  predStatus && (predStatus.textContent = `Predominância: ${(pred8.pct*100).toFixed(0)}%` + (pred8.strong?" · forte":""));
  blueRunPill && (blueRunPill.textContent = `Azuis seguidas: ${blueRun}`);
  engineStatus && (engineStatus.textContent = "operando");

  // ======== REGRAS DE BLOQUEIO / PAUSA POR BLOCOS (17) ========
  const blocks17 = countBlueBlocks17(colors);
  const predPct = pred8.pct, predOk = predPct >= SOFT_PCT, predStrong = predPct >= STRONG_PCT;

  // Bloqueio duro: 3 blocos ou mais
  if(blocks17 >= 3 || !cooled){
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub: !cooled ? "cooldown pós 100x" : "risco azul — aguardando"});
    if(window.lastPauseMessage !== ( !cooled ? "cooldown pós 100x" : "risco azul — aguardando")){
      addFeed && addFeed("warn", !cooled ? "cooldown pós 100x" : "risco azul — aguardando");
      window.lastPauseMessage = !cooled ? "cooldown pós 100x" : "risco azul — aguardando";
    }
    return;
  }

  // Pausa 1 vela quando 2 blocos + pred fraca
  const last = arr[arr.length-1];
  const lastIdx = last.idx;
  if(blocks17 === 2 && !predOk){
    if(coolOffUntilIdx == null) coolOffUntilIdx = lastIdx + 1;
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub:"risco azul — aguardando"});
    if(window.lastPauseMessage !== "risco azul — aguardando"){ addFeed && addFeed("warn","risco azul — aguardando"); window.lastPauseMessage = "risco azul — aguardando"; }
    return;
  }
  if(isCoolingNow(lastIdx)){
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub:"risco azul — aguardando"});
    return;
  }
  window.lastPauseMessage = null;

  // ======== FECHAR SINAIS ANTERIORES (WIN/LOSS) ========
  if(pending && typeof pending.enterAtIdx === "number"){
    const justClosed = arr[arr.length-1];
    if(justClosed.idx === pending.enterAtIdx){
      const win = justClosed.mult >= 2.0;
      if(win){
        stats.wins++; stats.streak++; stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
        if(pending.stage===0) stats.normalWins++; else if(pending.stage===1) stats.g1Wins++; else if(pending.stage===2) stats.g2Wins++;
        store.set(stats); syncStatsUI(); addFeed("ok", pending.stage?`WIN 2x (G${pending.stage})`:"WIN 2x"); clearPending();
      } else {
        // Falhou: avaliar Gale com regras novas
        const lastWasBlue = justClosed.color === 'blue';
        const chessOK = isValidChess3(colors);
        const canGaleContext = predStrong && (blocks17 <= 1);

        if(pending.stage===0){
          if((!lastWasBlue || chessOK) && canGaleContext){
            pending.stage=1; pending.enterAtIdx=justClosed.idx+1; martingaleTag && (martingaleTag.style.display="inline-block");
            setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${justClosed.mult.toFixed(2)}x)`});
            addFeed("warn","Ativando G1 (pague forte, ≤1 correção)");
          } else {
            pending.stage='G1_WAIT'; pending.enterAtIdx=null;
            setCardState({active:false, awaiting:true, title:"aguardando estabilidade G1", sub:"risco azul — aguardando"});
            addFeed("warn", lastWasBlue && !chessOK ? "G1 bloqueado — azul na frente" : "G1 aguardando — risco azul / pague insuficiente");
          }
        } else if(pending.stage===1){
          if((!lastWasBlue || chessOK) && canGaleContext){
            pending.stage=2; pending.enterAtIdx=justClosed.idx+1;
            setCardState({active:true, title:"Chance de 2x G2", sub:`entrar após (${justClosed.mult.toFixed(2)}x)`});
            addFeed("warn","Ativando G2 (pague forte, ≤1 correção)");
          } else {
            pending.stage='G2_WAIT'; pending.enterAtIdx=null;
            setCardState({active:false, awaiting:true, title:"aguardando estabilidade G2", sub:"risco azul — aguardando"});
            addFeed("warn", lastWasBlue && !chessOK ? "G2 bloqueado — azul na frente" : "G2 aguardando — risco azul / pague insuficiente");
          }
        } else if(pending.stage===2){
          stats.losses++; stats.streak=0; store.set(stats); syncStatsUI(); addFeed("err","LOSS 2x (G2)"); clearPending();
        }
      }
    }
  }

  // ======== RETOMADAS G1/G2 (se estavam aguardando) ========
  if(pending && pending.stage==='G1_WAIT'){
    const macroOk = inPinkTimeWindow(nowTs, arr40) || roseResetBooster(arr40) || hasSurfWithin(arr40);
    const canG1Context = predStrong && (blocks17 <= 1) && macroOk;
    if(canG1Context){
      pending.stage=1; pending.enterAtIdx=lastIdx+1; martingaleTag && (martingaleTag.style.display="inline-block");
      setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${last.mult.toFixed(2)}x)`});
      addFeed("warn","Retomando G1 (macro ok)");
      return;
    }
  }
  if(pending && pending.stage==='G2_WAIT'){
    const macroOk = inPinkTimeWindow(nowTs, arr40) || roseResetBooster(arr40) || hasSurfWithin(arr40);
    const byRule = detectStrategies(colors, pred8.pct) || modelSuggest(colors);
    const canG2Context = predStrong && (blocks17 <= 1) && macroOk && (byRule || macroOk);
    if(canG2Context){
      pending.stage=2; pending.enterAtIdx=lastIdx+1; martingaleTag && (martingaleTag.style.display="inline-block");
      setCardState({active:true, title:"Chance de 2x G2", sub:`entrar após (${last.mult.toFixed(2)}x)`});
      strategyTag && (strategyTag.textContent = "Estratégia: " + (byRule?byRule.name:"macro"));
      gateTag && (gateTag.textContent = "Gatilho: " + (byRule?byRule.gate:"tempo/rosa/surf (40m)"));
      addFeed("warn","SINAL 2x (G2) — estável");
      return;
    }
  }

  // ======== NOVO SINAL (G0) ========
  if(!pending){
    const suggestion = detectStrategies(colors, pred8.pct) || modelSuggest(colors);
    const macroOk = inPinkTimeWindow(nowTs, arr40) || roseResetBooster(arr40) || hasSurfWithin(arr40);

    // Anti-BBB micro (últimas 8)
    const blockCorrectionsMicro = countBBBSequences(colors, 8) >= 2;

    // Permissão por blocos (17) + pred
    const allowByBlocks = (blocks17 <= 1) || (blocks17 === 2 && predOk);
    const entryAllowed = predOk && !blockCorrectionsMicro && macroOk && allowByBlocks;

    // FAST-LANE: pague forte + (surf validado/construção ou reforços)
    const surfNow = isSurfValidated(colors) || isSurfConstruction(colors);
    const fastLane = predStrong && !blockCorrectionsMicro && (surfNow || roseResetBooster(arr) || inPinkTimeWindow(nowTs, arr));

    const lastMultTxt = last.mult.toFixed(2)+"x";

    if(fastLane){
      pending = { stage:0, enterAtIdx: last.idx+1, reason: "pague forte", strategy: surfNow?"Surf":"Reforços" };
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag && (strategyTag.textContent = "Estratégia: " + (surfNow?"Surf":"Reforços") + " · cenário forte");
      gateTag && (gateTag.textContent = "Gatilho: pague forte");
      addFeed("warn", `SINAL 2x (pague forte) — entrar após (${lastMultTxt})`);
      return;
    }

    if(entryAllowed && (suggestion || macroOk)){
      const usedName = suggestion? suggestion.name : "macro";
      const usedGate = suggestion? suggestion.gate : "tempo/rosa/surf (40m)";
      pending = { stage:0, enterAtIdx: last.idx+1, reason: usedGate, strategy: usedName };
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag && (strategyTag.textContent = "Estratégia: " + usedName + (predStrong?" · cenário forte":""));
      gateTag && (gateTag.textContent = "Gatilho: " + usedGate);
      addFeed("warn", `SINAL 2x (${usedName}) — entrar após (${lastMultTxt})`);
      return;
    } else {
      setCardState({title:"Chance de 2x", sub:"identificando padrão"});
      strategyTag && (strategyTag.textContent = "Estratégia: —");
      gateTag && (gateTag.textContent = "Gatilho: —");
    }
  }
}

/* ===================== Firebase Listener ================== */
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
      if(!Number.isNaN(d.getTime())) ts=d.getTime();
    }
    rows.push({ idx:i, mult, color, ts });
  }
  return rows;
}

(function init(){
  try{
    const app = firebase.initializeApp(firebaseConfig);
    if(liveStatus){
      liveStatus.textContent = "Conectado";
      liveStatus.style.background="rgba(34,197,94,.15)";
      liveStatus.style.color="#b9f5c7";
      liveStatus.style.borderColor="rgba(34,197,94,.35)";
    }
    const dbRef = app.database().ref("history/");
    dbRef.on('value',(snapshot)=>{
      const data = snapshot.val();
      const arr = toArrayFromHistory(data);
      if(!arr.length){ engineStatus && (engineStatus.textContent="sem dados"); return; }
      onNewCandle(arr);
    },(error)=>{
      if(liveStatus){
        liveStatus.textContent = "Erro: "+error.message;
        liveStatus.style.background="rgba(239,68,68,.15)";
        liveStatus.style.color="#ffd1d1";
      }
    });
  }catch(e){
    if(liveStatus){
      liveStatus.textContent="Falha ao iniciar Firebase";
      liveStatus.style.background="rgba(239,68,68,.15)";
      liveStatus.style.color="#ffd1d1";
    }
    console.error(e);
  }
})();

/* ===================== Anti-DevTools (leve) =============== */
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
