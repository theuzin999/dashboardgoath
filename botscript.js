// ===================== CONFIG FIREBASE ===========================
// Usa Firebase compat (igual ao seu HTML bot2x.html)
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

/* ============================================================================
   REGRAS-CHAVE (definitivas)
   1) Predominância = últimas 8 velas. Pague bom a partir de ≥55%.
   2) Correções PRINCIPAIS = últimas 8 (frente do gráfico):
      - 0 azul  → entra normal
      - 1 azul  → entra direto na próxima
      - 2 azuis → entra se padrão 2A/2R ou 2A/1R (ou surf em construção) E pred ≥55%
      - 3 azuis → esperar 1 vela; se essa pagar roxo e pred já era boa, volta a operar
      - 4 azuis → nunca entra
   3) Correções SECUNDÁRIAS (últimas 17) = só freio pesado (se houver ≥2 blocos de 2+ azuis) — não travar pague bom.
   4) G1/G2 seguem as MESMAS regras de correção do G0.
   ============================================================================ */

// ===================== UI Helpers ================================
const $ = (s) => document.querySelector(s);
const liveStatus   = $("#liveStatus");
const engineStatus = $("#engineStatus");
const predStatus   = $("#predStatus");
const blueRunPill  = $("#blueRun");
const streakEl     = $("#streak");
const winsEl       = $("#wins");
const lossesEl     = $("#losses");
const chanceCard   = $("#chanceCard");
const chanceTitle  = $("#chanceTitle");
const chanceSub    = $("#chanceSub");
const strategyTag  = $("#strategyTag");
const gateTag      = $("#gateTag");
const martingaleTag= $("#martingaleTag");
const feed         = $("#feed");
const historyGrid  = $("#history");
const topslide     = $("#topslide");
const clearStatsBtn= $("#clearStatsBtn");

// Sidebars (se existirem no seu HTML)
const winsSidebar  = $("#winsSidebar"), streakSidebar = $("#streakSidebar");
const normalWinsEl = $("#normalWins"), g1WinsEl = $("#g1Wins"), g2WinsEl = $("#g2Wins"), maxStreakEl = $("#maxStreak");

$("#winsMoreBtn")?.addEventListener("click", () => winsSidebar?.classList.add("open"));
$("#streakMoreBtn")?.addEventListener("click", () => streakSidebar?.classList.add("open"));
$("#closeWins")?.addEventListener("click", () => winsSidebar?.classList.remove("open"));
$("#closeStreak")?.addEventListener("click", () => streakSidebar?.classList.remove("open"));

document.addEventListener("click", (e) => {
  if (winsSidebar && !winsSidebar.contains(e.target) && !$("#winsMoreBtn")?.contains(e.target)) winsSidebar.classList.remove("open");
  if (streakSidebar && !streakSidebar.contains(e.target) && !$("#streakMoreBtn")?.contains(e.target)) streakSidebar.classList.remove("open");
});

function flashCard(){ chanceCard?.classList.add("chance-animate"); setTimeout(()=> chanceCard?.classList.remove("chance-animate"), 260); }
function setCardState({active=false, awaiting=false, title="Chance de 2x", sub="identificando padrão"}){
  if(chanceTitle) chanceTitle.textContent = title;
  if(chanceSub)   chanceSub.textContent   = sub;
  chanceCard?.classList.remove("chance-active","chance-awaiting","chance-blocked");
  if(active){ chanceCard?.classList.add("chance-active"); flashCard(); }
  else if(awaiting) chanceCard?.classList.add("chance-awaiting");
}
function topSlideMsg(msg, ok=true){ if(!topslide) return; topslide.textContent = msg; topslide.className = "topslide "+(ok?"ok":"err"); topslide.classList.add("show"); setTimeout(()=> topslide.classList.remove("show"), 1000); }
function addFeed(type, text){ if(!feed) return; const div=document.createElement("div"); div.className="item"; const left=document.createElement("div"); left.textContent=text; const right=document.createElement("div"); right.className="chip "+(type==="ok"?"ok":type==="err"?"err":"warn"); right.textContent = type==="ok"?"WIN": type==="err"?"LOSS":"INFO"; div.appendChild(left); div.appendChild(right); feed.prepend(div); }

