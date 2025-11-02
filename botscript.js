/* ============================================================================
   BOT 2x — eBook rules (v8 compat)  |  botscriptebook.js
   ---------------------------------------------------------------------------
   REGRAS-CHAVE (acordado com Theus):
   1) Base do momento = Predominância últimas 8 velas.
      - Pague leve ≥ 55% (entra mais rápido)
      - Pague forte ≥ 60% (libera até 2 correções)
   2) Passado (17 velas) só é FREIO quando há risco de 3 correções.
   3) Pague leve + 1 correção azul ⇒ entra DIRETO na próxima vela.
   4) G1/G2 seguem as mesmas regras do G0:
      - 1 correção: permitido sempre
      - 2 correções: só com Pred ≥ 60%
      - 3 correções: nunca (volta análise)
   5) G1: se red com 1 correção → pode entrar direto no G1;
          se já havia 2 correções → espera 1 vela e reavalia.
   ============================================================================ */

/* ===================== CONFIG FIREBASE (v8 global) ===================== */
(function(){
  if (!window.firebase || !firebase.apps) return; // prevenindo erro se SDK não carregou ainda
})();

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

let app, dbRef;
try{
  app = firebase.initializeApp(firebaseConfig);
  dbRef = firebase.database().ref("history/");
}catch(e){
  console.error("Firebase init error:", e);
}

/* ===================== UI HOOKS (opcional) ===================== */
/*  Mantive IDs comuns do seu dashboard.
    Se algum não existir, o bot segue funcionando. */
const $ = s => document.querySelector(s);
const liveStatus   = $("#liveStatus");
const engineStatus = $("#engineStatus");
const predStatus   = $("#predStatus");
const blueRunPill  = $("#blueRun");
const chanceCard   = $("#chanceCard");
const chanceTitle  = $("#chanceTitle");
const chanceSub    = $("#chanceSub");
const strategyTag  = $("#strategyTag");
const gateTag      = $("#gateTag");
const martingaleTag= $("#martingaleTag");
const feed         = $("#feed");
const winsEl       = $("#wins"), lossesEl = $("#losses"), streakEl = $("#streak");
const normalWinsEl = $("#normalWins"), g1WinsEl = $("#g1Wins"), g2WinsEl = $("#g2Wins");

/* helpers de UI (seguros se os elementos não existirem) */
function setText(el, txt){ if(el) el.textContent = txt; }
function addFeed(type, text){
  if(!feed) return;
  const div = document.createElement("div");
  div.className = "item";
  const left = document.createElement("div"); left.textContent = text;
  const right = document.createElement("div");
  right.className = "chip " + (type==="ok"?"ok":type==="err"?"err":"warn");
  right.textContent = type==="ok"?"WIN": type==="err"?"LOSS":"INFO";
  div.appendChild(left); div.appendChild(right); feed.prepend(div);
}
function setCard({state, title, sub}){
  if(chanceTitle) chanceTitle.textContent = title || "Chance de 2x";
  if(chanceSub)   chanceSub.textContent   = sub   || "identificando padrão";
  if(!chanceCard) return;
  chanceCard.classList.remove("chance-active","chance-awaiting","chance-blocked");
  if(state==="active")   chanceCard.classList.add("chance-active");
  if(state==="awaiting") chanceCard.classList.add("chance-awaiting");
  if(state==="blocked")  chanceCard.classList.add("chance-blocked");
}

/* ===================== Regras / Utilidades ===================== */
const PCT_SOFT   = 0.55; // pague leve
const PCT_STRONG = 0.60; // pague forte
const TIME_WINDOWS_AFTER_PINK = [5,7,10,20]; // ±2min
const TIME_TOLERANCE_MIN = 2;
const COOLDOWN_AFTER_100X_CANDLES = 10;

function colorFrom(mult){ if(mult < 2.0) return "blue"; if(mult < 10.0) return "purple"; return "pink"; }

