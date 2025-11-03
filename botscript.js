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

// ===================== Utils (MODIFICADO) =======================
function colorFrom(mult){ if(mult<2.0) return "blue"; if(mult<10.0) return "purple"; return "pink"; }
const isPos = (c) => c==="purple" || c==="pink";
function isPositiveColor(c){ return isPos(c); } // Helper para clareza

// [NOVO HELPER] Obtém as últimas N cores
function getLastNColors(arr, n){
  return arr.slice(-n).map(r=>r.color);
}

// [NOVO HELPER] Conta correções (azuis) nas últimas N velas
function countCorrections20(colorsLast20){
  return colorsLast20.filter(c=>c==="blue").length;
}

// [NOVO HELPER] Verifica se há K azuis consecutivas
function hasConsecutiveBlues(colorsLastN, k){
  let run=0;
  for(const c of colorsLastN){
    if(c==="blue") run++; else run=0;
    if(run>=k) return true;
  }
  return false;
}

// [NOVO HELPER] Predominância de positivas nas últimas N velas
function predominancePct(colorsLastN){
  const pos = colorsLastN.filter(isPositiveColor).length;
  return colorsLastN.length ? pos/colorsLastN.length : 0;
}

function positivesRatio(list){
  const pos = list.filter(isPositiveColor).length;
  return list.length ? pos/list.length : 0;
}
function predominancePositive(list, N=6){ // leitura micro do MOMENTO (últimas N velas) - MANTIDO
  const lastN = list.slice(-N);
  const pct = positivesRatio(lastN);
  return {pct, ok:pct>=SOFT_PCT, strong:pct>=STRONG_PCT}; 
}
function consecutiveBlueCount(list){
  let c=0; for(let i=list.length-1;i>=0;i--){ if(list[i].color==="blue") c++; else break; } return c;
}
function countBBBSequences(colors, N=12){ // correção pesada: blocos com ≥3 azuis seguidas
  // ...
  let cnt=0, run=0;
  for(let i=0;i<window.length;i++){
    if(window[i]==="blue"){ run++; if(run===3) cnt++; }
    else run=0; // <-- O reset do 'run' (sequência) para 0 aqui garante que apenas azuis consecutivos sejam contados como bloco.
  }
  return cnt; // se ≥2 na janela → bloqueio
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

// [NOVA FUNÇÃO] - Verifica se a última rosa caiu em uma coluna de borda (1 ou 5)
function pinkInEdgeColumn(arr, cols=5){
  const lp = lastPink(arr);
  if(!lp || lp.idx === undefined) return false;
  
  const pinkColIndex = (lp.idx) % cols;
  return (pinkColIndex === 0 || pinkColIndex === (cols - 1));
}

// [FUNÇÃO ATUALIZADA] - Inclui o filtro de coluna de borda
function macroConfirm(arr40, nowTs, fullArr){ // Adicionado fullArr
  return inPinkTimeWindow(nowTs, arr40) || 
         roseResetBooster(arr40) || 
         hasSurfWithin(arr40) ||
         pinkInEdgeColumn(fullArr, 5);
}

// [FUNÇÃO DE BLOQUEIO] - Bloqueio por Predominância Azul na Linha de 5 (Coluna) - MANTIDA
function check5LineBlock(arr, cols=5){
    const L = arr.length;
    if (L === 0) return false;

    const currentIdx = L - 1;
    const currentLineStartIdx = currentIdx - (currentIdx % cols);
    const line = arr.slice(currentLineStartIdx, currentLineStartIdx + cols);

    let blueCount = 0;
    let posCount = 0;

    for (const candle of line) {
        if (candle.color === "blue") {
            blueCount++;
        } else {
            posCount++;
        }
    }

    if (blueCount > posCount) {
        window.lastBlockReason = `Predominância de Azul na coluna, aguardando...`; 
        return true;
    }
    return false;
}

// ===================== Parâmetros (ajustados) =======================
const SOFT_PCT = 0.50;  // MANTIDO
const STRONG_PCT = 0.60; // ELEVADO para 60% conforme regra 2/4
const HARD_PAUSE_BLUE_RUN = 3; // MANTIDO
const TIME_WINDOWS_AFTER_PINK = [5,7,10,20]; // MANTIDO
const TIME_TOLERANCE_MIN = 2; // MANTIDO

// Variáveis de comunicação de bloqueio/pausa
window.lastBlockReason = null;
window.lastPauseMessage = null;
window.seguidinhaOn = false; // [NOVA VARIÁVEL] Modo Seguidinha
window.tripleCorrectionWatch = false; // [NOVA VARIÁVEL] Espera de 2 confirmações após tripla

// ===================== Estratégias baseadas no Ebook (AJUSTADAS) =======================
function inPinkTimeWindow(nowTs, arr){ // MANTIDA
  const lp = lastPink(arr);
  if(!lp || !lp.ts) return false;
  const diff = Math.abs(minutesSince(nowTs, lp.ts));
  for(const w of TIME_WINDOWS_AFTER_PINK){
    if(Math.abs(diff - w) <= TIME_TOLERANCE_MIN) return true;
  }
  return false;
}

function hasRecent100x(arr, k){ // DESATIVADA
  return false; 
}

function roseResetBooster(arr){ // AJUSTADA para ser mais sensível
  const last = arr[arr.length-1];
  const prev = arr[arr.length-2];
  if(last && last.color==="pink") return true;
  if(prev && prev.color==="pink") return true;
  const lup = lastPurpleOrPink(arr);
  // Reduzido o multiplicador para ser mais sensível
  return !!(lup && lup.mult>=3.5); 
}

// [FUNÇÃO DE DETECÇÃO DE PADRÕES] (AJUSTADA SENSIBILIDADE)
function detectStrategies(colors, predPct){ 
  const L=colors.length; if(L<3) return null;
  const a=colors[L-3], b=colors[L-2], c=colors[L-1];

  // Regra de Bloqueio - MANTIDA (embora a lógica principal use a correção 20)
  if(L >= 8 && colors[L-2] === "blue" && colors[L-4] === "blue"){ 
    let posRunLen = 0; for(let i=L-3; i>=0; i--){ if(isPositiveColor(colors[i])) posRunLen++; else break; }
    if(posRunLen >= 2 && posRunLen <= 4){ 
      let prevBlueRunLen = 0; let startIdx = L - 3 - posRunLen;
      for(let i=startIdx; i>=0; i--){ if(colors[i] === "blue") prevBlueRunLen++; else break; }
      if(prevBlueRunLen >= 3 && prevBlueRunLen <= 4){
        // window.lastBlockReason = `BLOQUEIO: ${prevBlueRunLen}B - ${posRunLen}P - 2B na ponta.`;
        return null;
      }
    }
  }

  // SURF: 3+ positivas (sensível)
  if(L >= 3 && isPositiveColor(a) && isPositiveColor(b) && isPositiveColor(c)){
    let posRunLen = 0; for(let i=L-1;i>=0;i--){ if(isPositiveColor(colors[i])) posRunLen++; else break; }
    if(posRunLen >= 4) return {name:"surfing-4+", gate:`Sequência de ${posRunLen} positivas ⇒ P (2x)`};
    if(posRunLen === 3) return {name:"sequência roxas 3", gate:"3 positivas ⇒ P (2x)"};
  }

  // SURF ALTERNADO: 3P-1B-3P (sensível)
  if(L >= 7){
    const last7 = colors.slice(-7);
    if(isPositiveColor(last7[0]) && isPositiveColor(last7[1]) && isPositiveColor(last7[2]) && 
       last7[3]==="blue" && 
       isPositiveColor(last7[4]) && isPositiveColor(last7[5]) && isPositiveColor(last7[6])){
      return {name:"surf-alternado", gate:"3P-1B-3P ⇒ P (2x)"};
    }
  }

  // Predominância forte + azul na ponta (fim de correção)
  if(predPct >= STRONG_PCT && c === "blue"){
    return {name:"predominancia-forte", gate:`Pred ${(predPct*100).toFixed(0)}% + Azul ⇒ P (2x)`};
  }

  // Xadrez simples (sensível)
  if(a==="blue" && isPositiveColor(b) && c==="blue") return {name:"xadrez", gate:"B-P-B ⇒ P (2x)"};
  if(b==="pink" && c==="blue") return {name:"pós-rosa xadrez", gate:"Rosa→Azul ⇒ P (2x)"};
  if(L>=4 && colors.slice(-4).join("-")==="blue-blue-blue-purple") return {name:"triplacor", gate:"BBB-P ⇒ 2x"};
  if(a==="blue" && b==="blue" && isPositiveColor(c)) return {name:"triplacor parcial", gate:"BB-P ⇒ repetir 2x"};

  return null;
}

// [FUNÇÃO ATUALIZADA] - Aceita windowSize
function ngramPositiveProb(colors, order, windowSize=120){ // MANTIDA
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

// [FUNÇÃO REPETIÇÃO] - Estratégia de Repetição (W17, W8) - AJUSTADA SENSIBILIDADE
function detectRepetitionStrategy(colors){
  // Check window size 20 (substitui 17)
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k, 20); // Usa janela de 20
    if(res && res.n >= 1 && res.p >= 0.70){ // Reduzida exigência para 70%
      return {name:`rep_cores k=${k} (W20)`, gate:`Repetição (20 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  // Check window size 8
  for(const k of [3,2]){
    const res = ngramPositiveProb(colors, k, 8);
    if(res && res.n >= 1 && res.p >= 0.90){ // Reduzida exigência para 90%
      return {name:`rep_cores k=${k} (W8)`, gate:`Repetição (8 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}

function modelSuggest(colors){ // AJUSTADA SENSIBILIDADE
  // Esta é a IA geral (janela 120)
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k, 120); 
    if(res && res.n>=2 && res.p>=0.40){ // Reduzido n-min para 2 e p-min para 40%
      return {name:`modelo n-grama k=${k}`, gate:`IA: P(positiva|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}

// [FUNÇÃO DE CONSOLIDAÇÃO DE ESTRATÉGIA]
function getStrategyAndGate(colors, arr40, arr, pred20Pct, allowMacro = true){
  let suggestion = detectStrategies(colors, pred20Pct) || 
                   detectRepetitionStrategy(colors) || 
                   modelSuggest(colors); 
  
  const macroOk = macroConfirm(arr40, arr[arr.length-1]?.ts || Date.now(), arr);

  if(suggestion || (allowMacro && macroOk && pred20Pct >= SOFT_PCT)){
    const usedName = suggestion ? suggestion.name : "macro";
    const usedGate = suggestion ? suggestion.gate : "tempo/rosa/surf/coluna (40m)";
    return { name: usedName, gate: usedGate, suggestion };
  }
  return null;
}

function hasStrongStrategy(colors, pred20Pct, arr40, arr){
    // Verifica se há sugestão de padrão (exceto 'macro')
    const analysis = getStrategyAndGate(colors, arr40, arr, pred20Pct, false); 
    if (analysis && analysis.name !== "macro") return true;

    // Se a macro for forte, pode ser considerada forte em alguns contextos.
    // Usaremos a análise de padrão (suggestion) como o principal critério de "estratégia forte".
    return !!analysis;
}


// ===================== Motor (REESCRITO) =======================
let pending = null;
function clearPending(){ 
  pending=null; 
  martingaleTag.style.display="none"; 
  setCardState({active:false, awaiting:false}); 
}

function onNewCandle(arr){
  if(arr.length<2) return;
  renderHistory(arr);

  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const arr40 = macroWindow40m(arr, nowTs);
  const colors = arr.map(r=>r.color);
  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";
  
  // LEITURAS NOVAS OBRIGATÓRIAS (20 velas)
  const colorsLast20 = getLastNColors(arr, 20);
  const corr20 = countCorrections20(colorsLast20); // Correções (azuis) nas últimas 20
  const pred20 = predominancePct(colorsLast20); // % de positivas nas últimas 20
  const pred8 = predominancePositive(arr, 6); // Mantido para UI e pred. micro 
  const strongStrategy = hasStrongStrategy(colors, pred20, arr40, arr);
  const redDuplo = hasConsecutiveBlues(colorsLast20, 2);
  const redTriplo = hasConsecutiveBlues(colorsLast20, 3);
  
  const blueCount20 = corr20;
  const posCount20 = 20 - corr20;

  const blueRun = consecutiveBlueCount(arr);

  predStatus.textContent = `Predominância (20): ${(pred20*100).toFixed(0)}% · Azuis: ${corr20}`;
  blueRunPill.textContent = `Azuis seguidas: ${blueRun}` + (window.seguidinhaOn ? " · SEGUIDINHA" : "");
  
  // ================= LÓGICA DE SEGUIDINHA AGRESSIVA =================
  const singleCorrectionDominant = (corr20 <= 1) && (posCount20 > blueCount20);
  const correctionsDominating = blueCount20 > posCount20;
  
  // Ativação/Desativação de Seguidinha
  if (correctionsDominating || redTriplo) {
    window.seguidinhaOn = false;
    // Se vinha de tripla e agora desliga, reinicia o watch
    if(redTriplo) window.tripleCorrectionWatch = true; 
  } else if (singleCorrectionDominant) {
    if(!window.tripleCorrectionWatch) {
      // Se não está em watch, ativa direto com single correction dominante
      window.seguidinhaOn = true;
    } else if (isPositiveColor(last.color) && colors.length>=2 && isPositiveColor(colors[colors.length-2])) {
      // Após o watch, exige 2 positivas consecutivas para confirmar a virada e ativar
      window.tripleCorrectionWatch = false;
      window.seguidinhaOn = true;
      addFeed("info", "Seguidinha ativada: 2 confirmações pós-tripla.");
    }
  }

  // ================= PROCESSAMENTO DE FIM DE SINAL (WIN/LOSS/GALE) =================
  if(pending && typeof pending.enterAtIdx === "number" && last.idx === pending.enterAtIdx){
    const win = last.mult >= 2.0;
    
    if(win){
      // LÓGICA DE WIN - MANTIDA
      stats.wins++; stats.streak++; stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      if(pending.stage===0) stats.normalWins++;
      else if(pending.stage===1) stats.g1Wins++;
      else if(pending.stage===2) stats.g2Wins++;
      syncStatsUI(); store.set(stats);
      const label = pending.stage===0 ? "WIN 2x" : `WIN 2x (G${pending.stage})`;
      addFeed("ok", label); topSlide("WIN 2x", true); 
      clearPending(); 
    } else {
      // LÓGICA DE LOSS E TRANSIÇÃO PARA GALE/ESPERA - REESCRITA
      
      const nextAnalysis = getStrategyAndGate(colors, arr40, arr, pred20, false); // Só busca estratégia/padrão

      if(pending.stage===0){
          let g1Allowed = false;
          let reason;

          if(window.seguidinhaOn && corr20 <= 1){
            // Regra 3: G1 direto durante seguidinha
            g1Allowed = true;
            reason = `Seguidinha: 1 correção.`;
          } else if(corr20 <= 1){
            // Regra 4/G1: 0 ou 1 correção -> entra direto
            g1Allowed = true;
            reason = `${corr20} correção(ões).`;
          } else if(corr20 === 2){
            // Regra 4/G1: 2 correções -> exige pred >= 60% OU estratégia forte
            g1Allowed = (pred20 >= 0.60) || strongStrategy;
            reason = g1Allowed ? `Predominância (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.` : "Aguardando Pred. 60%+ ou Estratégia Forte.";
          } else if(corr20 === 3){
            // Regra 4/G1: 3 correções -> aguarda 1 vela (G1_WAIT)
            g1Allowed = false; // Vai para espera
            reason = "Aguardando validação de mudança de padrão (3 correções).";
          } else {
            // Mais de 3 correções -> LOSS
            stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
            addFeed("err","LOSS 2x (Correção pesada)"); topSlide("LOSS 2x", false); clearPending();
            return;
          }

          if(g1Allowed){
            pending.stage=1; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G1", sub:`Gatilho: ${nextAnalysis?.name || 'G1 Direto'}`}); 
            addFeed("warn",`Ativando G1 (Motivo: ${reason})`);
          } else {
            pending.stage = 'G1_WAIT'; pending.enterAtIdx = null; 
            setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: reason});
            addFeed("warn", `G1 em espera.. (Motivo: ${reason})`);
          }
      } else if(pending.stage===1){
          // LÓGICA G2 (TOLERA +1 CORREÇÃO)
          let g2Allowed = false;
          let reason;

          if(corr20 <= 2){
            // Regra 4/G2: 0, 1 ou 2 correções -> entra direto
            g2Allowed = true;
            reason = `${corr20} correção(ões).`;
          } else if(corr20 === 3){
            // Regra 4/G2: 3 correções -> exige pred >= 60% OU estratégia forte
            g2Allowed = (pred20 >= 0.60) || strongStrategy;
            reason = g2Allowed ? `Predominância (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.` : "Aguardando Pred. 60%+ ou Estratégia Forte.";
          } else if(corr20 === 4){
            // Regra 4/G2: 4 correções -> aguarda 1 vela (G2_WAIT)
            g2Allowed = false; // Vai para espera
            reason = "Aguardando validação de mudança de padrão (4 correções).";
          } else {
            // Mais de 4 correções -> LOSS
            stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
            addFeed("err","LOSS 2x (G2 falhou - Correção pesada)"); topSlide("LOSS 2x (G2)", false); clearPending();
            return;
          }

          if(g2Allowed){ 
             pending.stage=2; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
             setCardState({active:true, title:"Chance de 2x G2", sub:`Gatilho: ${nextAnalysis?.name || 'G2 Direto'}`});
             strategyTag.textContent = "Estratégia: " + (nextAnalysis?.name || 'G2 Direto');
             gateTag.textContent = "Gatilho: " + (nextAnalysis?.gate || reason);
             addFeed("warn","SINAL 2x (G2)");
          } else {
            pending.stage = 'G2_WAIT'; pending.enterAtIdx = null; 
            setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
            addFeed("warn", `G2 em espera.. (Motivo: ${reason})`);
          }
      } else if(pending.stage===2){
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G2 falhou)"); topSlide("LOSS 2x (G2)", false); clearPending();
      }
    }
    return;
  }
  
  // ================= BLOQUEIOS E PAUSAS GERAIS =================
  // A lógica de bloqueio agora prioriza a contagem de correções (corr20)
  const line5Block = check5LineBlock(arr);
  const weakPred20 = pred20 < SOFT_PCT; // Predominância fraca nas 20
  const heavyCorrection = corr20 > 4; // Mais de 4 correções nas 20

  const hardPaused = heavyCorrection || weakPred20 || line5Block;
  engineStatus.textContent = hardPaused ? "aguardando" : (window.seguidinhaOn ? "Seguidinha ON" : "operando");

  if(hardPaused){
    // Se estivermos em G1/G2_WAIT, MANTEMOS o estado de espera e retornamos (não resetamos).
    if(pending && (pending.stage === 'G1_WAIT' || pending.stage === 'G2_WAIT')) return;
    
    let sub = heavyCorrection ? `Correção pesada: ${corr20} azuis (Max 4)` : 
              weakPred20 ? `Aguardando Predominância > ${(SOFT_PCT*100).toFixed(0)}% (20 velas)` : 
              line5Block ? lastBlockReason : "aguarde uma possibilidade";
              
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub});
    const pauseMsg = sub;
    if (window.lastPauseMessage !== pauseMsg) { addFeed("warn", pauseMsg); window.lastPauseMessage = pauseMsg; }
    
    return;
  }
  window.lastPauseMessage = null; 

  // ================= PROCESSAMENTO DE ESPERA (GALE) =================
  if(pending && (pending.stage==='G1_WAIT' || pending.stage==='G2_WAIT')){
     
     const nextAnalysis = getStrategyAndGate(colors, arr40, arr, pred20, false);
     const strongStrategyFound = !!nextAnalysis;
     
     let transitioned = false; 

     if(pending.stage==='G1_WAIT'){
        let g1Allowed = false;
        let reason;

        if(corr20 <= 1){
          // Melhoria de 2 para 1 ou 0 correções -> entra direto
          g1Allowed = true;
          reason = `Correção melhorou para ${corr20}.`;
        } else if(corr20 === 2){
          // Ainda com 2 correções -> exige pred >= 60% OU estratégia forte
          g1Allowed = (pred20 >= 0.60) || strongStrategyFound;
          reason = g1Allowed ? `Predominância (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.` : "Aguardando Pred. 60%+ ou Estratégia Forte.";
        } else {
          // Se não melhorou nem atingiu critérios -> mantém espera
          reason = `Ainda com ${corr20} correções ou sem critério forte.`;
        }
        
        if(g1Allowed){
            pending.stage=1; 
            pending.enterAtIdx=last.idx + 1; 
            martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G1", sub:`Gatilho: ${nextAnalysis?.name || 'G1 Direto'}`}); 
            addFeed("warn",`SINAL 2x (G1) — entrar após (${lastMultTxt})`);
            transitioned = true; 
        } else {
             setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: reason});
        }
    } 
    else if(pending.stage==='G2_WAIT'){
        let g2Allowed = false;
        let reason;

        if(corr20 <= 2){
          // Melhoria para 2 ou menos correções -> entra direto
          g2Allowed = true;
          reason = `Correção melhorou para ${corr20}.`;
        } else if(corr20 === 3){
          // Ainda com 3 correções -> exige pred >= 60% OU estratégia forte
          g2Allowed = (pred20 >= 0.60) || strongStrategyFound;
          reason = g2Allowed ? `Predominância (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.` : "Aguardando Pred. 60%+ ou Estratégia Forte.";
        } else {
          // Se não melhorou nem atingiu critérios -> mantém espera
          reason = `Ainda com ${corr20} correções ou sem critério forte.`;
        }

        if(g2Allowed){
            pending.stage=2; 
            pending.enterAtIdx=last.idx + 1; 
            martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G2", sub:`Gatilho: ${nextAnalysis?.name || 'G2 Direto'}`});
            strategyTag.textContent = "Estratégia: " + (nextAnalysis?.name || 'G2 Direto');
            gateTag.textContent = "Gatilho: " + (nextAnalysis?.gate || reason);
            addFeed("warn",`SINAL 2x (G2) — entrar após (${lastMultTxt})`);
            transitioned = true; 
        } else {
            setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
        }
    }
    
    return;
  }
  
  // ================= NOVO SINAL (G0) =================
  if(!pending){
    const analysis = getStrategyAndGate(colors, arr40, arr, pred20, true);
    
    let entryAllowed = false;
    let entryReason = "identificando padrão";

    if(corr20 <= 1){
        // Regra 2: 0 ou 1 correção -> entra imediatamente
        entryAllowed = true;
        entryReason = `${corr20} correção(ões).`;
    } else if(corr20 === 2){
        // Regra 2: 2 correções -> exige pred >= 60% OU estratégia forte
        entryAllowed = (pred20 >= 0.60) || strongStrategy;
        entryReason = entryAllowed ? `Predominância (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.` : "2 correções, aguardando critério forte.";
    } else if(corr20 === 3){
        // Regra 2: 3 correções -> não entra agora (pausa para reavaliação)
        // Isso é tratado no bloco de hardPaused, mas reforçamos a não-entrada aqui
        entryAllowed = false;
        entryReason = "3 correções, aguardando reavaliação.";
    } else {
        // Mais de 3 correções -> não entra
        entryAllowed = false;
        entryReason = "Mais de 3 correções.";
    }
    
    // É obrigatório ter algum gatilho (analysis) para entrar.
    if(entryAllowed && analysis){
      
      pending = { 
        stage: 0, 
        enterAtIdx: last.idx+1, 
        reason: analysis.gate, 
        strategy: analysis.name,
      };

      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + analysis.name + (window.seguidinhaOn ? " · SEGUIDINHA" : (pred20>=0.60?" · cenário forte":""));
      gateTag.textContent = "Gatilho: " + analysis.gate;
      addFeed("warn", `SINAL 2x (${analysis.name}) — entrar após (${lastMultTxt})`);
      return;
    } else {
      let subText = entryAllowed ? "Nenhuma estratégia detectada." : `Bloqueio: ${entryReason}`;
      setCardState({active:false, awaiting:false, title:"Chance de 2x", sub: subText});
      strategyTag.textContent = "Estratégia: —";
      gateTag.textContent = "Gatilho: —";
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
    // Removido o filtro 'colorFrom(mult)' para garantir que o color do DB seja usado se existir.
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
