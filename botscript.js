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
const clearStatsBtn = $("#clearStatsBtn"); // Novo

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

// ===================== Persistência (compatível com antigo) ======================
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

// Função para limpar as estatísticas
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
function predominancePositive(list, N=6){
  const lastN = list.slice(-N);
  const pos=lastN.filter(c=>c.color==="purple"||c.color==="pink").length;
  const pct= lastN.length? pos/lastN.length:0;
  return {pct, ok:pct>=0.4}; // Mantido 60% como mínimo para 'ok' (operando)
}
function consecutiveBlueCount(list){
  let c=0; for(let i=list.length-1;i>=0;i--){ if(list[i].color==="blue") c++; else break; } return c;
}
const STRONG_PCT = 0.50; // Cenário forte com 70% de predominância

// Variável global para comunicar o motivo do bloqueio para o motor
window.lastBlockReason = null;
window.lastPauseMessage = null; // Variavel global para controle de flood do feed

// ===================== Estratégias =======================
function detectStrategies(colors, predPct){ 
  const L=colors.length; if(L<3) return null;
  const isPos = (c) => c==="purple" || c==="pink";
  const a=colors[L-3], b=colors[L-2], c=colors[L-1];
  
  // ===================== BLOQUEIO DE ALTO RISCO (Anti-Repetição de Azuis) =======================
  if(L >= 8 && colors[L-1] === "blue" && colors[L-2] === "blue"){ 
      
      let posRunLen = 0;
      for(let i=L-3; i>=0; i--){
          if(isPos(colors[i])) posRunLen++; else break;
      }

      if(posRunLen >= 2 && posRunLen <= 4){ 
          let prevBlueRunLen = 0;
          let startIdx = L - 3 - posRunLen;
          for(let i=startIdx; i>=0; i--){
              if(colors[i] === "blue") prevBlueRunLen++; else break;
          }
          
          if(prevBlueRunLen >= 3 && prevBlueRunLen <= 4){
              window.lastBlockReason = `BLOQUEIO: ${prevBlueRunLen}B - ${posRunLen}P - 2B na ponta. Risco de repetição de quebra.`;
              return null;
          }
      }
  }
  window.lastBlockReason = null;

  // -------------------------------------------------------------
  // NOVAS REGRAS DE SURFING (Prioridade Alta)
  // -------------------------------------------------------------
  
  // Regra 1.1: Surfing em Sequência Estendida (4+ Positivas) - OPORTUNIDADE FORTE
  if(L >= 4 && isPos(c) && isPos(b) && isPos(a)){
      let posRunLen = 0;
      for(let i=L-1; i>=0; i--){
          if(isPos(colors[i])) posRunLen++; else break;
      }
      // Manda sinal continuamente (surf) enquanto a sequência positiva (4+) se mantém
      if(posRunLen >= 3){
           return {name:"surfing-4+", gate:`Sequência de ${posRunLen} velas Positivas. Surfe a onda! ⇒ P (2x)`};
      }
  }

  // Regra 1.2: Sequência Roxas Simples (3 Positivas)
  if(L>=3 && isPos(a) && isPos(b) && isPos(c)){
       // Se já foi pego pela regra 4+, ignora. Se for 3, entra aqui.
      let posRunLen = 0;
      for(let i=L-1; i>=0; i--){
          if(isPos(colors[i])) posRunLen++; else break;
      }
      if(posRunLen === 3){
           return {name:"sequência roxas simples", gate:`3 velas Positivas seguidas. ⇒ P (2x)`};
      }
  }


  // -------------------------------------------------------------
  // REGRAS DE REVERSÃO E PADRÃO (Prioridade Normal)
  // -------------------------------------------------------------
  
  // Regra 2: Predominância Forte (Sinais mais rápidos e frequentes com boas chances)
  // Manda sinal se a predominância for forte (>=70%) e a última for azul, indicando o fim da correção.
  if(predPct >= STRONG_PCT && c === "blue"){
    return {name:"predominancia-forte", gate:`Predominância: ${(predPct*100).toFixed(0)}% > ${STRONG_PCT*100}% com Azul na ponta. ⇒ P (2x)`};
  }

  // Regra 3: Fileiras com 1 ou 2 Azuis (Padrões de reversão/continuação após correções curtas)
  // Padrão: Positiva - 1/2 Azuis - Positiva - Azul (Entrada)
  if(L>=5 && isPos(colors[L-3]) && isPos(colors[L-2]) && c==="blue"){
     // P-B-B-P-B ou P-B-P-B (últimas 5 ou 4)
     if((colors[L-4]==="blue" && colors[L-3]==="blue") || colors[L-4]==="blue"){
      return {name:"pos-corr-simples", gate:"Pósitiva - Correção (1-2 Azuis) - Pósitiva - Azul ⇒ P (2x)"};
    }
  }

  // Regra 4: Gemini 2x Reversão
  if(predPct >= 0.60 && L>=5 && colors[L-1]==="blue"){
    const last5 = colors.slice(L-5).join("-");
    if(last5 === "blue-purple-blue-blue-blue" || last5 === "blue-blue-purple-blue-blue"){
      return {name:"Gemini 2x Reversão", gate:"Gatilho: Gemini 2x - Quebra de Sequência (B-P-B ou B-B-P) ⇒ P (2x)"};
    }
  }

  // Regra 5: Outras Regras existentes 
  if(a==="blue" && b==="purple" && c==="blue") return {name:"xadrez", gate:"B-P-B ⇒ P (2x)"};
  if(b==="pink" && c==="blue") return {name:"pós-rosa xadrez", gate:"Rosa→Azul ⇒ P (2x)"};
  if(L>=4 && colors[L-4]==="pink" && colors[L-3]==="blue" && colors[L-2]==="blue") return {name:"pós-rosa 2B→2P", gate:"Rosa→BB ⇒ RR"};
  if(L>=6 && colors.slice(-6).join("-")==="blue-blue-purple-purple-blue-blue") return {name:"pares repetidos", gate:"BB-RR-BB ⇒ RR"};
  if(L>=4 && colors.slice(-4).join("-")==="blue-blue-blue-purple") return {name:"triplacor", gate:"BBB-P ⇒ tendência 2x"};
  if(a==="blue" && b==="blue" && c==="purple") return {name:"triplacor (parcial)", gate:"BB-P ⇒ repetir BB-P/BB-PP (2x)"};

  return null;
}

