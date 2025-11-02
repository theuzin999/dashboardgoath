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
function predominancePositive(list, N=8){ // leitura micro do MOMENTO (últimas 8 velas)
  const lastN = list.slice(-N);
  const pct = positivesRatio(lastN);
  return {pct, ok:pct>=SOFT_PCT, strong:pct>=STRONG_PCT};
}
function consecutiveBlueCount(list){
  let c=0; for(let i=list.length-1;i>=0;i--){ if(list[i].color==="blue") c++; else break; } return c;
}
function countBBBSequences(colors, N=8){ // correção pesada: blocos com ≥3 azuis seguidas
  const window = colors.slice(-N);
  let cnt=0, run=0;
  for(let i=0;i<window.length;i++){
    if(window[i]==="blue"){ run++; if(run===3) cnt++; }
    else run=0;
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
  // Requer que o 'idx' esteja presente no histórico
  if(!lp || lp.idx === undefined) return false;
  
  const pinkColIndex = (lp.idx) % cols;
  return (pinkColIndex === 0 || pinkColIndex === (cols - 1));
}

// [FUNÇÃO ATUALIZADA] - Inclui o filtro de coluna de borda
function macroConfirm(arr40, nowTs, fullArr){ // Adicionado fullArr
  // confirma por TEMPO ou ROSA reset ou SURF ativo ou ROSA NA BORDA
  return inPinkTimeWindow(nowTs, arr40) || 
         roseResetBooster(arr40) || 
         hasSurfWithin(arr40) ||
         pinkInEdgeColumn(fullArr, 5); // Adicionado novo filtro
}

// ===================== Parâmetros (ajustados pelo Ebook) =======================
const SOFT_PCT = 0.50;  // ≥50% = pague leve (pode operar se contexto permitir)
const STRONG_PCT = 0.60; // ≥60% = pague forte (libera até com correção leve) // alinhado com tua prática
const HARD_PAUSE_BLUE_RUN = 3; // ebook: após 3 azuis → parar e reavaliar (micro) // janela 8 velas: bloqueio extra com BBB≥2
// const COOLDOWN_AFTER_100X_CANDLES = 10; // REMOVIDO
const TIME_WINDOWS_AFTER_PINK = [5,7,10,20]; // ±2 min
const TIME_TOLERANCE_MIN = 2;

// Variáveis de comunicação de bloqueio/pausa
window.lastBlockReason = null;
window.lastPauseMessage = null;

// ===================== Estratégias baseadas no Ebook =======================
function inPinkTimeWindow(nowTs, arr){
  const lp = lastPink(arr);
  if(!lp || !lp.ts) return false;
  const diff = Math.abs(minutesSince(nowTs, lp.ts));
  // calcula proximidade do próximo alvo (mod 60 simples por leitura de relógio)
  for(const w of TIME_WINDOWS_AFTER_PINK){
    if(Math.abs(diff - w) <= TIME_TOLERANCE_MIN) return true;
  }
  return false;
}

function hasRecent100x(arr, k){
  // FUNÇÃO DESATIVADA CONFORME SOLICITADO
  return false; 
}

function roseResetBooster(arr){
  // Booster: rosa recente (últimas 2) ou última não-azul muito alta
  const last = arr[arr.length-1];
  const prev = arr[arr.length-2];
  if(last && last.color==="pink") return true;
  if(prev && prev.color==="pink") return true;
  const lup = lastPurpleOrPink(arr);
  return !!(lup && lup.mult>=5); // velas altas atraem altas
}

// [FUNÇÃO ATUALIZADA] - Inclui "Surf Alternado"
function detectStrategies(colors, predPct){ 
  const L=colors.length; if(L<3) return null;
  const isPos = (c) => c==="purple" || c==="pink";
  const a=colors[L-3], b=colors[L-2], c=colors[L-1];

  // BLOQUEIO: sequência com risco de repetição de quebra (anti flood de azuis)
  if(L >= 8 && colors[L-2] === "blue" && colors[L-4] === "blue"){ 
    let posRunLen = 0; for(let i=L-3; i>=0; i--){ if(isPos(colors[i])) posRunLen++; else break; }
    if(posRunLen >= 2 && posRunLen <= 4){ 
      let prevBlueRunLen = 0; let startIdx = L - 3 - posRunLen;
      for(let i=startIdx; i>=0; i--){ if(colors[i] === "blue") prevBlueRunLen++; else break; }
      if(prevBlueRunLen >= 3 && prevBlueRunLen <= 4){
        window.lastBlockReason = `BLOQUEIO: ${prevBlueRunLen}B - ${posRunLen}P - 2B na ponta.`;
        return null;
      }
    }
  }
  window.lastBlockReason = null;

  // SURF: 3+ positivas
  if(L >= 3 && isPos(a) && isPos(b) && isPos(c)){
    let posRunLen = 0; for(let i=L-1;i>=0;i--){ if(isPos(colors[i])) posRunLen++; else break; }
    if(posRunLen >= 4) return {name:"surfing-4+", gate:`Sequência de ${posRunLen} positivas ⇒ P (2x)`};
    if(posRunLen === 3) return {name:"sequência roxas 3", gate:"3 positivas ⇒ P (2x)"};
  }

  // [NOVO PADRÃO] SURF ALTERNADO: 3P-1B-3P
  if(L >= 7){
    const last7 = colors.slice(-7);
    if(isPos(last7[0]) && isPos(last7[1]) && isPos(last7[2]) && 
       last7[3]==="blue" && 
       isPos(last7[4]) && isPos(last7[5]) && isPos(last7[6])){
      return {name:"surf-alternado", gate:"3P-1B-3P ⇒ P (2x)"};
    }
  }

  // Predominância forte + azul na ponta (fim de correção)
  if(predPct >= STRONG_PCT && c === "blue"){
    return {name:"predominancia-forte", gate:`Pred ${(predPct*100).toFixed(0)}% + Azul ⇒ P (2x)`};
  }

  // Xadrez simples
  if(a==="blue" && b==="purple" && c==="blue") return {name:"xadrez", gate:"B-P-B ⇒ P (2x)"};
  if(b==="pink" && c==="blue") return {name:"pós-rosa xadrez", gate:"Rosa→Azul ⇒ P (2x)"};
  if(L>=4 && colors.slice(-4).join("-")==="blue-blue-blue-purple") return {name:"triplacor", gate:"BBB-P ⇒ 2x"};
  if(a==="blue" && b==="blue" && c==="purple") return {name:"triplacor parcial", gate:"BB-P ⇒ repetir 2x"};

  return null;
}

// [FUNÇÃO ATUALIZADA] - Aceita windowSize
function ngramPositiveProb(colors, order, windowSize=120){
  if(colors.length <= order) return null;
  const POS = new Set(["purple","pink"]);
  const window = colors.slice(-windowSize); // Janela de histórico (17, 8 ou 120)
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

// [NOVA FUNÇÃO] - Estratégia de Repetição (W17, W8)
function detectRepetitionStrategy(colors){
  // Check window size 17
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k, 17); // Usa janela de 17
    if(res && res.n >= 1 && res.p >= 0.75){ // Confiança alta (ex: 3 de 4, ou 1 de 1)
      return {name:`rep_cores k=${k} (W17)`, gate:`Repetição (17 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  // Check window size 8
  for(const k of [3,2]){ // k=4 é muito grande para janela 8
    const res = ngramPositiveProb(colors, k, 8); // Usa janela de 8
    if(res && res.n >= 1 && res.p >= 1.0){ // Exige 100% de acerto na janela micro
      return {name:`rep_cores k=${k} (W8)`, gate:`Repetição (8 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}

function modelSuggest(colors){
  // Esta é a IA geral (janela 120)
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k, 120); // Janela padrão longa
    if(res && res.n>=3 && res.p>=0.45){ 
      return {name:`modelo n-grama k=${k}`, gate:`IA: P(positiva|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}

// ===================== Motor =======================
let pending = null;
function clearPending(){ pending=null; martingaleTag.style.display="none"; setCardState({active:false, awaiting:false}); }

// [FUNÇÃO DO MOTOR TOTALMENTE ATUALIZADA E CORRIGIDA]
function onNewCandle(arr){
  if(arr.length<2) return;
  renderHistory(arr);

  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const arr40 = macroWindow40m(arr, nowTs);
  const colors = arr.map(r=>r.color);

  const pred8 = predominancePositive(arr, 8);
  const blueRun = consecutiveBlueCount(arr);
  const bbbCount = countBBBSequences(colors, 8); // Checa repetição de BBB na janela 8

  predStatus.textContent = `Predominância (8 velas): ${(pred8.pct*100).toFixed(0)}%` + (pred8.strong?" · forte":"");
  blueRunPill.textContent = `Azuis seguidas: ${blueRun}`;

  // Cooldown pós 100x REMOVIDO
  const cooled = true; 

  // Bloqueios de contexto (Alinhado com a nova lista)
  const blockCorrections = bbbCount>=2; // Trava se tiver 2 ou mais sequências BBB (repetição)
  const weakPred = !pred8.ok; // < 50%
  const hardPauseBlueRun = blueRun >= HARD_PAUSE_BLUE_RUN; // Trava se tiver 3+ azuis na ponta

  // Lógica de pausa (Cooldown 100x removido)
  const hardPaused = hardPauseBlueRun || blockCorrections || weakPred;
  engineStatus.textContent = hardPaused ? "aguardando" : "operando";

  //const awaitingStability = (blueRun>=2); // Conservador para retomar gales // [REMOVIDO, REGRA DO XADREZ SUBSTITUI]

  // ================= WIN/LOSS (fecha sinais anteriores) =================
  if(pending && typeof pending.enterAtIdx === "number"){
    const justClosed = arr[arr.length-1];
    
    if(justClosed.idx === pending.enterAtIdx){
      const win = justClosed.mult >= 2.0;
      
      if(win){
        // ... (lógica de WIN não muda) ...
        stats.wins++; stats.streak++; stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
        if(pending.stage===0) stats.normalWins++;
        else if(pending.stage===1) stats.g1Wins++;
        else if(pending.stage===2) stats.g2Wins++;
        syncStatsUI(); store.set(stats);
        const label = pending.stage===0 ? "WIN 2x" : `WIN 2x (G${pending.stage})`;
        addFeed("ok", label); topSlide("WIN 2x", true); clearPending();
      } else {
        // [NOVA LÓGICA DE GALE - REGRA DO XADREZ]
        const newSuggestion = detectStrategies(colors, pred8.pct) || detectRepetitionStrategy(colors) || modelSuggest(colors);
        const newMacroOk = macroConfirm(arr40, nowTs, arr);
        const { originalSuggestion } = pending; // Pega o gatilho original
        
        // [MUDANÇA] Regra do Xadrez: Só entra no gale se a vela de loss formar um padrão xadrez
        const isXadrez = (newSuggestion?.name === "xadrez" || newSuggestion?.name === "pós-rosa xadrez");

        if(pending.stage===0){
          // Condição G1: Estabilidade E obrigatório ser padrão Xadrez
          const stableForGale = pred8.ok && !blockCorrections && isXadrez;

          if(stableForGale){
            // G1 ATIVADO (Xadrez e estabilidade OK)
            pending.stage=1; pending.enterAtIdx=justClosed.idx+1; martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${justClosed.mult.toFixed(2)}x)`}); addFeed("warn",`Ativando G1 (padrão Xadrez confirmado)`);
          } else {
            // [MUDANÇA] G1 EM ESPERA (Não cancela)
            pending.stage = 'G1_WAIT'; // Novo estado de espera
            pending.enterAtIdx = null; // Não entra ainda
            const reason = !isXadrez ? "aguardando padrão xadrez" : "aguardando estabilidade";
            setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: reason});
            addFeed("warn", `G1 em espera`);
          }
        } else if(pending.stage===1){
          // Condição G2: Pred Forte OU Macro E obrigatório ser padrão Xadrez
          const g2Allowed = (pred8.strong || newMacroOk) && !blockCorrections && isXadrez;

          if(g2Allowed){ 
             pending.stage=2; pending.enterAtIdx=justClosed.idx+1; martingaleTag.style.display="inline-block";
             setCardState({active:true, title:"Chance de 2x G2", sub:`entrar após (${justClosed.mult.toFixed(2)}x)`});
             strategyTag.textContent = "Estratégia: " + (newSuggestion ? newSuggestion.name : "macro/pred. forte");
             gateTag.textContent = "Gatilho: " + (newSuggestion ? newSuggestion.gate : "confirmação macro/predom.");
             addFeed("warn","SINAL 2x (G2) — último recurso");
          } else {
            // [MUDANÇA] G2 EM ESPERA (Não cancela)
            pending.stage = 'G2_WAIT'; // Novo estado de espera
            pending.enterAtIdx = null; // Não entra ainda
            const reason = !isXadrez ? "aguardando padrão xadrez (G2)" : "aguardando estabilidade (G2)";
            setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
            addFeed("warn", `G2 em espera`);
          }
        } else if(pending.stage===2){
          // LOSS SÓ OCORRE APÓS O G2
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G2 falhou)"); topSlide("LOSS 2x (G2)", false); clearPending();
        }
      }
    }
  }

  // ================= PAUSES / COOLDOWNS =================
  if(hardPaused){
    // Cooldown 100x removido da mensagem
    let sub = (blockCorrections?"correção BBB repetida (micro 8)": weakPred?"Aguardando Predominância": hardPauseBlueRun ? "3+ azuis seguidas na ponta" : "aguarde uma possibilidade");
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub});
    const pauseMsg = sub;
    if (window.lastPauseMessage !== pauseMsg) { addFeed("warn", pauseMsg); window.lastPauseMessage = pauseMsg; }
    return;
  }
  window.lastPauseMessage = null; 

  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";

  // ================= RETOMADAS DE GALES (AGORA ATIVO E NECESSÁRIO) =================
  // Se estivermos em G1_WAIT ou G2_WAIT, reavaliamos a cada vela
  if(pending && (pending.stage==='G1_WAIT' || pending.stage==='G2_WAIT')){
     // Re-avaliação de padrões e estabilidade para G1/G2
    const newSuggestion = detectStrategies(colors, pred8.pct) || detectRepetitionStrategy(colors) || modelSuggest(colors);
    const newMacroOk = macroConfirm(arr40, nowTs, arr);
    
    // [MUDANÇA] Regra do Xadrez
    const isXadrez = (newSuggestion?.name === "xadrez" || newSuggestion?.name === "pós-rosa xadrez");

    if(pending.stage==='G1_WAIT'){
        // Condição G1: Estabilidade E obrigatório ser padrão Xadrez
        const stableForGale = pred8.ok && !blockCorrections && isXadrez;
        
        if(stableForGale){
            // [MUDANÇA] ATIVANDO G1 (após espera)
            pending.stage=1; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
            // Conforme solicitado: Card roxo (active) e texto da entrada
            setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${lastMultTxt})`}); 
            addFeed("warn",`SINAL 2x (G1) — entrar após (${lastMultTxt})`);
        } else {
            // AINDA ESPERANDO G1
            const reason = !isXadrez ? "aguardando padrão xadrez" : "aguardando estabilidade";
            setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: reason});
        }
    } 
    else if(pending.stage==='G2_WAIT'){
        // Condição G2: Pred Forte OU Macro E obrigatório ser padrão Xadrez
        const g2Allowed = (pred8.strong || newMacroOk) && !blockCorrections && isXadrez;

        if(g2Allowed){
            // [MUDANÇA] ATIVANDO G2 (após espera)
            pending.stage=2; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G2", sub:`entrar após (${lastMultTxt})`});
            strategyTag.textContent = "Estratégia: " + (newSuggestion ? newSuggestion.name : "macro/pred. forte");
            gateTag.textContent = "Gatilho: " + (newSuggestion ? newSuggestion.gate : "confirmação macro/predom.");
            addFeed("warn",`SINAL 2x (G2) — entrar após (${lastMultTxt})`);
        } else {
            // AINDA ESPERANDO G2
            const reason = !isXadrez ? "aguardando padrão xadrez (G2)" : "aguardando estabilidade (G2)";
            setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: reason});
        }
    }
    return; // Importante: Se estamos esperando G1/G2, não procuramos um novo sinal G0
  }


  // ================= NOVO SINAL (G0) =================
  if(!pending){
    // [MUDANÇA] Inclui a nova estratégia de repetição
    let suggestion = detectStrategies(colors, pred8.pct) || 
                     detectRepetitionStrategy(colors) || 
                     modelSuggest(colors); 
    
    const macroOk = macroConfirm(arr40, nowTs, arr); // Passa 'arr'

    // Regras de permissão G0
    const entryAllowed = pred8.ok && !blockCorrections && ( (countBBBSequences(colors,8)===0) || (countBBBSequences(colors,8)===1 && pred8.strong) );
    
    // FAST-LANE (Regra "pred ≥60% + surf ou rosa ou tempo → entrar próxima vela direto")
    const fastLane = pred8.strong && (suggestion || macroOk);

    if(entryAllowed && (suggestion || (macroOk && pred8.ok)) ){ // Entra se tiver regra, ou se macro confirmar E pred for OK
      
      const usedName = suggestion ? suggestion.name : "macro";
      const usedGate = suggestion ? suggestion.gate : "tempo/rosa/surf/coluna (40m)";
      
      // [IMPORTANTE] Armazena a sugestão original no 'pending'
      pending = { 
        stage: 0, 
        enterAtIdx: last.idx+1, 
        reason: usedGate, 
        strategy: usedName,
        originalSuggestion: suggestion || { name: "macro" } // Salva o gatilho para o G1
      };

      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + usedName + (fastLane ? " · FAST LANE" : (pred8.strong?" · cenário forte":""));
      gateTag.textContent = "Gatilho: " + usedGate;
      addFeed("warn", `SINAL 2x (${usedName}) — entrar após (${lastMultTxt})`);
      return;
    } else {
      setCardState({active:false, awaiting:false, title:"Chance de 2x", sub:"identificando padrão"});
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
      if(!Number.isFinite(d.getTime())) ts=d.getTime();
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
    liveStatus.style.background="rgba(239,68,68,.15)"; liveStatus.style.color="#ffd1d1";
    console.error(e);
  }
})();

// ===================== BLOQUEIO DO DEVTOOLS =======================
(function() {
  const threshold = 160; // Limiar de pixels para detectar a abertura
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