function renderHistory(list){ if(!historyGrid) return; historyGrid.innerHTML=""; const last15 = list.slice(-15).reverse(); last15.forEach(r=>{ const box=document.createElement("div"); box.className="hbox "+r.color; const top=document.createElement("div"); top.className="row"; top.style.justifyContent="space-between"; const val=document.createElement("div"); val.className="val"; val.textContent=r.mult.toFixed(2)+"x"; const dot=document.createElement("div"); dot.className = r.color==="blue"?"dot-blue":(r.color==="purple"?"dot-purple":"dot-pink"); const c=document.createElement("div"); c.className="c"; c.textContent=r.color; top.appendChild(val); top.appendChild(dot); box.appendChild(top); box.appendChild(c); historyGrid.appendChild(box); }); }

// ===================== Persistência ======================
const store = { get(){ try{ return JSON.parse(localStorage.getItem("stats2x")||"{}"); }catch{return {}} }, set(d){ try{ localStorage.setItem("stats2x", JSON.stringify(d)); }catch{} } };
let stats = Object.assign({wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}, store.get());
function syncStatsUI(){ if(!winsEl) return; winsEl.textContent=stats.wins; lossesEl.textContent=stats.losses; streakEl.textContent=stats.streak; maxStreakEl.textContent=stats.maxStreak; normalWinsEl.textContent=stats.normalWins; g1WinsEl.textContent=stats.g1Wins; g2WinsEl.textContent=stats.g2Wins; }
syncStatsUI();
clearStatsBtn?.addEventListener("click", ()=>{ if(confirm("Limpar estatísticas?")){ stats={wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}; store.set(stats); syncStatsUI(); topSlideMsg("Estatísticas limpas!", true);} });

// ===================== Utils / Leitura ======================
const PCT_SOFT=0.55, PCT_STRONG=0.60; // pague leve/forte (55% é o gatilho principal)
const TIME_WINDOWS=[5,7,10,20], TIME_TOL=2; const HARD_PAUSE_BLUE_RUN=3; // failsafe

function colorFrom(mult){ if(mult<2) return "blue"; if(mult<10) return "purple"; return "pink"; }
function toArrayFromHistory(raw){ const rows=[]; const vals=Object.values(raw||{}); for(let i=0;i<vals.length;i++){ const it=vals[i]; const mult=parseFloat(it?.multiplier); if(!Number.isFinite(mult)) continue; const color=(it?.color==="blue"||it?.color==="purple"||it?.color==="pink")?it.color:colorFrom(mult); let ts=null; if(it?.date && it?.time){ const d=new Date(`${it.date}T${it.time}`); if(!Number.isNaN(d.getTime())) ts=d.getTime(); } rows.push({idx:i, mult, color, ts}); } return rows; }

function positivesRatio(list){ const p=list.filter(x=>x.color!=="blue").length; return list.length? p/list.length : 0; }
function predominance8(arr){ const last8=arr.slice(-8); const pct=positivesRatio(last8); return {pct, soft:pct>=PCT_SOFT, strong:pct>=PCT_STRONG, last8}; }
function blueTail(arr){ let c=0; for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="blue") c++; else break; } return c; }

// Correções PRINCIPAIS (últimas 8)
function corrInfo8(arr){ const last8=arr.slice(-8); const corr=last8.filter(x=>x.color==="blue").length; return {corr, last8}; }

// Correções SECUNDÁRIAS (últimas 17) → só freio pesado
function blocks17(colors){ const last17=colors.slice(-17); const blocks=[]; let run=0; for(const c of last17){ if(c==="blue"){ run++; } else { if(run>0){ blocks.push(run); run=0; } } } if(run>0) blocks.push(run); const heavy2plus = blocks.filter(x=>x>=2).length; const max = blocks.reduce((a,b)=>Math.max(a,b),0); return {heavy2plus, max}; }

