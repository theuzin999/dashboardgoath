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

// [NOVO HELPER] Obtém as últimas N cores
function getLastNColors(arr, n){
  return arr.slice(-n).map(r=>r.color);
}

// [NOVO HELPER OBRIGATÓRIO] Retorna a maior sequência de azul dentro das 20
function getMaxBlueStreak20(colorsLast20){
  let maxStreak = 0;
  let currentStreak = 0;
  for(const c of colorsLast20){
    if(c==="blue") {
      currentStreak++;
    } else {
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 0;
    }
  }
  return Math.max(maxStreak, currentStreak); // Considera o streak que termina no final do array
}

// [NOVO HELPER REFINADO] Retorna o MAX streak de azuis das ÚLTIMAS 3 correções/eventos de azul.
function getLastThreeCorrectionsMaxStreak(colors){
    const correctionStreaks = [];
    let streakLength = 0;
    
    // Itera para trás para encontrar os eventos de correção mais recentes
    for (let i = colors.length - 1; i >= 0; i--) {
        if (colors[i] === "blue") {
            streakLength++;
        } else {
            // Fim de uma sequência de azul (evento de correção)
            if (streakLength > 0) {
                correctionStreaks.push(streakLength);
                if (correctionStreaks.length >= 3) break; // Só precisamos das últimas 3
            }
            streakLength = 0;
        }
    }
    // Se a lista termina em azul, a sequência atual é o evento de correção mais recente
    if (streakLength > 0 && correctionStreaks.length < 3) {
        correctionStreaks.push(streakLength);
    }

    if (correctionStreaks.length < 3) {
        // Não há histórico suficiente para avaliar 3 correções, permite-se (retorna 0 para passar no <=2)
        return 0; 
    }

    // Retorna o valor máximo entre as 3 últimas sequências de correção.
    return Math.max(...correctionStreaks.slice(0, 3));
}