function ngramPositiveProb(colors, order){
  if(colors.length <= order) return null;
  const POS = new Set(["purple","pink"]);
  const window = colors.slice(-120);
  const counts = new Map();
  for(let i=order;i<window.length;i++){
    const ctx = window.slice(i-order, i).join("|");
    const next = window[i];
    const obj = counts.get(ctx) || {total:0, pos:0};
    obj.total += 1;
    if(POS.has(next)) obj.pos += 1;
    counts.set(ctx, obj);
  }
  const ctxNow = colors.slice(-order).join("|");
  const stat = counts.get(ctxNow);
  if(!stat) return null;
  return {p: stat.pos/stat.total, n: stat.total};
}
function modelSuggest(colors){
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k);
    if(res && res.n>=3 && res.p>=0.60){
      return {name:`modelo n-grama k=${k}`, gate:`IA: P(positiva|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; 
    }
  }
  return null;
}
// Função não usada na lógica atual, mantida por segurança/compatibilidade
function hasRunPurple3InWindow(arr, minTimeMs){
  const windowList = minTimeMs ? arr.filter(r=>r.ts && r.ts>=minTimeMs) : arr.slice(-120);
  let best=0,cur=0; for(const r of windowList){ if(r.color==="purple"){cur++;best=Math.max(best,cur);}else cur=0; }
  return best>=3;
}

// ===================== Motor =======================
let pending = null;
function clearPending(){ pending=null; martingaleTag.style.display="none"; setCardState({active:false, awaiting:false}); }

function onNewCandle(arr){
  if(arr.length<2) return;
  renderHistory(arr);
  
  const pred10 = predominancePositive(arr, 6);
  const blueRun = consecutiveBlueCount(arr);
  predStatus.textContent = `Predominância: ${(pred10.pct*100).toFixed(0)}% positivas`;
  blueRunPill.textContent = `Azuis seguidas: ${blueRun}`;

  const lastTs = arr[arr.length-1]?.ts;
  const thirtyAgo = lastTs ? (lastTs - 30*60*1000) : null;
  window.hasRecentPurpleRun3 = hasRunPurple3InWindow(arr, thirtyAgo);

  const hardPaused = (blueRun>=4) || (!pred10.ok); // Bloqueio total se 4+ Azuis ou Predom. Baixa (<60%)
  engineStatus.textContent = hardPaused ? "aguardando" : "operando";

  const awaitingStability = (blueRun>=3); // Espera por estabilidade (2 ou 3 Azuis)

  // -------------------------
  // WIN/LOSS Logic (must run before checks for hardPaused)
  if(pending && typeof pending.enterAtIdx === "number"){
    const justClosed = arr[arr.length-1];
    if(justClosed.idx === pending.enterAtIdx){
      const win = justClosed.mult >= 2.0;
      if(win){
        stats.wins++; stats.streak++; stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
        if(pending.stage===0) stats.normalWins++;
        else if(pending.stage===1) stats.g1Wins++;
        else if(pending.stage===2) stats.g2Wins++;
        syncStatsUI(); store.set(stats);
        const label = pending.stage===0 ? "WIN 2x" : `WIN 2x (G${pending.stage})`;
        addFeed("ok", label); topSlide("WIN 2x", true); clearPending();
      } else {
        if(pending.stage===0){
          // Rigor no Martingale: G1_WAIT se houver 2+ azuis consecutivas
          if(awaitingStability){ 
            pending.stage='G1_WAIT'; pending.enterAtIdx=null; martingaleTag.style.display="inline-block";
            setCardState({active:false, awaiting:true, title:"aguardando estabilidade G1", sub:"aguarde uma possibilidade"}); 
            addFeed("warn","G1 aguardando estabilidade");
          } else { 
            pending.stage=1; pending.enterAtIdx=justClosed.idx+1; martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${justClosed.mult.toFixed(2)}x)`}); addFeed("warn","Ativando G1");
          }
        } else if(pending.stage===1){
          // Rigor no Martingale: G2_WAIT sempre após falha do G1
          pending.stage='G2_WAIT'; pending.enterAtIdx=null; martingaleTag.style.display="inline-block";
          setCardState({active:false, awaiting:true, title:"aguardando estabilidade G2", sub:"aguarde uma possibilidade"});
          addFeed("warn","G2 aguardando estabilidade");
        } else if(pending.stage===2){
          stats.losses++; stats.streak=0; syncStatsUI(); store.set(stats);
          addFeed("err","LOSS 2x (G2 falhou)"); topSlide("LOSS 2x (G2)", false); clearPending();
        }
      }
    }
  }

  // Se houver Bloqueio Total, exibe o cartão amarelo/await e evita flood de feed.
  if(hardPaused){
      // Força a exibição do cartão 'awaiting'
      setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub:"aguarde uma possibilidade"});
      
      let pauseMsg = null;
      if (blueRun >= 4) {
          pauseMsg = "PAUSE de Alto Risco. Aguardando Reversão."; // <-- MENSAGEM AJUSTADA
      } else if (!pred10.ok) {
          pauseMsg = "PAUSE de Alto Risco. Aguardando Predominância Positiva."; // <-- MENSAGEM CORRIGIDA
      }
      
      // Controle de Flood: Só adiciona se for uma mensagem nova
      if (pauseMsg && window.lastPauseMessage !== pauseMsg) {
          addFeed("warn", pauseMsg);
          window.lastPauseMessage = pauseMsg;
      }
      return; // BLOCKS EVERYTHING
  }
  
  // Limpa o contador de flood se sair do hardPaused
  window.lastPauseMessage = null; 

  const last = arr[arr.length-1];
  const lastMultTxt = last.mult.toFixed(2)+"x";

  // Retomando G1 (STRICT: blueRun < 2)
  // G1 só é retomado se não houver mais risco imediato (menos de 2 azuis consecutivas).
  if(pending && pending.stage==='G1_WAIT' && !awaitingStability){
    pending.stage=1; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
    setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${lastMultTxt})`}); addFeed("warn","Retomando G1");
    return;
  }

  // Retomando G2 (STRICT: blueRun < 2 AND rule found)
  // G2 só é retomado se não houver risco imediato E se uma regra for identificada.
  if(pending && pending.stage==='G2_WAIT'){
    const colors = arr.map(r=>r.color);
    const byRule = detectStrategies(colors, pred10.pct) || modelSuggest(colors); 
    if(!awaitingStability && byRule){
      pending.stage=2; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
      setCardState({active:true, title:"Chance de 2x G2", sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + byRule.name;
      gateTag.textContent = "Gatilho: " + byRule.gate;
      addFeed("warn","SINAL 2x (G2) — estável");
      return;
    }
  }

  // Novo Sinal Normal (G0)
  if(!pending){
    const colors = arr.map(r=>r.color);
    let suggestion = detectStrategies(colors, pred10.pct) || modelSuggest(colors); 
    const blockReason = window.lastBlockReason;
    
    const isStrongPred = pred10.pct >= STRONG_PCT; // 70%
    
    // Condição para ENTRADA G0:
    // 1. Se blueRun < 2 (Modo Seguro: 0 ou 1 azul)
    // 2. OU se (blueRun é 2 ou 3) E (predominância é Forte >= 70%) (Modo Oportunidade)
    const isEntryAllowed = (blueRun < 2) || (blueRun >= 2 && blueRun <= 3 && isStrongPred);

    if(isEntryAllowed && suggestion){
      // SINAL ENVIADO (G0)
      pending = { stage:0, enterAtIdx: last.idx+1, reason: suggestion.gate, strategy: suggestion.name };
      
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + suggestion.name + (isStrongPred?" · cenário forte":"");
      gateTag.textContent = "Gatilho: " + suggestion.gate;
      
      // MENSAGEM G0 AJUSTADA
      addFeed("warn", `SINAL 2x (${suggestion.name}) — entrar após (${lastMultTxt})`); 
      return;
    } else if (!isEntryAllowed && awaitingStability) {
      // Se a entrada NÃO for permitida (blueRun 2 ou 3 com <70% pred), exibe o estado de espera.
      setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub:"aguarde uma possibilidade"});
      // Adiciona feed message para 2 ou 3 azuis com predominância fraca/normal
      const pauseMsg = "aguardando estabilidade (sequência azul - Predominância normal)";
      if (blueRun >= 2 && window.lastPauseMessage !== pauseMsg) {
          addFeed("warn", pauseMsg);
          window.lastPauseMessage = pauseMsg;
      }
      return;
    } else if (blockReason) {
      // Exibe o motivo do bloqueio (Anti-Repetição de Azuis)
      setCardState({active:false, awaiting:false, title:"SINAL BLOQUEADO", sub: blockReason});
      strategyTag.textContent = "ALTO RISCO";
      gateTag.textContent = "Motivo: Repetição de Padrão Azul";
    } else {
      // Caso de identificando padrão (0 ou 1 azul, mas nenhuma regra disparou)
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
      if(!Number.isNaN(d.getTime())) ts=d.getTime();
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
          if (!devtoolsOpen) {
              devtoolsOpen = true;
              window.location.replace("https://www.google.com"); 
          }
      } else {
          devtoolsOpen = false;
      }
  };
  window.addEventListener('resize', checkDevTools);
  checkDevTools(); // inicial

  // 2. Bloqueio de Atalhos de Teclado
  document.addEventListener('keydown', function (e) {
      if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) e.preventDefault();
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) e.preventDefault();
  });

  // 3. Bloqueio do Menu de Contexto (Clique Direito)
  document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
  });
})();
