// ===================== Firebase (mantido compat) =====================
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

/*
  Engine Theus (ajustado):
  — Predominância (8) 55% = pague leve; 60% = pague forte
  — Correções (11) = cada AZUL conta 1 correção (A)
  — Repetição (17) ativa (2A/2R, 2A/1R e IA curta)
  — Fast-lane: pred ≥55% + padrão válido = entra direta
  — 2 correções: pred ≥55% + padrão forte (surf/xadrez/repetição/rosa)
  — 3 correções: esperar 1 vela; só libera se vier >2.00x e pred ≥60%
  — 4 correções: nunca
  — G1/G2: mesma regra do G0 (e G1 direto se RED com 1 correção)
  — Macro (tempo pós-rosa/coluna borda) é reforço, NUNCA bloqueio
  — Positivo = roxo OU rosa
*/

// ===================== UI Hooks ==============================
const $ = s => document.querySelector(s);
const liveStatus = $("#liveStatus");
const engineStatus = $("#engineStatus");
const predStatus = $("#predStatus");
const blueRunPill = $("#blueRun");
const chanceCard = $("#chanceCard");
const chanceTitle = $("#chanceTitle");
const chanceSub = $("#chanceSub");
const strategyTag = $("#strategyTag");
const gateTag = $("#gateTag");
const martingaleTag = $("#martingaleTag");
const feed = $("#feed");
const historyGrid = $("#history");
const winsEl = $("#wins"), lossesEl = $("#losses"), streakEl = $("#streak");
const normalWinsEl = $("#normalWins"), g1WinsEl = $("#g1Wins"), g2WinsEl = $("#g2Wins"), maxStreakEl = $("#maxStreak");

function setCardState({active=false, awaiting=false, title="Chance de 2x", sub=""}){
  if(chanceTitle) chanceTitle.textContent = title;
  if(chanceSub) chanceSub.textContent = sub;
  chanceCard?.classList.remove("chance-active","chance-awaiting","chance-blocked");
  if(active) chanceCard?.classList.add("chance-active");
  else if(awaiting) chanceCard?.classList.add("chance-awaiting");
}
function addFeed(type, text){
  if(!feed) return;
  const div=document.createElement("div"); div.className="item";
  const left=document.createElement("div"); left.textContent=text;
  const right=document.createElement("div"); right.className="chip "+(type==="ok"?"ok":type==="err"?"err":"warn");
  right.textContent = type==="ok"?"WIN": type==="err"?"LOSS":"INFO";
  div.appendChild(left); div.appendChild(right); feed.prepend(div);
}
function renderHistory(list){
  if(!historyGrid) return;
  historyGrid.innerHTML="";
  const last15 = list.slice(-15).reverse();
  last15.forEach(r=>{
    const box=document.createElement("div"); box.className="hbox "+r.color;
    const top=document.createElement("div"); top.className="row"; top.style.justifyContent="space-between";
    const val=document.createElement("div"); val.className="val"; val.textContent=r.mult.toFixed(2)+"x";
    const dot=document.createElement("div"); dot.className = r.color==="blue"?"dot-blue":(r.color==="purple"?"dot-purple":"dot-pink");
    const c=document.createElement("div"); c.className="c"; c.textContent=r.color;
    top.appendChild(val); top.appendChild(dot); box.appendChild(top); box.appendChild(c);
    historyGrid.appendChild(box);
  });
}

// ===================== Estatística ============================
const store = { get(){ try{ return JSON.parse(localStorage.getItem("stats2x")||"{}"); }catch{return {}} }, set(d){ try{ localStorage.setItem("stats2x", JSON.stringify(d)); }catch{} } };
let stats = Object.assign({wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}, store.get());
function syncStatsUI(){ winsEl&&(winsEl.textContent=stats.wins); lossesEl&&(lossesEl.textContent=stats.losses); streakEl&&(streakEl.textContent=stats.streak); maxStreakEl&&(maxStreakEl.textContent=stats.maxStreak); normalWinsEl&&(normalWinsEl.textContent=stats.normalWins); g1WinsEl&&(g1WinsEl.textContent=stats.g1Wins); g2WinsEl&&(g2WinsEl.textContent=stats.g2Wins); }