// [NOVO HELPER OBRIGATÓRIO] Predominância de positivas nas últimas N velas
function predominancePct(colorsLastN){
  const pos = colorsLastN.filter(isPositiveColor).length;
  return colorsLastN.length ? pos/colorsLastN.length : 0;
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

function detectStrategies(colors, pred20Pct){ 
  const L=colors.length; if(L<3) return null;
  const a=colors[L-3], b=colors[L-2], c=colors[L-1];
  
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
  if(pred20Pct >= STRONG_PCT && c === "blue"){
    return {name:"predominancia-forte", gate:`Pred ${(pred20Pct*100).toFixed(0)}% + Azul ⇒ P (2x)`};
  }

  // Xadrez simples (sensível)
  if(a==="blue" && isPositiveColor(b) && c==="blue") return {name:"xadrez", gate:"B-P-B ⇒ P (2x)"};
  if(b==="pink" && c==="blue") return {name:"pós-rosa xadrez", gate:"Rosa→Azul ⇒ P (2x)"};
  if(L>=4 && colors.slice(-4).join("-")==="blue-blue-blue-purple") return {name:"triplacor", gate:"BBB-P ⇒ 2x"};
  if(a==="blue" && b==="blue" && isPositiveColor(c)) return {name:"triplacor parcial", gate:"BB-P ⇒ repetir 2x"};

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
  // Check window size 20
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k, 20); 
    if(res && res.n >= 1 && res.p >= 0.70){ 
      return {name:`rep_cores k=${k} (W20)`, gate:`Repetição (20 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  // Check window size 8
  for(const k of [3,2]){
    const res = ngramPositiveProb(colors, k, 8);
    if(res && res.n >= 1 && res.p >= 0.90){ 
      return {name:`rep_cores k=${k} (W8)`, gate:`Repetição (8 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}

function modelSuggest(colors){ 
  // Esta é a IA geral (janela 120)
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k, 120); 
    if(res && res.n>=2 && res.p>=0.40){ 
      return {name:`modelo n-grama k=${k}`, gate:`IA: P(positiva|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}

function getStrategyAndGate(colors, arr40, arr, pred20Pct, allowMacro = true){
  let suggestion = detectStrategies(colors, pred20Pct) || 
                   detectRepetitionStrategy(colors) || 
                   modelSuggest(colors); 
  
  const macroOk = macroConfirm(arr40, arr[arr.length-1]?.ts || Date.now(), arr);
  
  const isStrongStrategy = !!suggestion; 

  if(isStrongStrategy || (allowMacro && macroOk && pred20Pct >= SOFT_PCT)){
    const usedName = isStrongStrategy ? suggestion.name : "macro";
    const usedGate = isStrongStrategy ? suggestion.gate : "tempo/rosa/surf/coluna (40m)";
    return { name: usedName, gate: usedGate, suggestion, isStrongStrategy };
  }
  return null;
}


// ===================== Motor (REESCRITO COM NOVA CORREÇÃO OFICIAL E BLOQUEIO G2/Corr2) =======================
let pending = null;
function clearPending(){ 
  pending=null; 
  martingaleTag.style.display="none"; 
  setCardState({active:false, awaiting:false}); 
}

function onNewCandle(arr){
  if(arr.length<20) return; 
  renderHistory(arr);

  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const arr40 = macroWindow40m(arr, nowTs);
  const colors = arr.map(r=>r.color);
  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";
  
  // LEITURAS OBRIGATÓRIAS (20 velas)
  const colorsLast20 = getLastNColors(arr, 20);
  const pred20 = predominancePct(colorsLast20); // % de positivas nas últimas 20
  
  // CORREÇÃO OFICIAL: MAIOR STREAK DE AZUIS NAS 20
  const corr20 = getMaxBlueStreak20(colorsLast20); 

  const blueRun = consecutiveBlueCount(arr); // Seguidas de AGORA
  const pred20Strong = pred20 >= STRONG_PCT; // 60%
  
  const analysis = getStrategyAndGate(colors, arr40, arr, pred20, true);
  const strongStrategyActive = analysis && analysis.isStrongStrategy; 

  predStatus.textContent = `Predominância (20): ${(pred20*100).toFixed(0)}% · Max Streak: ${corr20}`;
  blueRunPill.textContent = `Azuis seguidas: ${blueRun}` + (window.seguidinhaOn ? " · SEGUIDINHA ON" : "");
  
  // ================= LÓGICA DE SEGUIDINHA AGRESSIVA (Regra 3 - MAIS REFINADA) =================
  const maxStreakLastThree = getLastThreeCorrectionsMaxStreak(colors);
  const singleCorrectionDominant = (corr20 === 1);
  const canDoSeguidinhaByHistory = maxStreakLastThree <= 2; // True se TODAS as últimas 3 correções foram <= 2

  // Ação: Ativação
  if (singleCorrectionDominant && canDoSeguidinhaByHistory) {
      if (!window.seguidinhaOn) addFeed("info", `Seguidinha ativada: Corr. Oficial (${corr20}) OK e Histórico de Correções Max: ${maxStreakLastThree} (OK).`);
      window.seguidinhaOn = true;
  } else {
      // Ação: Desativação/Bloqueio
      if (window.seguidinhaOn) {
         let reason = singleCorrectionDominant ? 
                        `Histórico de Correção (${maxStreakLastThree}) alto, desativando.` : 
                        `Correção Oficial (${corr20}) > 1, desativando.`;
         addFeed("info", `Seguidinha desativada: ${reason}`);
      }
      window.seguidinhaOn = false;
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
      return;
    } 
    
    // LÓGICA DE LOSS E TRANSIÇÃO PARA GALE/ESPERA
    
    const nextAnalysis = getStrategyAndGate(colors, arr40, arr, pred20, false); 
    const nextStrongStrategy = nextAnalysis && nextAnalysis.isStrongStrategy; 

    if(pending.stage===0){
        let g1Action = 'LOSS'; 
        let reason;

        // Regra 3 (Seguidinha) / Regra 4 (G1)
        if(window.seguidinhaOn && corr20 <= 1){
            g1Action = 'GALE'; reason = `Seguidinha ON (Correção ≤ 1).`;
        } else if(corr20 <= 1){
            g1Action = 'GALE'; reason = `Correção Oficial (${corr20}) OK.`;
        } else if(corr20 === 2){
            if(pred20Strong || nextStrongStrategy){
                g1Action = 'GALE'; reason = `Corr. 2, mas Pred. Strong (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.`;
            } else {
                g1Action = 'WAIT'; reason = "Corr. 2: aguardando Pred. 60%+ ou Estratégia Forte.";
            }
        } else if(corr20 === 3){
            g1Action = 'WAIT'; reason = "Corr. 3: aguardando 1 vela para validar mudança de padrão.";
        } else {
            g1Action = 'LOSS'; reason = `Correção Oficial (${corr20}) muito alta.`;
        }
        
        if(g1Action === 'GALE'){
          pending.stage=1; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
          setCardState({active:true, title:"Chance de 2x G1", sub:`Gatilho: ${nextAnalysis?.name || 'G1 Direto'}`}); 
          addFeed("warn",`Ativando G1 (Motivo: ${reason})`);
        } else if (g1Action === 'WAIT'){
          pending.stage = 'G1_WAIT'; pending.enterAtIdx = null; 
          setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: reason});
          addFeed("warn", `G1 em espera.. (Motivo: ${reason})`);
        } else {
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G0)"); topSlide("LOSS 2x", false); clearPending();
        }
    } else if(pending.stage===1){
        // LÓGICA G2 - APLICANDO BLOQUEIO RÍGIDO DO corr20=2
        let g2Action = 'LOSS'; 
        let reason;
        
        if(corr20 <= 1){
          g2Action = 'GALE'; reason = `Correção Oficial (${corr20}) OK.`;
        } else if(corr20 === 2){
          // NUNCA PODE MANDAR G2 GALE DIRETO COM corr20=2 (Regra do usuário).
          if(pred20Strong || nextStrongStrategy){
              g2Action = 'WAIT'; reason = "Corr. 2: Bloqueio G2 Direto. Aguardando reavaliação (Pred. Strong ou Estratégia Forte).";
          } else {
              g2Action = 'LOSS'; reason = `Correção Oficial (${corr20}): não permite G2 sem critério forte.`;
          }
        } else if(corr20 === 3){
          if(pred20Strong || nextStrongStrategy){
              g2Action = 'GALE'; reason = `Corr. 3, mas Pred. Strong (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.`;
          } else {
              g2Action = 'WAIT'; reason = "Corr. 3: aguardando Pred. 60%+ ou Estratégia Forte.";
          }
        } else if(corr20 === 4){
          g2Action = 'WAIT'; reason = "Corr. 4: aguardando 1 vela para validar mudança de padrão.";
        } else {
          g2Action = 'LOSS'; reason = `Correção Oficial (${corr20}) muito alta.`;
        }

        if(g2Action === 'GALE'){ 
           pending.stage=2; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
           setCardState({active:true, title:"Chance de 2x G2", sub:`Gatilho: ${nextAnalysis?.name || 'G2 Direto'}`});
           strategyTag.textContent = "Estratégia: " + (nextAnalysis?.name || 'G2 Direto');
           gateTag.textContent = "Gatilho: " + reason;
           addFeed("warn","SINAL 2x (G2)");
        } else if (g2Action === 'WAIT'){
          pending.stage = 'G2_WAIT'; pending.enterAtIdx = null; 
          setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
          addFeed("warn", `G2 em espera.. (Motivo: ${reason})`);
        } else {
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G1 falhou)"); topSlide("LOSS 2x (G1)", false); clearPending();
        }
    } else if(pending.stage===2){
        stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
        addFeed("err","LOSS 2x (G2 falhou)"); topSlide("LOSS 2x (G2)", false); clearPending();
    }
    return;
  }
  
  // ================= BLOQUEIOS E PAUSAS GERAIS =================
  const line5Block = check5LineBlock(arr); 
  // Bloqueio Principal: Se a maior correção (Max Streak) for > 3, bloqueia G0
  const heavyCorrection = corr20 > 3; 

  const hardPaused = heavyCorrection || line5Block;
  engineStatus.textContent = hardPaused ? "aguardando" : (window.seguidinhaOn ? "Seguidinha ON" : "operando");

  if(hardPaused){
    if(pending && (pending.stage === 'G1_WAIT' || pending.stage === 'G2_WAIT')) return;
    
    let sub = heavyCorrection ? `Correção alta: Max Streak ${corr20} (>3) nas últimas 20` : 
              line5Block ? lastBlockReason : "aguarde uma possibilidade";
              
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub});
    const pauseMsg = sub;
    // Prevenção de spam
    if (window.lastPauseMessage !== pauseMsg) { addFeed("warn", pauseMsg); window.lastPauseMessage = pauseMsg; }
    
    return;
  }
  window.lastPauseMessage = null; 

  // ================= PROCESSAMENTO DE ESPERA (GALE) =================
  if(pending && (pending.stage==='G1_WAIT' || pending.stage==='G2_WAIT')){
     
     const nextAnalysis = getStrategyAndGate(colors, arr40, arr, pred20, false);
     const nextStrongStrategy = nextAnalysis && nextAnalysis.isStrongStrategy;
     
     if(pending.stage==='G1_WAIT'){
        let g1Allowed = false;
        let reason;

        // Regra 4/G1 de 'WAIT' para 'GALE'
        if(corr20 <= 1){
          g1Allowed = true; reason = `Correção melhorou para ${corr20}.`;
        } else if(corr20 === 2){
          g1Allowed = pred20Strong || nextStrongStrategy;
          reason = g1Allowed ? `Pred. Strong (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.` : "Aguardando Pred. 60%+ ou Estratégia Forte.";
        } else if(corr20 === 3){
           g1Allowed = false; reason = "Ainda com 3 de correção, mantendo espera.";
        } else {
          // Se piorou (ex: para 4), cancela o martingale
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G1 - Piorou)"); topSlide("LOSS 2x (G1)", false); clearPending();
          return;
        }
        
        if(g1Allowed){
            pending.stage=1; 
            pending.enterAtIdx=last.idx + 1; 
            martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G1", sub:`Gatilho: ${nextAnalysis?.name || 'G1 Direto'}`}); 
            addFeed("warn",`SINAL 2x (G1) — entrar após (${lastMultTxt})`);
        } else {
            setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: reason});
        }
    } 
    else if(pending.stage==='G2_WAIT'){
        let g2Allowed = false;
        let reason;

        // Regra 4/G2 de 'WAIT' para 'GALE' - corr20=2 deve manter o WAIT ou ir para LOSS
        if(corr20 <= 1){
          g2Allowed = true; reason = `Correção melhorou para ${corr20}.`;
        } else if(corr20 === 2){
            // Se estiver em WAIT, e o max streak é 2, deve permanecer em WAIT (não pode ir para GALE)
            g2Allowed = false; reason = "Corr. 2: Bloqueio G2 Direto. Mantendo espera.";
        } else if(corr20 === 3){
          g2Allowed = pred20Strong || nextStrongStrategy;
          reason = g2Allowed ? `Pred. Strong (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.` : "Ainda em 3, aguardando Pred. 60%+ ou Estratégia Forte.";
        } else if(corr20 === 4){
           g2Allowed = false; reason = "Ainda com 4 de correção, mantendo espera.";
        } else {
          // Se piorou (ex: para 5), cancela o martingale
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G2 - Piorou)"); topSlide("LOSS 2x (G2)", false); clearPending();
          return;
        }

        if(g2Allowed){
            pending.stage=2; 
            pending.enterAtIdx=last.idx + 1; 
            martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G2", sub:`Gatilho: ${nextAnalysis?.name || 'G2 Direto'}`});
            strategyTag.textContent = "Estratégia: " + (nextAnalysis?.name || 'G2 Direto');
            gateTag.textContent = "Gatilho: " + reason;
            addFeed("warn",`SINAL 2x (G2) — entrar após (${lastMultTxt})`);
        } else {
            setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
        }
    }
    
    return;
  }
  
  // ================= NOVO SINAL (G0) (Regra 2) =================
  if(!pending){
    if(!analysis) return; 

    let entryAllowed = false;
    let entryReason = "identificando padrão";

    if(corr20 <= 1){
        entryAllowed = true; entryReason = `Correção Oficial (${corr20}) OK.`;
    } else if(corr20 === 2){
        entryAllowed = pred20Strong || strongStrategyActive;
        entryReason = entryAllowed ? `Corr. 2, mas Pred. Strong (${(pred20*100).toFixed(0)}%) ou Estratégia Forte.` : "Corr. 2, aguardando critério forte.";
    } else if(corr20 === 3){
        entryAllowed = false; entryReason = "Corr. 3, aguardando reavaliação.";
    } else {
        entryAllowed = false; entryReason = "Corr. Oficial muito alta.";
    }
    
    if(entryAllowed){
      
      pending = { 
        stage: 0, 
        enterAtIdx: last.idx+1, 
        reason: analysis.gate, 
        strategy: analysis.name,
      };

      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + analysis.name + (window.seguidinhaOn ? " · SEGUIDINHA" : (pred20Strong?" · cenário forte":""));
      gateTag.textContent = "Gatilho: " + analysis.gate;
      addFeed("warn", `SINAL 2x (${analysis.name}) — entrar após (${lastMultTxt})`);
      return;
    } else {
      let subText = `Bloqueio G0: ${entryReason}`;
      setCardState({active:false, awaiting:false, title:"SINAL BLOQUEADO", sub: subText});
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