function toArrayFromHistory(raw){
  const rows = [];
  const vals = Object.values(raw || {});
  for(let i=0;i<vals.length;i++){
    const it = vals[i];
    const mult = parseFloat(it?.multiplier);
    if(!Number.isFinite(mult)) continue;
    const color = (it?.color==="blue"||it?.color==="purple"||it?.color==="pink") ? it.color : colorFrom(mult);
    let ts = null;
    if(it?.date && it?.time){
      const d = new Date(`${it.date}T${it.time}`);
      if(!Number.isNaN(d.getTime())) ts = d.getTime();
    }
    rows.push({ idx:i, mult, color, ts });
  }
  return rows;
}

function positivesRatio(list){
  const pos = list.filter(r => r.color!=="blue").length;
  return list.length ? pos / list.length : 0;
}
function predominance8(arr){
  const last8 = arr.slice(-8);
  const pct = positivesRatio(last8);
  return { pct, soft: pct>=PCT_SOFT, strong: pct>=PCT_STRONG, last8 };
}

function correctionsIn(list){ return list.filter(r => r.color==="blue").length; }
function consecutiveBluesEnd(arr){
  let c=0; for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="blue") c++; else break; } return c;
}
function maxBlueRun17(colors){
  const win = colors.slice(-17);
  let maxRun=0, run=0;
  for(const c of win){ if(c==="blue"){ run++; maxRun=Math.max(maxRun,run);} else run=0; }
  return maxRun;
}
function hasRecent100x(arr,k=COOLDOWN_AFTER_100X_CANDLES){
  return arr.slice(-k).some(r => r.color==="pink" && r.mult>=100);
}
function minutesDiff(a,b){ return Math.abs((a-b)/60000); }
function inPinkTimeWindow(nowTs, arr){
  const lastPink = [...arr].reverse().find(r => r.color==="pink" && r.ts);
  if(!lastPink) return false;
  const diff = minutesDiff(nowTs, lastPink.ts);
  return TIME_WINDOWS_AFTER_PINK.some(w => Math.abs(diff - w) <= TIME_TOLERANCE_MIN);
}

/* ======= Estratégias de padrão imediato (apenas para reforçar) ======= */
function detectImmediatePattern(arr){
  // Surf simples (3+ positivas na ponta)
  const isPos = c => c!=="blue";
  let run=0;
  for(let i=arr.length-1;i>=0;i--){ if(isPos(arr[i].color)) run++; else break; }
  if(run>=4) return { name:"surf 4+", gate:`${run} positivas` };
  if(run===3) return { name:"surf 3", gate:"3 positivas" };

  // Xadrez leve (B-P-B ou P-B-P) na ponta
  const L=arr.length;
  if(L>=3){
    const a=arr[L-3].color, b=arr[L-2].color, c=arr[L-1].color;
    if(a==="blue" && b!=="blue" && c==="blue") return { name:"xadrez leve", gate:"B-P-B" };
    if(a!=="blue" && b==="blue" && c!=="blue") return { name:"xadrez leve", gate:"P-B-P" };
  }
  return null;
}

/* ===================== Estado de Operação ===================== */
const store = {
  get(){ try{ return JSON.parse(localStorage.getItem("stats2x")||"{}"); }catch{return{}} },
  set(d){ try{ localStorage.setItem("stats2x", JSON.stringify(d)); }catch{} }
};
let stats = Object.assign({wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}, store.get());
function syncStatsUI(){
  setText(winsEl, stats.wins); setText(lossesEl, stats.losses); setText(streakEl, stats.streak);
  setText(normalWinsEl, stats.normalWins); setText(g1WinsEl, stats.g1Wins); setText(g2WinsEl, stats.g2Wins);
}
syncStatsUI();

let pending = null; // {stage:0|1|2|'WAIT1'|'WAIT2', enterAtIdx, meta:{}}