// Padrões
function isSurfValidated(colors){ let run=0; for(let i=colors.length-1;i>=0;i--){ if(colors[i]!=="blue"){ run++; if(run>=4) return true; } else break; } return false; }
function isSurfConstruction(colors){ const last8=colors.slice(-8); const corr=last8.filter(x=>x==="blue").length; const pos=last8.length-corr; return corr<=2 && (pos/Math.max(1,last8.length))>=0.50; }
function hasChess(colors){ const L=colors.length; if(L<3) return false; const a=colors[L-3],b=colors[L-2],c=colors[L-1]; return (a==="blue"&&b!=="blue"&&c==="blue") || (a!=="blue"&&b==="blue"&&c!=="blue"); }
function minutesSince(now, ts){ return (now-ts)/60000; }
function lastPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="pink") return arr[i]; } return null; }
function macro40(arr, nowTs){ const from=nowTs-40*60*1000; return arr.filter(r=>typeof r.ts==="number" && r.ts>=from && r.ts<=nowTs); }
function inPinkTime(nowTs, arr){ const lp=lastPink(arr); if(!lp||!lp.ts) return false; const diff=Math.abs(minutesSince(nowTs, lp.ts)); return TIME_WINDOWS.some(w=> Math.abs(diff-w)<=TIME_TOL ); }
function macroConfirm(arr40, nowTs){ return inPinkTime(nowTs, arr40) || isSurfValidated(arr40.map(r=>r.color)) || hasChess(arr40.map(r=>r.color)); }

// Padrões 2A/2R e 2A/1R na ponta
function pattern2A2R_or_2A1R(arr){
  const L=arr.length; if(L<4) return false; // checa 2A/2R e 2A/1R
  const c = arr.map(x=>x.color);
  const last4 = c.slice(-4).join("-");
  const twoA_twoR = (last4==="blue-blue-purple-purple") || (last4==="purple-purple-blue-blue");
  const last3 = c.slice(-3).join("-");
  const twoA_oneR = (last3==="blue-blue-purple") || (last3==="purple-blue-blue");
  return twoA_twoR || twoA_oneR;
}

// ===================== Estado =======================
let pending=null; // {stage:0|1|2|'G1_WAIT'|'G2_WAIT', enterAtIdx}

function finishSignal(candle){
  const win = candle.mult>=2.0;
  if(win){ stats.wins++; stats.streak++; stats.maxStreak=Math.max(stats.maxStreak,stats.streak); if(pending.stage===0) stats.normalWins++; else if(pending.stage===1) stats.g1Wins++; else if(pending.stage===2) stats.g2Wins++; store.set(stats); syncStatsUI(); addFeed("ok", pending.stage===0?"WIN 2x":`WIN 2x (G${pending.stage})`); topSlideMsg("WIN 2x", true); pending=null; martingaleTag&& (martingaleTag.style.display="none"); return; }
  // LOSS → progressão com as MESMAS regras de correção
  if(pending.stage===0){ pending.stage='G1_WAIT'; pending.enterAtIdx=null; martingaleTag&& (martingaleTag.style.display="inline-block"); setCardState({awaiting:true,title:"Aguardando estabilidade (G1)",sub:"1 vela"}); addFeed("warn","G1 aguardando 1 vela"); return; }
  if(pending.stage===1){ pending.stage='G2_WAIT'; pending.enterAtIdx=null; martingaleTag&& (martingaleTag.style.display="inline-block"); setCardState({awaiting:true,title:"Aguardando estabilidade (G2)",sub:"confirmação"}); addFeed("warn","G2 aguardando"); return; }
  if(pending.stage===2){ stats.losses++; stats.streak=0; store.set(stats); syncStatsUI(); addFeed("err","LOSS 2x (G2)"); topSlideMsg("LOSS 2x (G2)", false); pending=null; martingaleTag&& (martingaleTag.style.display="none"); }
}