// ===================== Parâmetros ============================
const PRED_SOFT = 0.55;      // libera operação (fast-lane com padrão)
const PRED_STRONG = 0.60;    // pague forte
const HARD_PAUSE_CONSEC_BLUE = 3; // failsafe (3 azuis seguidas na PONTA)
const VALIDATION_MIN = 2.00;  // validação >2.00x
const BOOST_MIN = 3.50;       // vela alta puxa alta

// ===================== Utils =================================
function colorFrom(mult){ if(mult<2) return "blue"; if(mult<10) return "purple"; return "pink"; }
function positivesRatio(list){ const p=list.filter(x=>x.color!=="blue").length; return list.length? p/list.length : 0; }
function predominance8(arr){ const last8=arr.slice(-8); const pct=positivesRatio(last8); return {pct, soft:pct>=PRED_SOFT, strong:pct>=PRED_STRONG}; }
function corrections11(arr){ const last11=arr.slice(-11); return last11.filter(x=>x.color==="blue").length; } // A) cada azul = 1 correção
function consecutiveBlueTail(arr){ let c=0; for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="blue") c++; else break; } return c; }
function isPositiveColor(c){ return c!=="blue"; }

function isSurfValidated(colors){ let run=0; for(let i=colors.length-1;i>=0;i--){ if(isPositiveColor(colors[i])){ run++; if(run>=4) return true; } else break; } return false; }
function isSurfConstruction(colors){ let run=0; for(let i=colors.length-1;i>=0 && i>colors.length-6;i--){ if(isPositiveColor(colors[i])) run++; else break; } return run>=3; }
function hasXadrezPositivo(colors){ const L=colors.length; if(L<4) return false; const a=colors[L-4],b=colors[L-3],c=colors[L-2],d=colors[L-1]; const alt1=(a==="blue"&&isPositiveColor(b)&&c==="blue"&&isPositiveColor(d)); const alt2=(isPositiveColor(a)&&b==="blue"&&isPositiveColor(c)&&d==="blue"); return alt1||alt2; }

// Repetição RÍGIDA nas últimas 17 (2A/2R ou 2A/1R)
function hasRigidRepetition17(arr){ const colors = arr.slice(-17).map(x=>x.color); for(let i=0;i<=colors.length-4;i++){ const a=colors[i], b=colors[i+1], c=colors[i+2], d=colors[i+3]; if(a==="blue"&&b==="blue" && isPositiveColor(c)&&isPositiveColor(d)) return true; if(a==="blue"&&b==="blue" && isPositiveColor(c)) return true; } return false; }
function patternOK(arr){ const colors = arr.map(x=>x.color); return isSurfValidated(colors) || isSurfConstruction(colors) || hasXadrezPositivo(colors) || hasRigidRepetition17(arr) || roseResetBooster(arr); }

// Tempo/rosa/surf (macro) + colunas de borda — booster only
function lastPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="pink") return arr[i]; } return null; }
function minutesSince(now, ts){ return (now-ts)/60000; }
const TIME_WINDOWS_AFTER_PINK = [5,7,10,20];
const TIME_TOLERANCE_MIN = 2;
function inPinkTimeWindow(nowTs, arr){ const lp = lastPink(arr); if(!lp || !lp.ts) return false; const diff = Math.abs(minutesSince(nowTs, lp.ts)); return TIME_WINDOWS_AFTER_PINK.some(w=>Math.abs(diff-w)<=TIME_TOLERANCE_MIN); }
function lastPurpleOrPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color!=="blue") return arr[i]; } return null; }
function hasSurfWithin(arr){ let run=0; for(const r of arr){ if(r.color!=="blue"){ run++; if(run>=3) return true; } else run=0; } return false; }
function pinkInEdgeColumn(arr, cols=5){ const lp = lastPink(arr); if(!lp || lp.idx===undefined) return false; const col = (lp.idx)%cols; return (col===0 || col===cols-1); }
function roseResetBooster(arr){ const last = arr[arr.length-1], prev = arr[arr.length-2]; if(last?.color==="pink"||prev?.color==="pink") return true; const lup = lastPurpleOrPink(arr); return !!(lup && lup.mult>=5); }
function macroConfirm(arr40, nowTs, fullArr){ return inPinkTimeWindow(nowTs, arr40) || roseResetBooster(arr40) || hasSurfWithin(arr40) || pinkInEdgeColumn(fullArr,5); }