/* ===================== Motor ===================== */
function step(arr){
  if(!arr.length) return;

  // Conexão/Status
  if(liveStatus){ liveStatus.textContent="Conectado"; liveStatus.style.color="#b9f5c7"; }
  
  const now = arr[arr.length-1].ts || Date.now();
  const pred = predominance8(arr);
  const bluesTail = consecutiveBluesEnd(arr);
  const colors = arr.map(r=>r.color);
  const maxBBB17 = maxBlueRun17(colors);
  const corr8 = correctionsIn(pred.last8);

  setText(predStatus, `Predominância: ${(pred.pct*100|0)}%${pred.strong?" · forte":pred.soft?" · leve":""}`);
  setText(blueRunPill, `Azuis seguidas: ${bluesTail}`);

  // Cooldown pós 100x
  const cooled = !hasRecent100x(arr, COOLDOWN_AFTER_100X_CANDLES);

  // ======= FREIO (passado só bloqueia quando houver risco de 3 correções) =======
  let risk3 = false;
  if(corr8 >= 2){ // só olho passado se já estamos com 2 correções na janela do momento
    risk3 = (maxBBB17 >= 3) || (bluesTail >= 2); // 17 indica histórico de BBB OU ponta sugerindo 3ª
  }

  // ======= Estado do motor (texto) =======
  if(engineStatus){
    if(!cooled) engineStatus.textContent = "aguardando (cooldown 100x)";
    else if(risk3) engineStatus.textContent = "aguardando (risco 3 correções)";
    else if(pred.pct < 0.50) engineStatus.textContent = "aguardando (aguardando estabilidade)";
    else engineStatus.textContent = "operando";
  }

  // ======= Fechamento do sinal anterior =======
  if(pending && typeof pending.enterAtIdx === "number"){
    const justClosed = arr[arr.length-1];
    if(justClosed.idx === pending.enterAtIdx){
      const win = justClosed.mult >= 2.0;
      if(win){
        stats.wins++; stats.streak++; stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
        if(pending.stage===0) stats.normalWins++;
        if(pending.stage===1) stats.g1Wins++;
        if(pending.stage===2) stats.g2Wins++;
        store.set(stats); syncStatsUI();
        addFeed("ok", pending.stage===0?"WIN 2x":`WIN 2x (G${pending.stage})`);
        setCard({state:"active", title:"WIN 2x", sub:`(${justClosed.mult.toFixed(2)}x)`});
        pending = null;
        return;
      }else{
        // Red ⇒ decidir G1/G2 conforme regras
        if(pending.stage===0){
          // G1: se foi red com 1 correção, pode entrar direto. Se já havia 2 correções, espera 1 vela.
          if(corr8<=1){
            pending.stage=1; pending.enterAtIdx=justClosed.idx+1;
            setCard({state:"active", title:"Chance de 2x (G1)", sub:`entrar após (${justClosed.mult.toFixed(2)}x)`});
            addFeed("warn","Ativando G1: 1 correção");
          }else{
            pending.stage='WAIT1'; pending.enterAtIdx=null;
            setCard({state:"awaiting", title:"Aguardando estabilidade (G1)", sub:"2 correções — reavaliar 1 vela"});
            addFeed("warn","G1 aguardando 1 vela (2 correções)");
          }
        }else if(pending.stage===1){
          // G2: permitido se (corr<=1) OU (corr==2 && pred forte)
          if(corr8<=1 || (corr8===2 && pred.strong)){
            pending.stage=2; pending.enterAtIdx=justClosed.idx+1;
            setCard({state:"active", title:"Chance de 2x (G2)", sub:`entrar após (${justClosed.mult.toFixed(2)}x)`});
            addFeed("warn","Ativando G2");
          }else{
            pending.stage='WAIT2'; pending.enterAtIdx=null;
            setCard({state:"awaiting", title:"Aguardando estabilidade (G2)", sub:"pred fraco/2 correções"});
            addFeed("warn","G2 aguardando (pred fraco ou 2 correções)");
          }
        }else if(pending.stage===2){
          stats.losses++; stats.streak=0; store.set(stats); syncStatsUI();
          addFeed("err","LOSS 2x (G2)"); setCard({state:"blocked", title:"LOSS 2x (G2)", sub:"reiniciando análise"});
          pending = null;
          return;
        }
      }
    }
  }

  // ======= Retomadas de WAITs =======
  if(pending && pending.stage==='WAIT1'){
    // após 1 vela, se estabilizou (corr<=1) e pred≥0.55, retoma G1
    if(pred.soft && corr8<=1 && cooled){
      const last = arr[arr.length-1];
      pending.stage=1; pending.enterAtIdx=last.idx+1;
      setCard({state:"active", title:"Chance de 2x (G1)", sub:`entrar após (${last.mult.toFixed(2)}x)`});
      addFeed("warn","Retomando G1 (estável)");
      return;
    }
  }
  if(pending && pending.stage==='WAIT2'){
    // retoma G2 se corr<=1 OU (corr==2 && pred forte)
    if(cooled && (corr8<=1 || (corr8===2 && pred.strong))){
      const last = arr[arr.length-1];
      pending.stage=2; pending.enterAtIdx=last.idx+1;
      setCard({state:"active", title:"Chance de 2x (G2)", sub:`entrar após (${last.mult.toFixed(2)}x)`});
      addFeed("warn","Retomando G2 (estável)");
      return;
    }
  }

  // ======= NOVO SINAL (G0) =======
  if(!pending){
    // Bloqueios duros:
    if(!cooled){ setCard({state:"awaiting", title:"Aguardando estabilidade", sub:"cooldown pós 100x"}); return; }
    if(pred.pct < 0.55 && corr8>=2){ // abaixo de 55 com 2 correções — cenário ruim
      setCard({state:"awaiting", title:"Aguardando estabilidade", sub:"pred baixa + 2 correções"}); return;
    }
    if(corr8>=3 || risk3){ // nunca operar com 3 correções
      setCard({state:"awaiting", title:"Aguardando estabilidade", sub:"risco 3 correções"}); return;
    }

    // Regras de permissão
    let canEnter = false;

    // (A) Pague leve (≥55%): se tiver 1 correção ⇒ entra direto próxima vela
    if(pred.soft && corr8<=1) canEnter = true;

    // (B) Pague forte (≥60%): permite até 2 correções
    if(pred.strong && corr8<=2) canEnter = true;

    // (C) boosters (tempo pós-rosa, surf imediato, xadrez leve) — não sobrepõem bloqueio duro
    const booster = detectImmediatePattern(arr);
    const macroOk = inPinkTimeWindow(now, arr);
    if(!canEnter && (booster || macroOk) && pred.soft && corr8<=2) canEnter = true;

    if(canEnter){
      const last = arr[arr.length-1];
      pending = { stage:0, enterAtIdx:last.idx+1, meta:{ corr8, pred:pred.pct } };
      setCard({state:"active", title:"Chance de 2x", sub:`entrar após (${last.mult.toFixed(2)}x)`});
      setText(strategyTag, booster ? `Estratégia: ${booster.name}` : `Estratégia: predominância`);
      setText(gateTag, booster ? `Gatilho: ${booster.gate}` : (macroOk?"Gatilho: tempo pós-rosa":"Gatilho: pague"));
      addFeed("warn", booster ? `SINAL 2x (${booster.name}) — entrar após (${last.mult.toFixed(2)}x)` :
                                `SINAL 2x — entrar após (${last.mult.toFixed(2)}x)`);
      return;
    }else{
      setCard({state:"awaiting", title:"Aguardando estabilidade", sub: corr8>=2 ? "2 correções — segurando" : "aguardando possibilidade"});
      return;
    }
  }
}

/* ===================== Loop de dados (Firebase) ===================== */
if(dbRef){
  if(liveStatus){
    liveStatus.textContent = "Conectando...";
    liveStatus.style.color = "#ddd";
  }
  dbRef.on('value', (snap)=>{
    const data = snap.val();
    const arr  = toArrayFromHistory(data);
    if(!arr.length){
      setText(liveStatus,"Sem dados"); 
      return;
    }
    step(arr);
  }, (err)=>{
    setText(liveStatus, "Erro: "+err.message);
    console.error(err);
  });
}