function onNewCandle(arr){
  if(arr.length<2) return; renderHistory(arr);
  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const arr40 = macro40(arr, nowTs);
  const colors = arr.map(r=>r.color);

  const pred = predominance8(arr); // base do momento
  const { corr } = corrInfo8(arr); // correções da frente
  const blueSeqTail = blueTail(arr);// azuis consecutivas na ponta
  const b17 = blocks17(colors);     // freio pesado

  // UI
  if(predStatus) predStatus.textContent = `Predominância: ${(pred.pct*100|0)}%`+(pred.strong?" · forte": pred.soft?" · leve":"");
  if(blueRunPill) blueRunPill.textContent = `Azuis seguidas: ${blueSeqTail}`;

  // Failsafes simples (evitar travar demais):
  if(blueSeqTail>=HARD_PAUSE_BLUE_RUN){ engineStatus&&(engineStatus.textContent="aguardando"); setCardState({awaiting:true,title:"Aguardando estabilidade",sub:"3 azuis seguidas"}); return; }
  if(pred.pct<0.50){ engineStatus&&(engineStatus.textContent="aguardando"); setCardState({awaiting:true,title:"Aguardando estabilidade",sub:"pred <50%"}); return; }
  engineStatus&&(engineStatus.textContent="operando");

  // Fechamento de sinal
  if(pending && typeof pending.enterAtIdx==="number"){ const closed=arr[arr.length-1]; if(closed.idx===pending.enterAtIdx) return finishSignal(closed); }

  // Retomadas (G1_WAIT / G2_WAIT) — mesmas regras de correção
  const allowOne = corr <= 1; // 0 ou 1 azul
  const allowTwoByPattern = (corr === 2) && pred.soft && (pattern2A2R_or_2A1R(arr) || isSurfConstruction(colors));

  if(pending && pending.stage==='G1_WAIT'){
    const last=arr[arr.length-1]; const paidPos = last.color!=="blue";
    if(paidPos && (allowOne || allowTwoByPattern)){
      pending.stage=1; pending.enterAtIdx=last.idx+1; martingaleTag&& (martingaleTag.style.display="inline-block");
      setCardState({active:true,title:"Chance de 2x (G1)",sub:`entrar após (${last.mult.toFixed(2)}x)`}); addFeed("warn","Ativando G1");
      return;
    }
  }
  if(pending && pending.stage==='G2_WAIT'){
    const last=arr[arr.length-1]; const paidPos = last.color!=="blue";
    if(paidPos && (allowOne || allowTwoByPattern)){
      pending.stage=2; pending.enterAtIdx=last.idx+1; martingaleTag&& (martingaleTag.style.display="inline-block");
      setCardState({active:true,title:"Chance de 2x (G2)",sub:`entrar após (${last.mult.toFixed(2)}x)`}); addFeed("warn","Ativando G2");
      return;
    }
  }

  // Freio pesado (17): só impede se houver 2 blocos ≥2 azuis (não travar pague bom)
  if(b17.heavy2plus>=2){ setCardState({awaiting:true,title:"Aguardando estabilidade",sub:"histórico indica correção pesada"}); return; }

  // ===== NOVO SINAL (G0) =====
  if(!pending){
    const macroOk = macroConfirm(arr40, nowTs) || isSurfConstruction(colors) || isSurfValidated(colors) || hasChess(colors);

    let canEnter=false;
    if(allowOne && pred.pct >= 0.50) canEnter=true;                  // 0/1 azul → entra com ≥50%
    if(!canEnter && allowTwoByPattern) canEnter=true;                // 2 azuis → padrão + ≥55%

    if(canEnter && macroOk){
      const last=arr[arr.length-1]; pending={stage:0, enterAtIdx:last.idx+1};
      setCardState({active:true,title:"Chance de 2x",sub:`entrar após (${last.mult.toFixed(2)}x)`});
      addFeed("warn",`SINAL 2x — entrar após (${last.mult.toFixed(2)}x)`);
      return;
    } else {
      if(corr>=3){ setCardState({awaiting:true,title:"Aguardando estabilidade",sub:"3 correções — aguardando 1"}); return; }
      setCardState({title:"Chance de 2x", sub:"identificando padrão"});
    }
  }
}

// ===================== Firebase (history/) =======================
(function init(){
  try{
    const app = firebase.initializeApp(firebaseConfig);
    liveStatus&&(liveStatus.textContent="Conectado");
    const dbRef = app.database().ref("history/");
    dbRef.on('value',(snap)=>{ const data=snap.val(); const arr=toArrayFromHistory(data); if(!arr.length){ engineStatus&&(engineStatus.textContent="sem dados"); return; } onNewCandle(arr); },(err)=>{ if(liveStatus){ liveStatus.textContent="Erro: "+err.message; } });
  }catch(e){ if(liveStatus){ liveStatus.textContent="Falha ao iniciar Firebase"; } console.error(e); }
})();

// ===================== Anti DevTools (igual ao seu) =====================
(function(){ const threshold=160; let devtoolsOpen=false; const redirectURL="/"; const check=()=>{ const w=innerWidth,h=innerHeight; if(w<threshold||h<threshold){ if(!devtoolsOpen){devtoolsOpen=true; location.replace(redirectURL);} } else { devtoolsOpen=false; } }; addEventListener('resize', check); check(); addEventListener('keydown',e=>{ if(e.key==='F12'||e.keyCode===123) e.preventDefault(); if(e.ctrlKey&&e.shiftKey&&['I','i','J','j','C','c'].includes(e.key)) e.preventDefault(); }); addEventListener('contextmenu',e=>e.preventDefault()); })();