// ===================== Estado ===============================
let pending = null; // {stage:0|1|2|'WAIT3'|'G1_WAIT'|'G2_WAIT', enterAtIdx:number|null, boost?:boolean}

function endSignalWith(candle, ctx){
  const win = candle.mult >= 2.0;
  if(win){
    stats.wins++; stats.streak++; stats.maxStreak=Math.max(stats.maxStreak, stats.streak);
    if(pending.stage===0) stats.normalWins++; else if(pending.stage===1) stats.g1Wins++; else if(pending.stage===2) stats.g2Wins++;
    store.set(stats); syncStatsUI(); addFeed("ok", pending.stage===0?"WIN 2x":`WIN 2x (G${pending.stage})`);
    pending = null; martingaleTag && (martingaleTag.style.display="none"); return;
  }
  // LOSS → decidir G1/G2 conforme regras
  const { pred, corr, arr } = ctx;
  const last = arr[arr.length-1];
  const pat = patternOK(arr);
  const boost = isPositiveColor(last.color) && last.mult>BOOST_MIN;

  if(pending.stage===0){
    if(corr<=1){ // G1 DIRETO (sem exigir pred)
      pending = {stage:1, enterAtIdx:last.idx+1, boost};
      martingaleTag && (martingaleTag.style.display="inline-block");
      setCardState({active:true, title:"Chance de 2x (G1)", sub:`entrar após (${last.mult.toFixed(2)}x)`});
      addFeed("warn","Ativando G1 (1 correção)"); return;
    }
    if(corr===2){ // G1 apenas se pred ≥55% + padrão forte
      if(pred.soft && pat){ pending = {stage:1, enterAtIdx:last.idx+1, boost:true}; martingaleTag&&(martingaleTag.style.display="inline-block"); setCardState({active:true,title:"Chance de 2x (G1)", sub:`entrar após (${last.mult.toFixed(2)}x)`}); addFeed("warn","Ativando G1 (2 correções — pred≥55 + padrão)"); return; }
      pending = {stage:'G1_WAIT', enterAtIdx:null, boost:false}; setCardState({awaiting:true,title:"Aguardando G1", sub:"validando padrão/força"}); addFeed("warn","G1 aguardando validação (2 correções)"); return;
    }
    if(corr>=3){ pending = {stage:'WAIT3', enterAtIdx:null, boost:false}; setCardState({awaiting:true,title:"Aguardando validação (3 correções)", sub:">2.00x + pred≥60%"}); addFeed("warn","3 correções — aguardar validação"); return; }
  } else if(pending.stage===1){
    if(corr<=1){ pending = {stage:2, enterAtIdx:last.idx+1, boost}; martingaleTag&&(martingaleTag.style.display="inline-block"); setCardState({active:true,title:"Chance de 2x (G2)", sub:`entrar após (${last.mult.toFixed(2)}x)`}); addFeed("warn","Ativando G2 (1 correção)"); return; }
    if(corr===2){ if(pred.soft && pat){ pending={stage:2, enterAtIdx:last.idx+1, boost:true}; martingaleTag&&(martingaleTag.style.display="inline-block"); setCardState({active:true,title:"Chance de 2x (G2)", sub:`entrar após (${last.mult.toFixed(2)}x)`}); addFeed("warn","Ativando G2 (2 correções — pred≥55 + padrão)"); return; } pending={stage:'G2_WAIT', enterAtIdx:null, boost:false}; setCardState({awaiting:true,title:"Aguardando G2", sub:"validando padrão/força"}); addFeed("warn","G2 aguardando validação (2 correções)"); return; }
    if(corr>=3){ pending={stage:'WAIT3', enterAtIdx:null, boost:false}; setCardState({awaiting:true,title:"Aguardando validação (3 correções)", sub:">2.00x + pred≥60%"}); addFeed("warn","3 correções — aguardar validação"); return; }
  } else if(pending.stage===2){ stats.losses++; stats.streak=0; store.set(stats); syncStatsUI(); addFeed("err","LOSS 2x (G2)"); pending=null; martingaleTag && (martingaleTag.style.display="none"); return; }
}

