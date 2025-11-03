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
function lastPurpleOrPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color!=="blue") return arr[i]; } return null; }

// [FUNÇÃO MANTIDA] - Usada para Estratégias de Repetição / IA
function ngramPositiveProb(colors, order, windowSize=120){
  if(colors.length <= order) return null;
  const POS = new Set(["purple","pink"]);
  const window = colors.slice(-windowSize); // Janela de histórico
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

// [NOVA FUNÇÃO DE ESTRATÉGIA] - Regra 5: Agrega todas as estratégias fortes e ajusta sensibilidade
function getStrongStrategy(arr) {
    const colors = arr.map(r => r.color);

    // 1. Repetição de cor (W17) - Sensibilidade aumentada (p >= 0.60)
    for(const k of [4,3,2]){
        const res = ngramPositiveProb(colors, k, 17); 
        if(res && res.n >= 1 && res.p >= 0.60){ // Sensibilidade aumentada (era 0.75)
            return {name:`rep_cores k=${k} (W17)`, gate:`Repetição (17 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
        }
    }
    // 2. Repetição de cor (W8) - Sensibilidade aumentada (p >= 0.75)
    for(const k of [3,2]){
        const res = ngramPositiveProb(colors, k, 8); 
        if(res && res.n >= 1 && res.p >= 0.75){ // Sensibilidade aumentada (era 1.0)
            return {name:`rep_cores k=${k} (W8)`, gate:`Repetição (8 velas): P(pos|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
        }
    }

    // 3. IA (N-gram Padrão) - Sensibilidade aumentada (n>=2, p>=0.40)
    for(const k of [4,3,2]){
        const res = ngramPositiveProb(colors, k, 120); 
        if(res && res.n>=2 && res.p>=0.40){ // Sensibilidade aumentada (era n=3, p=0.45)
            return {name:`modelo n-grama k=${k}`, gate:`IA: P(positiva|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
        }
    }

    // 4. Padrões (Surf, Xadrez, etc.)
    const L=colors.length; if(L<3) return null;
    const isPos = (c) => c==="purple" || c==="pink";
    const a=colors[L-3], b=colors[L-2], c=colors[L-1];

    // SURF: 3+ positivas (Sensibilidade aumentada - 3 já ativa)
    if(L >= 3 && isPos(a) && isPos(b) && isPos(c)){
        let posRunLen = 0; for(let i=L-1;i>=0;i--){ if(isPos(colors[i])) posRunLen++; else break; }
        if(posRunLen >= 3) return {name:"surfing", gate:`Sequência de ${posRunLen} positivas ⇒ P (2x)`}; // Ativa com 3+
    }
    // SURF ALTERNADO: 3P-1B-3P
    if(L >= 7){
        const last7 = colors.slice(-7);
        if(isPos(last7[0]) && isPos(last7[1]) && isPos(last7[2]) && 
           last7[3]==="blue" && 
           isPos(last7[4]) && isPos(last7[5]) && isPos(last7[6])){
          return {name:"surf-alternado", gate:"3P-1B-3P ⇒ P (2x)"};
        }
    }
    // Xadrez simples
    if(a==="blue" && isPos(b) && c==="blue") return {name:"xadrez", gate:"B-P-B ⇒ P (2x)"};
    // Pós-rosa (comportamento humano)
    if(b==="pink" && c==="blue") return {name:"pós-rosa xadrez", gate:"Rosa→Azul ⇒ P (2x)"};
    if(a==="blue" && b==="blue" && isPos(c)) return {name:"triplacor parcial", gate:"BB-P ⇒ repetir 2x"};
    
    // Pós-vela-alta (Pós-rosa / Booster)
    const lup = lastPurpleOrPink(arr);
    if(!!(lup && lup.mult>=5)) return {name:"pós-vela-alta", gate: `Última positiva >= 5x (${lup.mult.toFixed(2)}x)`};

    return null;
}

// [NOVA FUNÇÃO DE DECISÃO] - Regras 2 & 4: Lógica de entrada G0, G1, G2
function getEntryDecision(stage, correctionCount, predominancePct, strongStrategy) {
    let directEntryMax = 1; // G0, G1
    let conditionalEntryMax = 2; // G0, G1
    let waitEntryMax = 3; // G0, G1

    if (stage === 2) { // G2 (Rule 4: +1 correção)
        directEntryMax = 2;
        conditionalEntryMax = 3;
        waitEntryMax = 4;
    }

    // Regra 2.1 e 4.1: 0 ou 1 correção (G0/G1) ou 0-2 (G2) -> Entra direto
    if (correctionCount <= directEntryMax) {
        return { action: 'ENTER', reason: `Correções (${correctionCount} <= ${directEntryMax})` };
    }
    // Regra 2.2 e 4.2: 2 correções (G0/G1) ou 3 (G2) -> Entra com condição
    if (correctionCount === conditionalEntryMax) {
        if (predominancePct >= 0.60) {
            return { action: 'ENTER', reason: `${correctionCount}c (Predom. >= 60%)` };
        }
        if (strongStrategy) {
            return { action: 'ENTER', reason: `${correctionCount}c (Estratégia: ${strongStrategy.name})` };
        }
        return { action: 'BLOCK', reason: `${correctionCount}c | Aguardando Pred. >= 60% ou Estratégia` };
    }
    // Regra 2.3 e 4.3: 3 correções (G0/G1) ou 4 (G2) -> Aguarda 1 vela
    if (correctionCount === waitEntryMax) {
        return { action: 'WAIT', reason: `${correctionCount}c | Aguardando 1 vela para validar mudança` };
    }
    
    // > 3 correções (G0/G1) ou > 4 (G2) -> Bloqueado
    return { action: 'BLOCK', reason: `${correctionCount}c | Muitas correções (Max: ${waitEntryMax})` };
}

// ===================== Motor =======================
let pending = null;
let modoAgressivo = false; // Regra 3: Seguidinha Agressiva
let lastPatternForWait = null; // Regra 2.3: Para "aguardar 1 vela"

function clearPending(){ 
  pending=null; 
  martingaleTag.style.display="none"; 
  setCardState({active:false, awaiting:false, title:"Chance de 2x", sub:"identificando padrão"}); 
  strategyTag.textContent = "Estratégia: —";
  gateTag.textContent = "Gatilho: —";
}

// [FUNÇÃO DO MOTOR TOTALMENTE ATUALIZADA - REGRAS 1-7]
function onNewCandle(arr){
  if(arr.length < 2) return;
  renderHistory(arr);

  // ================= 1. LEITURA DE DADOS (Regra 1) =================
  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";

  // Regra 1: Analisar as últimas 20 velas
  const last20 = arr.slice(-20);
  const colors20 = last20.map(r => r.color);
  
  // Regra 1: Cada vela azul = 1 correção
  const correctionCount = colors20.filter(c => c === 'blue').length;
  const positiveCount = last20.length - correctionCount;
  const predominancePct = last20.length > 0 ? positiveCount / last20.length : 0;

  // Regra 5: Verificar estratégias fortes com sensibilidade aumentada
  const strongStrategy = getStrongStrategy(arr);
  
  // Atualizar UI
  predStatus.textContent = `Predom: ${(predominancePct * 100).toFixed(0)}%`;
  blueRunPill.textContent = `Correções (20v): ${correctionCount}`;
  engineStatus.textContent = "operando"; // Lógica de pausa agora é interna
  
  // ================= 2. PROCESSAMENTO DE FIM DE SINAL (WIN/LOSS) =================
  if(pending && typeof pending.enterAtIdx === "number" && last.idx === pending.enterAtIdx){
    const win = last.mult >= 2.0; // Regra 6: Validação de POSITIVA (análise) é pela cor, WIN (resultado) é pelo 2x.
    
    if(win){
      // LÓGICA DE WIN
      stats.wins++; stats.streak++; stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      if(pending.stage===0) stats.normalWins++;
      else if(pending.stage===1) stats.g1Wins++;
      else if(pending.stage===2) stats.g2Wins++;
      syncStatsUI(); store.set(stats);
      const label = pending.stage===0 ? "WIN 2x" : `WIN 2x (G${pending.stage})`;
      addFeed("ok", label); topSlide("WIN 2x", true); 
      
      clearPending();

      // Regra 3: Ativar "Seguidinha Agressiva" após WIN se 1 correção
      if (correctionCount === 1) {
          modoAgressivo = true;
          addFeed("warn", "Modo Agressivo ATIVADO (1 correção em 20v)");
          // Não retorna, cai para a lógica de entrada
      } else {
          modoAgressivo = false;
          return; // Retorna, aguarda próxima vela
      }
      
    } else {
      // LÓGICA DE LOSS E TRANSIÇÃO PARA GALE
      modoAgressivo = false; // Desativa modo agressivo em CADA loss
      
      if(pending.stage === 0){ // G0 falhou
          pending.stage = 1;
          pending.enterAtIdx = null; // Aguarda re-avaliação para G1
          addFeed("warn", "G0 falhou. Aguardando gatilho G1...");
          setCardState({active:false, awaiting:true, title:"Aguardando G1", sub: "reanalisando..."});
      } else if(pending.stage === 1){ // G1 falhou
          pending.stage = 2;
          pending.enterAtIdx = null; // Aguarda re-avaliação para G2
          addFeed("warn", "G1 falhou. Aguardando gatilho G2...");
          setCardState({active:false, awaiting:true, title:"Aguardando G2", sub: "reanalisando..."});
      } else if(pending.stage === 2){ // G2 falhou
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G2 falhou)"); topSlide("LOSS 2x (G2)", false); 
          clearPending();
      }
      return; // Sempre retorna após um loss para esperar a próxima vela e reavaliar o gale
    }
  }

  // ================= 3. PROCESSAMENTO DE ESTADO DE ESPERA (Regra 2.3) =================
  if (pending && pending.waitState) {
      const newPattern = strongStrategy ? strongStrategy.name : predominancePct.toFixed(2);
      
      if (newPattern === lastPatternForWait) {
          addFeed("warn", `Aguardando 1 vela (G${pending.stage}): Padrão estável. Esperando...`);
          setCardState({active:false, awaiting:true, title:`Aguarde (G${pending.stage})`, sub: `Padrão ${newPattern} não mudou`});
          return; // Continua esperando
      } else {
          addFeed("info", `Padrão mudou (${lastPatternForWait} -> ${newPattern}). Re-avaliando entrada G${pending.stage}.`);
          pending.waitState = false;
          lastPatternForWait = null;
          // Não retorna, cai para a lógica de entrada
      }
  }
  
  // ================= 4. AVALIAÇÃO DE NOVA ENTRADA (G0, G1, G2, Agressivo) =================
  
  // Se já tem uma entrada pendente (ex: WIN ativou modo agressivo e caiu aqui), não re-avalia
  if (pending && pending.enterAtIdx) return; 

  const stage = pending ? pending.stage : 0;

  // Regra 3: Lógica "Seguidinha Agressiva"
  if (modoAgressivo) {
      if (correctionCount > 1) {
          modoAgressivo = false;
          addFeed("warn", "Modo Agressivo DESATIVADO (correção > 1)");
          // Não retorna, cai para a lógica normal
      } else if (stage === 0) { // Só ativa no G0
          pending = { 
              stage: 0, 
              enterAtIdx: last.idx + 1, 
              reason: "Seguidinha Agressiva", 
              strategy: "modo-agressivo"
          };
          setCardState({active:true, title:"Chance de 2x (Agressivo)", sub:`entrar após (${lastMultTxt})`});
          strategyTag.textContent = "Estratégia: Seguidinha Agressiva";
          gateTag.textContent = "Gatilho: 1 correção em 20v";
          addFeed("warn", `SINAL 2x (Agressivo) — entrar após (${lastMultTxt})`);
          return;
      }
  }

  // Regras 2 & 4: Lógica de Decisão Padrão (G0, G1, G2)
  const decision = getEntryDecision(stage, correctionCount, predominancePct, strongStrategy);

  if (decision.action === 'ENTER') {
      if (!pending) pending = { stage: 0 }; // Inicia G0
      
      pending.enterAtIdx = last.idx + 1;
      pending.reason = decision.reason;
      pending.strategy = strongStrategy ? strongStrategy.name : "predominancia";
      pending.waitState = false;
      lastPatternForWait = null;

      setCardState({active:true, title:`Chance de 2x (G${stage})`, sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + pending.strategy;
      gateTag.textContent = "Gatilho: " + decision.reason;
      addFeed("warn", `SINAL 2x (G${stage}) — entrar após (${lastMultTxt})`);
      if (stage > 0) martingaleTag.style.display="inline-block";
      return;
  
  } else if (decision.action === 'WAIT') {
      if (!pending) pending = { stage: 0 }; // Inicia G0 no estado de espera
      
      pending.waitState = true;
      lastPatternForWait = strongStrategy ? strongStrategy.name : predominancePct.toFixed(2); // Salva o padrão atual
      
      setCardState({active:false, awaiting:true, title:`Aguardando 1 Vela (G${stage})`, sub: decision.reason});
      addFeed("warn", `Gatilho G${stage} em espera (1 vela): ${decision.reason}`);
      return;
  
  } else if (decision.action === 'BLOCK') {
      // Se estava aguardando G1 ou G2, mantém o estado de espera com a nova razão
      if (pending && (pending.stage === 1 || pending.stage === 2)) {
          setCardState({active:false, awaiting:true, title:`Aguardando (G${stage})`, sub: decision.reason});
      } else {
          // Se for G0 ou nenhum GALE pendente, limpa tudo
          clearPending();
          setCardState({active:false, awaiting:false, title:"Chance de 2x", sub: "identificando padrão"});
      }
      return;
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
      if(Number.isFinite(d.getTime())) ts=d.getTime(); // CORREÇÃO: se for NaN, não atribui ts
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