// ===================== Motor principal ================================
function onNewCandle(arr){
  if(!arr || arr.length<2) return;
  renderHistory(arr);

  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const from = nowTs - 40*60*1000; const arr40 = arr.filter(r=>typeof r.ts==="number" && r.ts>=from && r.ts<=nowTs);

  const pred = predominance8(arr);
  const corr = corrections11(arr); // A) cada azul conta
  const blueTail = consecutiveBlueTail(arr); // failsafe

  predStatus && (predStatus.textContent = `Predominância: ${(pred.pct*100|0)}%` + (pred.strong?" · forte": pred.soft?" · leve":""));
  blueRunPill && (blueRunPill.textContent = `Azuis (11): ${corr}`);

  if(blueTail>=HARD_PAUSE_CONSEC_BLUE){ engineStatus&&(engineStatus.textContent="aguardando"); setCardState({awaiting:true,title:"Aguardando estabilidade", sub:"3 azuis seguidas"}); return; }
  if(pred.pct<0.50){ engineStatus&&(engineStatus.textContent="aguardando"); setCardState({awaiting:true,title:"Aguardando estabilidade", sub:"pred < 50%"}); return; }
  engineStatus&&(engineStatus.textContent="operando");

  // Fechar sinal quando atinge vela alvo
  if(pending && typeof pending.enterAtIdx==='number'){
    const last = arr[arr.length-1];
    if(last.idx === pending.enterAtIdx){ endSignalWith(last, {pred, corr, arr}); return; }
  }

  // Esperas (G1/G2 WAIT)
  if(pending && (pending.stage==='G1_WAIT' || pending.stage==='G2_WAIT')){
    const last=arr[arr.length-1];
    const paidPos = isPositiveColor(last.color) && last.mult>=VALIDATION_MIN; // >2.00x
    const pat = patternOK(arr);

    if(pending.stage==='G1_WAIT'){
      const ok01 = (corr<=1); // G1 direto se virar 0/1 correção
      const ok2  = (corr===2) && (pred.soft && pat); // 2 correções → pred≥55 + padrão
      if(paidPos && (ok01 || ok2)){
        pending = {stage:1, enterAtIdx:last.idx+1, boost:last.mult>BOOST_MIN};
        martingaleTag && (martingaleTag.style.display="inline-block");
        setCardState({active:true, title:"Chance de 2x (G1)", sub:`entrar após (${last.mult.toFixed(2)}x)`});
        addFeed("warn",`SINAL 2x (G1) — entrar após (${last.mult.toFixed(2)}x)`); return;
      }
      setCardState({awaiting:true,title:"Aguardando G1", sub:"validando"}); return;
    } else {
      const ok01 = (corr<=1);
      const ok2  = (corr===2) && (pred.soft && pat);
      if(paidPos && (ok01 || ok2)){
        pending = {stage:2, enterAtIdx:last.idx+1, boost:last.mult>BOOST_MIN};
        martingaleTag && (martingaleTag.style.display="inline-block");
        setCardState({active:true, title:"Chance de 2x (G2)", sub:`entrar após (${last.mult.toFixed(2)}x)`});
        addFeed("warn",`SINAL 2x (G2) — entrar após (${last.mult.toFixed(2)}x)`); return;
      }
      setCardState({awaiting:true,title:"Aguardando G2", sub:"validando"}); return;
    }
  }

  // Caso especial 3 correções (WAIT3)
  if(pending && pending.stage==='WAIT3'){
    const last=arr[arr.length-1];
    const paidPos = isPositiveColor(last.color) && last.mult>=VALIDATION_MIN; // >2.00x
    const pat = patternOK(arr);
    if(paidPos && pred.strong){ // B) exige pred ≥60%
      pending = {stage:0, enterAtIdx:last.idx+1, boost:last.mult>BOOST_MIN};
      setCardState({active:true, title:"Chance de 2x (validação)", sub:`entrar após (${last.mult.toFixed(2)}x)`});
      addFeed("warn","3 correções validado — entrar na próxima");
      return;
    }
    setCardState({awaiting:true,title:"Aguardando estabilidade", sub:"validando 3 correções"});
    return;
  }

  // ===== NOVO SINAL (G0) =====
  if(!pending){
    const last = arr[arr.length-1];
    const pat = patternOK(arr); // padrão forte

    let canEnter = false;
    if(corr<=1){ canEnter = pred.soft && pat; } // fast lane
    else if(corr===2){ canEnter = pred.soft && pat; } // B) regra ajustada
    else if(corr>=3){ pending = {stage:'WAIT3', enterAtIdx:null, boost:false}; setCardState({awaiting:true,title:"Aguardando validação (3 correções)", sub:">2.00x + pred≥60%"}); addFeed("warn","3 correções — aguardando 1 vela de validação"); return; }

    if(canEnter){
      pending = {stage:0, enterAtIdx:last.idx+1, boost:last.mult>BOOST_MIN};
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${last.mult.toFixed(2)}x)`});
      addFeed("warn",`SINAL 2x — entrar após (${last.mult.toFixed(2)}x)`);
      return;
    } else {
      setCardState({title:"Chance de 2x", sub:"identificando padrão"});
    }
  }
}

// ===================== Firebase leitura history/ ====================
(function init(){
  try{
    const app = firebase.initializeApp(firebaseConfig);
    liveStatus && (liveStatus.textContent = "Conectado");
    const dbRef = app.database().ref("history/");
    dbRef.on('value', (snap)=>{
      const raw = snap.val();
      const rows=[]; const vals=Object.values(raw||{});
      for(let i=0;i<vals.length;i++){
        const it=vals[i]; const mult=parseFloat(it?.multiplier);
        if(!Number.isFinite(mult)) continue;
        const color=(it?.color==="blue"||it?.color==="purple"||it?.color==="pink")? it.color : (mult<2?"blue":(mult<10?"purple":"pink"));
        let ts=null; if(it?.date && it?.time){ const d=new Date(`${it.date}T${it.time}`); if(!Number.isNaN(d.getTime())) ts=d.getTime(); }
        rows.push({idx:i, mult, color, ts});
      }
      if(!rows.length){ engineStatus && (engineStatus.textContent="sem dados"); return; }
      onNewCandle(rows);
    }, (err)=>{ liveStatus && (liveStatus.textContent = "Erro: "+err.message); });
  }catch(e){ liveStatus && (liveStatus.textContent = "Falha ao iniciar Firebase"); console.error(e); }
})();

// ===================== Anti DevTools (opcional) =======================
(function(){
  const threshold=160; let open=false; const redirect="/";
  function check(){ const w=innerWidth,h=innerHeight; if(w<threshold||h<threshold){ if(!open){open=true; location.replace(redirect);} } else { open=false; } }
  addEventListener('resize', check); check();
  addEventListener('keydown', e=>{ if(e.key==='F12'||e.keyCode===123) e.preventDefault(); if(e.ctrlKey&&e.shiftKey&&['I','i','J','j','C','c'].includes(e.key)) e.preventDefault(); });
  addEventListener('contextmenu', e=> e.preventDefault());
})();
